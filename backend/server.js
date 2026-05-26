import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import {
  MOCK_STUDENTS,
  MOCK_COURSES,
  CHART_DATA_MONTHLY,
} from '../src/data/mockData.js';

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || join(__dirname, 'data.json');
const LOGO_FILE = join(__dirname, '..', 'public', 'brand', 'drm-certi-sem-fundo.png');
const DATABASE_URL = process.env.DATABASE_URL || '';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://drmtreinamentos.com';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `DRM Treinamentos <${SMTP_USER}>` : '');
const APP_USERS = [
  {
    id: 1,
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
    name: process.env.ADMIN_NAME || 'Administrador DRM',
    role: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@drmtreinamentos.com',
  },
  {
    id: 2,
    username: process.env.RESPONSAVEL_USERNAME || 'responsavel',
    password: process.env.RESPONSAVEL_PASSWORD || '',
    name: process.env.RESPONSAVEL_NAME || 'Responsável DRM',
    role: 'responsavel',
    email: process.env.RESPONSAVEL_EMAIL || 'deivson@drmtreinamentos.com',
  },
].filter(user => user.username && user.password);

const dbPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : null;

const mailTransport = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

function fallbackData() {
  if (dbPool) {
    return {
      students: [],
      courses: [],
      certificateSettings: {},
    };
  }

  if (!existsSync(DATA_FILE)) {
    return {
      students: structuredClone(MOCK_STUDENTS),
      courses: structuredClone(MOCK_COURSES),
      certificateSettings: {},
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    return {
      students: Array.isArray(parsed.students) ? parsed.students : structuredClone(MOCK_STUDENTS),
      courses: Array.isArray(parsed.courses) ? parsed.courses : structuredClone(MOCK_COURSES),
      certificateSettings: parsed.certificateSettings && typeof parsed.certificateSettings === 'object' ? parsed.certificateSettings : {},
    };
  } catch {
    return {
      students: structuredClone(MOCK_STUDENTS),
      courses: structuredClone(MOCK_COURSES),
      certificateSettings: {},
    };
  }
}

async function ensureDatabase() {
  if (!dbPool) return;
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function loadData() {
  const localData = fallbackData();
  if (!dbPool) return localData;

  await ensureDatabase();
  const existing = await dbPool.query('SELECT data FROM app_state WHERE id = 1');
  if (existing.rows[0]?.data) {
    return {
      students: Array.isArray(existing.rows[0].data.students) ? existing.rows[0].data.students : localData.students,
      courses: Array.isArray(existing.rows[0].data.courses) ? existing.rows[0].data.courses : localData.courses,
      certificateSettings: existing.rows[0].data.certificateSettings && typeof existing.rows[0].data.certificateSettings === 'object'
        ? existing.rows[0].data.certificateSettings
        : {},
    };
  }

  await dbPool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(localData)],
  );
  return localData;
}

const initialData = await loadData();
let students = initialData.students;
let courses = initialData.courses;
let certificateSettings = initialData.certificateSettings || {};

function persistData() {
  const payload = { students, courses, certificateSettings };
  if (!dbPool) {
    writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
    return;
  }

  dbPool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(payload)],
  ).catch(error => {
    console.error('Erro ao persistir no PostgreSQL:', error);
  });
}

function updateCertificateSettings(payload) {
  certificateSettings = {
    config: payload.config && typeof payload.config === 'object' ? payload.config : certificateSettings.config || {},
    layout: payload.layout && typeof payload.layout === 'object' ? payload.layout : certificateSettings.layout || {},
    updatedAt: new Date().toISOString(),
  };
  persistData();
  return certificateSettings;
}

const allowedStatusFields = new Set(['statusCadastro', 'statusCertificado']);
const allowedStatusValues = new Set(['pendente', 'aprovado', 'recusado']);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end();
}

function notFound(res) {
  sendJson(res, 404, { error: 'Rota nao encontrada.' });
}

function badRequest(res, message) {
  sendJson(res, 400, { error: message });
}

