const fs = require('fs');
const ExcelJS = require('exceljs');
const { randomUUID } = require('crypto');

const INPUT_XLSX = process.argv[2] || 'C:/Users/Calebe/Downloads/CNPJ PARA EMISSÃO DE NOTA FISCAL.xlsx';
const DATA_PATH = process.argv[3] || 'backend/data.json';

function normalizeSpaces(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseNrs(value = '') {
  const match = String(value).match(/NRs?:\s*([0-9/]+)/i);
  if (!match) return [];
  return match[1]
    .split('/')
    .map((part) => part.replace(/\D/g, ''))
    .filter(Boolean);
}

function parseCpf(value = '') {
  const match = String(value).match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
  if (!match) return '';
  return match[1]
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function parseCnpjFromLines(lines = []) {
  const joined = lines.join(' ');
  const match = joined.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  if (!match) return '';
  return match[1]
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function extractBestLocation(lines = []) {
  const clean = (lines || []).map((line) => normalizeSpaces(line)).filter(Boolean);
  const candidates = clean.filter((line) => {
    const upper = line.toUpperCase();
    if (upper.includes('CPF')) return false;
    if (upper.includes('CNPJ')) return false;
    if (upper.includes('NR')) return false;
    if (upper.includes('INSC')) return false;
    if (upper.includes('DADOS PARA FATURAMENTO')) return false;
    if (upper.includes('MATEUS') || upper.includes('SUPERMERCADOS') || upper.includes('ARMAZEM')) return false;
    return true;
  });
  const location = candidates.join(' | ').trim();
  return location || '';
}

function looksLikeName(value = '') {
  const t = normalizeSpaces(value);
  if (!t) return false;
  if (/^NRs?:/i.test(t)) return false;
  if (/^CPF:/i.test(t)) return false;
  if (/^CNPJ:/i.test(t)) return false;
  if (/^INSC/i.test(t)) return false;
  if (/^CEP/i.test(t)) return false;
  if (/ENDERE/i.test(t)) return false;
  if (/BAIRRO/i.test(t)) return false;
  if (/^RUA/i.test(t)) return false;
  if (/^AV\b/i.test(t)) return false;
  if (/LOJA\b/i.test(t)) return false;
  if (/SUPERMERCAD/i.test(t)) return false;
  if (/ARMAZEM/i.test(t)) return false;
  if (/ADMINISTRATIVO/i.test(t)) return false;
  if (/MIX\b/i.test(t)) return false;
  if (/POSTERUS/i.test(t)) return false;
  if (/TIMBIRAS/i.test(t)) return false;
  if (/ESTREITO/i.test(t)) return false;
  if (/IMPERATRIZ/i.test(t)) return false;
  if (/BALSAS/i.test(t)) return false;
  if (/S[ÃA]O LU[ÍI]S/i.test(t)) return false;
  if (/\bS\.?A\b/i.test(t)) return false;
  if (/\bLTDA\b/i.test(t)) return false;
  if (/CNPJ/i.test(t)) return false;
  if (/DADOS PARA FATURAMENTO/i.test(t)) return false;
  if (!/[A-ZÀ-Ú]/i.test(t)) return false;
  return /^[A-ZÀ-Ú0-9 .,'\-()]+$/i.test(t);
}

function readColumnPersons(values) {
  const persons = [];
  let current = null;
  for (const raw of values) {
    const text = normalizeSpaces(raw);
    if (!text) continue;
    if (looksLikeName(text)) {
      if (current && current.name && current.cpf && current.nrs.length > 0) persons.push(current);
      current = { name: text, nrs: [], cpf: '', companyLines: [] };
      continue;
    }
    if (!current) continue;
    if (/^NRs?:/i.test(text)) {
      current.nrs = parseNrs(text);
      continue;
    }
    if (/CPF:/i.test(text) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(text)) {
      current.cpf = parseCpf(text);
      continue;
    }
    current.companyLines.push(text);
  }
  if (current && current.name && current.cpf && current.nrs.length > 0) persons.push(current);
  return persons;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT_XLSX);
  const ws = workbook.worksheets[0];

  const persons = [];
  for (let c = 1; c <= ws.columnCount; c++) {
    const col = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      col.push(ws.getRow(r).getCell(c).text || '');
    }
    persons.push(...readColumnPersons(col));
  }

  const byCpf = new Map();
  persons.forEach((p) => {
    if (!p.cpf) return;
    const prev = byCpf.get(p.cpf);
    if (!prev) {
      byCpf.set(p.cpf, { ...p, nrs: [...new Set(p.nrs)] });
      return;
    }

    const mergedNrs = [...new Set([...(prev.nrs || []), ...(p.nrs || [])])];
    const prevCompanySize = (prev.companyLines || []).join(' ').length;
    const nextCompanySize = (p.companyLines || []).join(' ').length;
    const bestCompanyLines = nextCompanySize > prevCompanySize ? p.companyLines : prev.companyLines;

    byCpf.set(p.cpf, {
      ...prev,
      name: (prev.name || '').length >= (p.name || '').length ? prev.name : p.name,
      nrs: mergedNrs,
      companyLines: bestCompanyLines,
    });
  });
  const uniquePersons = [...byCpf.values()];

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const courses = Array.isArray(data.courses) ? data.courses : [];

  const nrCourseByNumber = new Map();
  courses.forEach((course) => {
    const m = String(course.nomeCurso || '').match(/\bNR[-\s]?(\d{1,2})\b/i);
    if (!m) return;
    nrCourseByNumber.set(m[1], course);
  });

  const now = new Date().toISOString();
  const newStudents = [];
  uniquePersons.forEach((person) => {
    const companyName = 'GRUPO MATEUS';
    const cnpj = parseCnpjFromLines(person.companyLines);
    const locationHint = extractBestLocation(person.companyLines);
    person.nrs.forEach((nr) => {
      const course = nrCourseByNumber.get(String(Number(nr)));
      if (!course) return;
      const local = locationHint || '';
      const duracao = normalizeSpaces(course.duracao || '');
      const hasCertCriticalData = Boolean(local && duracao);
      newStudents.push({
        id: randomUUID(),
        nome: person.name,
        cpf: person.cpf,
        empresa: companyName,
        cnpjEmpresa: cnpj,
        filial: '',
        cursoId: course.id,
        nomeCurso: course.nomeCurso,
        qrCode: course.qrCode,
        data: '',
        horarioInicio: '',
        local,
        duracao,
        presenca: 100,
        notaProva: 10,
        presente: true,
        statusCadastro: 'aprovado',
        statusCertificado: hasCertCriticalData ? 'pendente' : 'pendente',
        motivoRecusa: null,
        certificadoEnviado: false,
        dataEnvio: null,
        certificadoEmailErro: null,
        cadastroRetroativo: true,
        motivoRetroativo: 'Importado da planilha de emissão fiscal',
        origemCadastro: 'importacao-planilha-nf',
        cursosConcluidos: [course.nomeCurso],
        cursosConcluidosIds: [String(course.id)],
        temInstrutor: false,
        instrutor: '',
        instrutorNome: '',
        instrutorCargo: '',
        instrutorRegistro: '',
        certificadoPendencias: [
          !local ? 'Local do curso' : null,
          !duracao ? 'Carga horária' : null,
          'Data do curso',
          'Assinatura (manual/digital)',
        ].filter(Boolean),
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  data.students = newStudents;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  console.log(JSON.stringify({
    importedPeople: uniquePersons.length,
    importedStudents: newStudents.length,
    uniqueCourses: [...new Set(newStudents.map((s) => s.nomeCurso))].length,
    pendingCerts: newStudents.filter((s) => s.statusCertificado === 'pendente').length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