function withoutPassword(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function buildCertificateAuthorization(actorName = 'Responsável DRM') {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return {
    certificadoAutorizadoEm: now.toISOString(),
    certificadoAutorizadoPor: actorName,
    certificadoAssinaturaCodigo: `DRM-CERT-${stamp}-${String(now.getTime()).slice(-6)}`,
  };
}

function buildCourseAccessCode(courseName = '') {
  const prefix = String(courseName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 3)
    .toUpperCase() || 'DRM';
  return `${prefix}-${String(Date.now()).slice(-5)}`;
}

const COURSE_SCHEDULE_TEMPLATES = {
  NR10: [
    'Introdução à segurança com eletricidade',
    'Riscos em instalações e serviços com eletricidade',
    'Técnicas de análise de risco',
    'Medidas de controle do risco elétrico',
    'Normas técnicas brasileiras e regulamentações do MTE',
    'Equipamentos de proteção coletiva e individual',
    'Rotinas de trabalho e procedimentos',
    'Documentação de instalações elétricas',
    'Riscos adicionais e combate a incêndios',
    'Acidentes de origem elétrica, primeiros socorros e responsabilidades',
  ],
  NR35: [
    'Noções de segurança de trabalho em altura',
    'Normas aplicáveis para trabalho em altura',
    'Procedimentos de segurança para trabalhos em altura',
    'Análise de riscos e fator de queda',
    'Proteção coletiva, isolamento e segurança',
    'Acesso por corda',
    'Trabalho em altura conforme NR-18',
    'Nós, voltas e sistemas de ancoragem',
    'Prática de movimentação com talabarte e linhas de segurança',
    'Proteção contra quedas e primeiros socorros',
  ],
  NR18: [
    'Plataforma de Trabalho Aéreo e aspectos regulamentares',
    'Tipos construtivos, aplicações e características operacionais',
    'Acidentes previsíveis e como evitá-los',
    'Plano de Segurança da Operação',
    'Processo de capacitação de operadores',
    'Manutenção mínima de segurança',
  ],
  NR12: [
    'Aspectos gerais, objetivos e aplicações',
    'Análise de risco e etapas de adequação',
    'Normas e dispositivos de segurança',
    'Proteções fixas e móveis',
    'Estudo de caso e exemplos práticos',
    'Arranjo físico e meios de acesso',
    'Treinamentos e capacitações',
    'Ergonomia, sinalização e procedimentos',
    'Transporte de materiais, componentes pressurizados e manutenção',
  ],
};

function detectCourseNorm(courseName = '') {
  const match = String(courseName).toUpperCase().match(/NR\s*[- ]?\s*(\d+)/);
  return match ? `NR${match[1]}` : 'GERAL';
}

function buildDefaultSchedule(course = {}) {
  const norm = detectCourseNorm(course.nomeCurso);
  const topics = COURSE_SCHEDULE_TEMPLATES[norm] || [
    'Abertura do treinamento e orientações iniciais',
    'Conteúdo técnico principal',
    'Prática, dúvidas e revisão',
    'Avaliação e encerramento',
  ];

  return topics.map((titulo, index) => ({
    id: `${norm}-${index + 1}`,
    ordem: index + 1,
    titulo,
    status: 'pendente',
  }));
}

function normalizeSchedule(course = {}) {
  const source = Array.isArray(course.cronograma) && course.cronograma.length > 0
    ? course.cronograma
    : buildDefaultSchedule(course);

  return source.map((item, index) => ({
    id: item.id || `aula-${index + 1}`,
    ordem: Number(item.ordem || index + 1),
    titulo: String(item.titulo || `Aula ${index + 1}`).trim(),
    status: ['pendente', 'em_andamento', 'concluida'].includes(item.status) ? item.status : 'pendente',
    iniciadoEm: item.iniciadoEm || null,
    concluidoEm: item.concluidoEm || null,
    instrutor: item.instrutor || null,
  }));
}

function normalizeCourse(course) {
  const cronograma = normalizeSchedule(course);
  return {
    codigoVerificacao: course.codigoVerificacao || buildCourseAccessCode(course.nomeCurso),
    status: course.status || 'ativo',
    chamadaStatus: course.chamadaStatus || 'aberta',
    cronograma,
    cronogramaStatus: course.cronogramaStatus || (cronograma.some(item => item.status === 'em_andamento') ? 'em_andamento' : 'pendente'),
    ...course,
    cronograma,
  };
}

function publicCourse(course) {
  const inscritos = students.filter(student => String(student.cursoId) === String(course.id)).length;
  return {
    id: course.id,
    nomeCurso: course.nomeCurso,
    descricao: course.descricao,
    empresaContratante: course.empresaContratante,
    local: course.local,
    data: course.data,
    horarioInicio: course.horarioInicio,
    duracao: course.duracao,
    maxAlunos: course.maxAlunos,
    inscritos,
    vagasDisponiveis: Math.max(0, Number(course.maxAlunos || 0) - inscritos),
    status: course.status,
  };
}

function clearCertificateAuthorization(student) {
  const updated = { ...student };
  delete updated.certificadoAutorizadoEm;
  delete updated.certificadoAutorizadoPor;
  delete updated.certificadoAssinaturaCodigo;
  return updated;
}

function applyStudentStatus(student, field, value, motivo = null, actorName = 'Responsável DRM') {
  const updated = { ...student, [field]: value };

  if (field === 'statusCadastro' && value === 'recusado') {
    updated.statusCertificado = 'recusado';
  }

  if (field === 'statusCertificado' && value === 'aprovado') {
    if (student.presente !== true && Number(student.presenca || 0) < 75) {
      return { ...student, statusCertificado: 'pendente', motivoRecusa: 'Certificado só pode ser liberado para aluno presente na chamada.' };
    }
    Object.assign(updated, buildCertificateAuthorization(actorName));
  }

  if (
    (field === 'statusCertificado' && value !== 'aprovado') ||
    (field === 'statusCadastro' && value === 'recusado')
  ) {
    Object.assign(updated, clearCertificateAuthorization(updated));
    updated.certificadoEnviado = false;
    updated.dataEnvio = null;
  }

  if (motivo !== null) {
    updated.motivoRecusa = motivo;
  } else if (value === 'aprovado') {
    updated.motivoRecusa = null;
  }

  return updated;
}

function formatDateBR(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatDateTimeBR(dateTime) {
  if (!dateTime) return '-';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeFileName(value = 'certificado') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'certificado';
}

function certificateTopics(student = {}) {
  const norm = detectCourseNorm(student.nomeCurso);
  return COURSE_SCHEDULE_TEMPLATES[norm] || [
    'Abertura do treinamento e orientações iniciais',
    'Conteúdo técnico principal',
    'Prática, dúvidas e revisão',
    'Avaliação e encerramento',
  ];
}

function generateCertificatePdf(student) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      info: {
        Title: `Certificado - ${student.nome || 'Aluno'}`,
        Author: 'DRM Treinamentos e Certificações',
        Subject: student.nomeCurso || 'Certificado',
      },
    });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#f97316';
    const secondary = '#dc2626';
    const text = '#111827';
    const muted = '#4b5563';
    const width = doc.page.width;
    const height = doc.page.height;
    const code = student.certificadoAssinaturaCodigo || 'DRM-CERT';
    const validationUrl = `${PUBLIC_APP_URL.replace(/\/$/, '')}/validar-certificado`;

    function drawFrame(title) {
      doc.rect(28, 28, width - 56, height - 56).lineWidth(2).stroke(primary);
      doc.rect(38, 38, width - 76, height - 76).lineWidth(0.7).stroke('#fdba74');
      doc.moveTo(42, 66).lineTo(width - 42, 66).lineWidth(4).stroke(primary);
      doc.moveTo(width - 210, 66).lineTo(width - 42, 66).lineWidth(4).stroke(secondary);
      if (existsSync(LOGO_FILE)) {
        doc.image(LOGO_FILE, 58, 78, { width: 92 });
      } else {
        doc.font('Helvetica-Bold').fontSize(26).fillColor(secondary).text('DRM', 58, 84);
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor(primary).text('DRM TREINAMENTOS E CONSULTORIA', 0, 78, {
        align: 'center',
      });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text('CNPJ 48.518.202/0001-56', 0, 98, {
        align: 'center',
      });
      doc.roundedRect(width - 112, 78, 54, 54, 12).lineWidth(1.5).stroke(primary);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(primary).text(detectCourseNorm(student.nomeCurso).replace('NR', 'NR '), width - 108, 95, {
        width: 46,
        align: 'center',
      });
      doc.font('Helvetica-Bold').fontSize(28).fillColor(primary).text(title, 0, 136, {
        align: 'center',
      });
    }

    drawFrame('CERTIFICADO');

    doc.roundedRect(72, 190, width - 144, 110, 4).lineWidth(1.5).stroke(primary);
    doc.font('Times-Bold').fontSize(17).fillColor(text).text(
      `Certificamos que ${student.nome || 'Aluno'}, portador(a) do CPF ${student.cpf || '-'}, concluiu com aproveitamento satisfatório o treinamento ${student.nomeCurso || '-'}, com carga horária de ${student.duracao || '-'}, realizado em ${student.local || '-'}, em ${formatDateBR(student.data)}, em conformidade com os requisitos aplicáveis.`,
      92,
      218,
      { width: width - 184, align: 'left', lineGap: 4 },
    );

    doc.font('Helvetica-Bold').fontSize(9).fillColor(primary).text(`LOCAL DO CURSO - ${student.local || '-'}`, 0, 314, {
      align: 'center',
    });

    doc.moveTo(96, 390).lineTo(286, 390).lineWidth(1).stroke(primary);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(text).text('Responsável Técnico DRM', 96, 400, { width: 190 });
    doc.font('Helvetica').fontSize(8).fillColor(muted).text('Assinatura digital autorizada', 96, 416, { width: 190 });

    doc.moveTo(width - 286, 390).lineTo(width - 96, 390).lineWidth(1).stroke(primary);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(text).text(student.nome || 'Aluno', width - 286, 400, { width: 190, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor(muted).text('Participante', width - 286, 416, { width: 190, align: 'right' });

    doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text(
      `Autorizado por ${student.certificadoAutorizadoPor || 'Responsável DRM'} em ${formatDateTimeBR(student.certificadoAutorizadoEm)}. Código de validação: ${code}.`,
      70,
      height - 86,
      { width: width - 140, align: 'center' },
    );
    doc.font('Helvetica').fontSize(8).fillColor(muted).text(`Validação pública: ${validationUrl}`, 70, height - 66, {
      width: width - 140,
      align: 'center',
    });

    doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
    drawFrame('CONTEÚDO PROGRAMÁTICO');
    doc.font('Helvetica-Bold').fontSize(15).fillColor(text).text(student.nomeCurso || 'Curso', 70, 180, {
      width: width - 140,
      align: 'center',
    });
    const topics = certificateTopics(student);
    let y = 238;
    doc.font('Helvetica').fontSize(13).fillColor(text);
    topics.forEach((topic, index) => {
      doc.text(`${index + 1}. ${topic};`, 118, y, { width: width - 236, lineGap: 2 });
      y += 23;
      if (y > height - 110) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        drawFrame('CONTEÚDO PROGRAMÁTICO');
        y = 170;
        doc.font('Helvetica').fontSize(13).fillColor(text);
      }
    });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text(`Código de validação: ${code}`, 70, height - 68, {
      width: width - 140,
      align: 'center',
    });

    doc.end();
  });
}

function buildCertificateEmail(student) {
  const validationUrl = `${PUBLIC_APP_URL.replace(/\/$/, '')}/validar-certificado`;
  const certificateCode = student.certificadoAssinaturaCodigo || '';
  const courseName = student.nomeCurso || 'treinamento DRM';

  return {
    subject: `Seu certificado DRM está pronto - ${courseName}`,
    text: [
      `Olá, ${student.nome}.`,
      '',
      `Parabéns pela conclusão do curso ${courseName}.`,
      'Seu certificado oficial DRM Treinamentos e Certificações está anexado a este e-mail em PDF.',
      `Código de validação: ${certificateCode}`,
      `Validação pública: ${validationUrl}`,
      '',
      'Atenciosamente,',
      'DRM Treinamentos e Certificações',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
        <div style="max-width:640px;margin:0 auto;padding:28px 16px">
          <div style="background:linear-gradient(135deg,#111827,#f97316);border-radius:18px 18px 0 0;padding:28px;color:white">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fed7aa">DRM Treinamentos e Certificações</p>
            <h1 style="margin:0;font-size:26px;line-height:1.2">Seu certificado está pronto</h1>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:28px">
            <p style="font-size:16px;margin:0 0 16px">Olá, <strong>${student.nome}</strong>.</p>
            <p style="font-size:15px;margin:0 0 16px">
              Parabéns pela conclusão do curso <strong>${courseName}</strong>. Seu certificado oficial está anexado a este e-mail em PDF.
            </p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#9a3412">Código de validação</p>
              <p style="margin:0;font-family:Consolas,monospace;font-size:16px;font-weight:bold;color:#111827">${certificateCode}</p>
            </div>
            <p style="font-size:14px;margin:0 0 16px;color:#4b5563">
              A autenticidade do certificado pode ser conferida a qualquer momento pelo link abaixo:
            </p>
            <p style="margin:0 0 24px">
              <a href="${validationUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">
                Validar certificado
              </a>
            </p>
            <p style="font-size:13px;color:#6b7280;margin:0">
              Guarde este e-mail e o PDF anexado. Ele comprova a emissão e permite a validação pública do certificado.
            </p>
            <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
            <p style="font-size:14px;margin:0;color:#374151">Atenciosamente,<br><strong>DRM Treinamentos e Certificações</strong></p>
          </div>
        </div>
      </div>
    `,
  };
}

async function sendCertificateEmail(student) {
  if (!mailTransport) return { sent: false, error: 'SMTP nao configurado.' };
  if (!student.email) return { sent: false, error: 'Aluno sem e-mail cadastrado.' };

  const message = buildCertificateEmail(student);
  const certificatePdf = await generateCertificatePdf(student);
  const filename = `certificado-${sanitizeFileName(student.nome)}-${sanitizeFileName(student.nomeCurso)}.pdf`;
  await mailTransport.sendMail({
    from: SMTP_FROM,
    to: student.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [
      {
        filename,
        content: certificatePdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return { sent: true };
}

function buildDashboard() {
  const totalAlunos = students.length;
  const alunosAprovados = students.filter(s => s.statusCadastro === 'aprovado').length;
  const alunosPendentes = students.filter(s => s.statusCadastro === 'pendente').length;
  const certificadosEmitidos = students.filter(s => s.statusCertificado === 'aprovado').length;
  const certificadosEnviados = students.filter(s => s.certificadoEnviado).length;
  const totalCursos = courses.length;

  const pendingItems = students
    .filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente')
    .map(s => ({
      id: s.id,
      nome: s.nome,
      nomeCurso: s.nomeCurso,
      statusCadastro: s.statusCadastro,
      statusCertificado: s.statusCertificado,
    }));

  const recentStudents = [...students]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return {
    metrics: {
      totalAlunos,
      alunosAprovados,
      alunosPendentes,
      certificadosEmitidos,
      certificadosEnviados,
      totalCursos,
    },
    charts: {
      monthly: CHART_DATA_MONTHLY,
    },
    pendingItems,
    recentStudents,
    generatedAt: new Date().toISOString(),
  };
}

function normalizeCoursePayload(payload) {
  const pickText = (...values) => {
    const value = values.find(item => item !== undefined && item !== null && String(item).trim() !== '');
    return value === undefined ? '' : String(value).trim();
  };
  const instrutorNomeRaw = pickText(payload.instrutorNome, payload.nomeInstrutor, payload.instrutor);
  const instrutorCargoRaw = pickText(payload.instrutorCargo, payload.cargoInstrutor, payload.instrutorFuncao);
  const instrutorRegistroRaw = pickText(payload.instrutorRegistro, payload.registroInstrutor, payload.creaInstrutor, payload.cftInstrutor);
  const explicitNoInstructor = payload.temInstrutor === false || payload.temInstrutor === 'false';
  const temInstrutor = explicitNoInstructor
    ? false
    : payload.temInstrutor !== undefined || Boolean(instrutorNomeRaw || instrutorCargoRaw || instrutorRegistroRaw);
  const instrutorNome = temInstrutor ? instrutorNomeRaw : '';
  const instrutorCargo = temInstrutor ? instrutorCargoRaw : '';
  const instrutorRegistro = temInstrutor ? instrutorRegistroRaw : '';

  return {
    ...payload,
    temInstrutor,
    instrutor: instrutorNome,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    status: payload.status || 'ativo',
    codigoVerificacao: payload.codigoVerificacao || buildCourseAccessCode(payload.nomeCurso),
    chamadaStatus: payload.chamadaStatus || 'aberta',
    cronograma: normalizeSchedule(payload),
    cronogramaStatus: payload.cronogramaStatus || 'pendente',
  };
}

function createCourse(payload) {
  const coursePayload = normalizeCoursePayload(payload);
  const required = ['nomeCurso', 'empresaContratante', 'local', 'data', 'horarioInicio', 'duracao', 'maxAlunos'];
  if (coursePayload.temInstrutor) {
    required.push('instrutorNome', 'instrutorCargo', 'instrutorRegistro');
  }
  const missing = required.filter(field => !coursePayload[field]);
  if (missing.length > 0) {
    return { error: `Campos obrigatorios: ${missing.join(', ')}` };
  }

  const nextId = courses.reduce((max, course) => Math.max(max, Number(course.id) || 0), 0) + 1;
  const newCourse = {
    ...coursePayload,
    id: nextId,
    maxAlunos: Number(coursePayload.maxAlunos),
    qrCode: `DRM-QR-${String(Date.now()).slice(-6)}`,
    status: coursePayload.status || 'ativo',
    codigoVerificacao: coursePayload.codigoVerificacao || buildCourseAccessCode(coursePayload.nomeCurso),
    chamadaStatus: 'aberta',
    cronograma: normalizeSchedule(coursePayload),
    cronogramaStatus: 'pendente',
    createdAt: new Date().toISOString().split('T')[0],
  };
  courses = [...courses, newCourse];
  persistData();
  return { course: newCourse };
}

function updateCourse(id, payload) {
  const index = courses.findIndex(course => String(course.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Curso nao encontrado.' };
  }

  const current = courses[index];
  const coursePayload = normalizeCoursePayload({ ...current, ...payload });
  if (coursePayload.temInstrutor) {
    const missingInstructor = ['instrutorNome', 'instrutorCargo', 'instrutorRegistro'].filter(field => !coursePayload[field]);
    if (missingInstructor.length > 0) {
      return { status: 400, error: `Campos obrigatorios: ${missingInstructor.join(', ')}` };
    }
  }
  const updated = {
    ...current,
    ...coursePayload,
    id: current.id,
    qrCode: current.qrCode,
    maxAlunos: coursePayload.maxAlunos !== undefined ? Number(coursePayload.maxAlunos) : current.maxAlunos,
    updatedAt: new Date().toISOString(),
  };

  courses = courses.map(course => (String(course.id) === String(id) ? updated : course));
  persistData();
  return { course: updated };
}

function updateCourseSchedule(id, payload) {
  const index = courses.findIndex(course => String(course.id) === String(id));
  if (index === -1) return { status: 404, error: 'Curso nao encontrado.' };

  const actor = payload.actor || 'Instrutor DRM';
  const action = payload.action || 'save';
  const currentCourse = normalizeCourse(courses[index]);
  let cronograma = Array.isArray(payload.cronograma)
    ? normalizeSchedule({ ...currentCourse, cronograma: payload.cronograma })
    : normalizeSchedule(currentCourse);
  const now = new Date().toISOString();

  if (action === 'reset') {
    cronograma = buildDefaultSchedule(currentCourse);
  }

  if (action === 'start-next') {
    if (!cronograma.some(item => item.status === 'em_andamento')) {
      const nextIndex = cronograma.findIndex(item => item.status === 'pendente');
      if (nextIndex !== -1) {
        cronograma[nextIndex] = {
          ...cronograma[nextIndex],
          status: 'em_andamento',
          iniciadoEm: now,
          instrutor: actor,
        };
      }
    }
  }

  if (action === 'finish-current') {
    cronograma = cronograma.map(item => (
      item.status === 'em_andamento'
        ? { ...item, status: 'concluida', concluidoEm: now, instrutor: item.instrutor || actor }
        : item
    ));
  }

  if (action === 'start-item' && payload.itemId) {
    cronograma = cronograma.map(item => {
      if (item.status === 'em_andamento') return { ...item, status: 'pendente', iniciadoEm: null };
      if (String(item.id) === String(payload.itemId) && item.status !== 'concluida') {
        return { ...item, status: 'em_andamento', iniciadoEm: now, instrutor: actor };
      }
      return item;
    });
  }

  const cronogramaStatus = cronograma.every(item => item.status === 'concluida')
    ? 'concluido'
    : cronograma.some(item => item.status === 'em_andamento' || item.status === 'concluida')
      ? 'em_andamento'
      : 'pendente';

  const updated = {
    ...courses[index],
    cronograma,
    cronogramaStatus,
    cronogramaAtualizadoEm: now,
    cronogramaAtualizadoPor: actor,
  };

  courses = courses.map(course => (String(course.id) === String(id) ? updated : course));
  persistData();
  return { course: normalizeCourse(updated) };
}

function activePublicCourses() {
  return courses
    .map(normalizeCourse)
    .filter(course => course.status === 'ativo')
    .map(publicCourse);
}

function verifyCourseAccess(courseId, codigo) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(courseId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };
  if (course.status !== 'ativo') return { status: 400, error: 'Curso nao esta ativo.' };
  if (String(course.codigoVerificacao || '').trim().toUpperCase() !== String(codigo || '').trim().toUpperCase()) {
    return { status: 401, error: 'Codigo de verificacao invalido.' };
  }
  return { course: publicCourse(course) };
}

function createStudentEnrollment(courseId, payload) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(courseId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };

  const verified = verifyCourseAccess(courseId, payload.codigo);
  if (verified.error) return verified;

  const inscritos = students.filter(student => String(student.cursoId) === String(course.id)).length;
  if (Number(course.maxAlunos || 0) > 0 && inscritos >= Number(course.maxAlunos)) {
    return { status: 400, error: 'Curso sem vagas disponiveis.' };
  }

  const required = ['nome', 'cpf', 'email', 'telefone', 'empresa', 'cargo'];
  const missing = required.filter(field => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length > 0) {
    return { status: 400, error: `Campos obrigatorios: ${missing.join(', ')}` };
  }

  const duplicate = students.find(student => (
    String(student.cursoId) === String(course.id) &&
    String(student.cpf || '').replace(/\D/g, '') === String(payload.cpf || '').replace(/\D/g, '')
  ));
  if (duplicate) return { status: 409, error: 'CPF ja cadastrado para este curso.' };

  const nextId = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
  const student = {
    id: nextId,
    nome: String(payload.nome).trim(),
    cpf: String(payload.cpf).trim(),
    email: String(payload.email).trim(),
    telefone: String(payload.telefone).trim(),
    empresa: String(payload.empresa).trim(),
    cargo: String(payload.cargo).trim(),
    cursoId: course.id,
    nomeCurso: course.nomeCurso,
    local: course.local,
    data: course.data,
    horarioInicio: course.horarioInicio,
    duracao: course.duracao,
    temInstrutor: course.temInstrutor,
    instrutor: course.instrutor,
    instrutorNome: course.instrutorNome,
    instrutorCargo: course.instrutorCargo,
    instrutorRegistro: course.instrutorRegistro,
    statusCadastro: 'pendente',
    statusCertificado: 'pendente',
    certificadoEnviado: false,
    dataEnvio: null,
    presente: null,
    presenca: 0,
    notaProva: 0,
    foto: null,
    motivoRecusa: null,
    inscritoEm: new Date().toISOString(),
  };

  students = [...students, student];
  persistData();
  return { student };
}

function courseStudents(courseId) {
  const course = courses.find(item => String(item.id) === String(courseId));
  if (!course) return { status: 404, error: 'Curso nao encontrado.' };

  return {
    course: normalizeCourse(course),
    students: students.filter(student => String(student.cursoId) === String(courseId)),
  };
}

function updateAttendance(courseId, payload) {
  const course = courses.find(item => String(item.id) === String(courseId));
  if (!course) return { status: 404, error: 'Curso nao encontrado.' };

  const attendance = payload.attendance || {};
  const actor = payload.actor || 'Responsável DRM';
  const now = new Date().toISOString();

  students = students.map(student => {
    if (String(student.cursoId) !== String(courseId) || attendance[student.id] === undefined) return student;
    const presente = Boolean(attendance[student.id]);
    return {
      ...student,
      presente,
      presenca: presente ? 100 : 0,
      chamadaRealizadaEm: now,
      chamadaPor: actor,
      statusCadastro: presente ? 'aprovado' : 'recusado',
      statusCertificado: presente ? student.statusCertificado : 'recusado',
      motivoRecusa: presente ? null : 'Ausente na chamada do curso.',
      certificadoEnviado: presente ? student.certificadoEnviado : false,
      dataEnvio: presente ? student.dataEnvio : null,
    };
  });

  courses = courses.map(item => (
    String(item.id) === String(courseId)
      ? { ...item, chamadaStatus: 'realizada', chamadaRealizadaEm: now, chamadaPor: actor }
      : item
  ));

  persistData();
  return courseStudents(courseId);
}

async function updateStudentStatus(id, payload) {
  const { field, value, motivo = null, actor = 'Responsável DRM' } = payload;
  if (!allowedStatusFields.has(field)) {
    return { status: 400, error: 'Campo de status invalido.' };
  }
  if (!allowedStatusValues.has(value)) {
    return { status: 400, error: 'Valor de status invalido.' };
  }
  if (value === 'recusado' && !motivo) {
    return { status: 400, error: 'Motivo da recusa e obrigatorio.' };
  }

  const index = students.findIndex(student => String(student.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Aluno nao encontrado.' };
  }
  if (field === 'statusCertificado' && value === 'aprovado' && students[index].presente !== true && Number(students[index].presenca || 0) < 75) {
    return { status: 400, error: 'Certificado so pode ser liberado para aluno presente na chamada.' };
  }

  let updated = applyStudentStatus(students[index], field, value, motivo, actor);
  if (field === 'statusCertificado' && value === 'aprovado') {
    try {
      const emailResult = await sendCertificateEmail(updated);
      updated = {
        ...updated,
        certificadoEnviado: emailResult.sent,
        dataEnvio: emailResult.sent ? new Date().toISOString().split('T')[0] : updated.dataEnvio || null,
        certificadoEmailErro: emailResult.sent ? null : emailResult.error,
      };
    } catch (error) {
      updated = {
        ...updated,
        certificadoEnviado: false,
        dataEnvio: null,
        certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
      };
    }
  }
  students = students.map(student => (String(student.id) === String(id) ? updated : student));
  persistData();
  return { student: updated };
}

async function markCertificateSent(id) {
  const index = students.findIndex(student => String(student.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Aluno nao encontrado.' };
  }

  let updated = students[index];
  if (updated.statusCertificado === 'aprovado') {
    try {
      const emailResult = await sendCertificateEmail(updated);
      updated = {
        ...updated,
        certificadoEnviado: emailResult.sent,
        certificadoEmailErro: emailResult.sent ? null : emailResult.error,
      };
    } catch (error) {
      updated = {
        ...updated,
        certificadoEnviado: false,
        certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
      };
    }
  }

  updated = {
    ...students[index],
    ...updated,
    dataEnvio: updated.certificadoEnviado ? new Date().toISOString().split('T')[0] : updated.dataEnvio || null,
  };
  students = students.map(student => (String(student.id) === String(id) ? updated : student));
  persistData();
  return { student: updated };
}

function validateCertificate(code) {
  const student = students.find(item => item.certificadoAssinaturaCodigo === code);
  if (!student) return { status: 404, error: 'Certificado nao encontrado.' };
  if (student.statusCertificado !== 'aprovado') return { status: 400, error: 'Certificado nao esta ativo.' };

  return {
    valid: true,
    certificado: {
      codigo: student.certificadoAssinaturaCodigo,
      aluno: student.nome,
      cpf: student.cpf,
      curso: student.nomeCurso,
      local: student.local,
      data: student.data,
      autorizadoEm: student.certificadoAutorizadoEm,
      autorizadoPor: student.certificadoAutorizadoPor,
    },
  };
}

async function markAllCertificatesSent() {
  const today = new Date().toISOString().split('T')[0];
  const nextStudents = [];
  for (const student of students) {
    if (student.statusCertificado !== 'aprovado' || student.certificadoEnviado) {
      nextStudents.push(student);
      continue;
    }

    try {
      const emailResult = await sendCertificateEmail(student);
      nextStudents.push({
        ...student,
        certificadoEnviado: emailResult.sent,
        dataEnvio: emailResult.sent ? today : student.dataEnvio,
        certificadoEmailErro: emailResult.sent ? null : emailResult.error,
      });
    } catch (error) {
      nextStudents.push({
        ...student,
        certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
      });
    }
  }
  students = nextStudents;
  persistData();
  return {
    students,
    sent: students.filter(student => student.statusCertificado === 'aprovado' && student.certificadoEnviado).length,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'drm-api',
      database: dbPool ? 'postgresql' : 'local-json',
      email: mailTransport ? 'smtp-configured' : 'smtp-not-configured',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const user = APP_USERS.find(item => item.username === body.username && item.password === body.password);
    if (!user) {
      sendJson(res, 401, { error: 'Usuario ou senha invalidos.' });
      return;
    }
    sendJson(res, 200, { user: withoutPassword(user) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    sendJson(res, 200, buildDashboard());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/students') {
    sendJson(res, 200, students);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/courses') {
    sendJson(res, 200, courses.map(normalizeCourse));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings/certificate') {
    sendJson(res, 200, certificateSettings || {});
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/settings/certificate') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    sendJson(res, 200, updateCertificateSettings(body));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/public/courses') {
    sendJson(res, 200, activePublicCourses());
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'courses' && parts[4] === 'verify') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = verifyCourseAccess(parts[3], body.codigo);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'courses' && parts[4] === 'enroll') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createStudentEnrollment(parts[3], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result.student);
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'certificates' && parts[2]) {
    const result = validateCertificate(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/courses') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createCourse(body);
    if (result.error) {
      badRequest(res, result.error);
      return;
    }
    sendJson(res, 201, result.course);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && !parts[3]) {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateCourse(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'students') {
    const result = courseStudents(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'attendance') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateAttendance(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'schedule') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateCourseSchedule(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[2] === 'certificates' && parts[3] === 'send-all') {
    sendJson(res, 200, await markAllCertificatesSent());
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[3] === 'status') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = await updateStudentStatus(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.student);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[3] === 'certificate-sent') {
    const result = await markCertificateSent(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.student);
    return;
  }

  notFound(res);
});

server.listen(PORT, HOST, () => {
  console.log(`DRM API running at http://${HOST}:${PORT}`);
});
