import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  AlertTriangle, Building2, CheckCircle, ChevronRight, Download, FileSpreadsheet,
  Loader2, Plus, Trash2, Users, XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const DRAFT_KEY = 'drmNovaTurmaManualDraft';
const QUICK_DEFAULTS_KEY = 'drmNovaTurmaManualDefaults';
const LAST_CLASS_KEY = 'drmNovaTurmaManualLastClass';
const steps = ['Empresa', 'Curso', 'Alunos', 'Revisão', 'Análise/Emissão'];
const emptyCompany = { nome: '', cnpj: '', contato: '', telefone: '', email: '' };
const emptyCourseInfo = {
  cursoId: '',
  data: '',
  horarioInicio: '',
  periodoInicio: '',
  periodoFim: '',
  local: '',
};
const emptyStudent = () => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
});
const studentFields = ['nome', 'cpf', 'email', 'telefone', 'cargo'];
const templateRows = [
  ['nome', 'CPF', 'e-mail', 'telefone', 'cargo'],
  ['Maria Silva', '000.000.000-00', 'maria@email.com', '(11) 99999-9999', 'Operador'],
];

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapImportedRow(row) {
  const mapped = {};
  Object.entries(row).forEach(([key, value]) => {
    const header = normalizeHeader(key);
    if (['nome', 'nomecompleto', 'aluno', 'participante'].includes(header)) mapped.nome = value;
    if (['cpf', 'documento'].includes(header)) mapped.cpf = value;
    if (['email', 'emailaluno', 'e-mail'].includes(header)) mapped.email = value;
    if (['telefone', 'celular', 'whatsapp'].includes(header)) mapped.telefone = value;
    if (['cargo', 'funcao', 'função'].includes(header)) mapped.cargo = value;
  });
  return {
    ...emptyStudent(),
    nome: String(mapped.nome || '').trim(),
    cpf: String(mapped.cpf || '').trim(),
    email: String(mapped.email || '').trim(),
    telefone: String(mapped.telefone || '').trim(),
    cargo: String(mapped.cargo || '').trim(),
  };
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateRows(list) {
  const cpfCounts = list.reduce((acc, row) => {
    const cpf = String(row.cpf || '').replace(/\D/g, '');
    if (cpf) acc[cpf] = (acc[cpf] || 0) + 1;
    return acc;
  }, {});
  return list.map(row => {
    const errors = {};
    studentFields.forEach(field => {
      if (!String(row[field] || '').trim()) errors[field] = 'Obrigatório';
    });
    const cpf = String(row.cpf || '').replace(/\D/g, '');
    if (cpf && cpfCounts[cpf] > 1) errors.cpf = 'CPF duplicado';
    if (row.email && !validEmail(row.email)) errors.email = 'E-mail inválido';
    return errors;
  });
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let line = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      line.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      line.push(current);
      if (line.some(value => String(value).trim())) rows.push(line);
      line = [];
      current = '';
    } else {
      current += char;
    }
  }
  line.push(current);
  if (line.some(value => String(value).trim())) rows.push(line);
  return rows;
}

function rowsToObjects(rawRows) {
  if (!rawRows.length) return { rows: [], missing: ['nome', 'CPF', 'e-mail', 'telefone', 'cargo'] };
  const headers = rawRows[0].map(normalizeHeader);
  const required = ['nome', 'cpf', 'email', 'telefone', 'cargo'];
  const aliases = {
    nome: ['nome', 'nomecompleto', 'aluno', 'participante'],
    cpf: ['cpf', 'documento'],
    email: ['email', 'emailaluno', 'emaildoaluno'],
    telefone: ['telefone', 'celular', 'whatsapp'],
    cargo: ['cargo', 'funcao'],
  };
  const indexes = Object.fromEntries(required.map(field => [
    field,
    headers.findIndex(header => aliases[field].includes(header)),
  ]));
  const missing = required.filter(field => indexes[field] === -1);
  const rows = rawRows.slice(1).map(values => {
    const object = {};
    required.forEach(field => {
      object[field] = values[indexes[field]] ?? '';
    });
    return mapImportedRow(object);
  }).filter(row => studentFields.some(field => String(row[field] || '').trim()));
  return { rows, missing };
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR');
}

export default function NovaTurmaManualPage() {
  const { students, courses, classes, addManualClass, loadingData } = useApp();
  const [step, setStep] = useState(0);
  const [companyMode, setCompanyMode] = useState('existing');
  const [companySearch, setCompanySearch] = useState('');
  const [company, setCompany] = useState(emptyCompany);
  const [courseInfo, setCourseInfo] = useState(emptyCourseInfo);
  const [rows, setRows] = useState([emptyStudent(), emptyStudent(), emptyStudent()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [studentPage, setStudentPage] = useState(1);
  const fileInputRef = useRef(null);
  const [quickDefaultsLoaded, setQuickDefaultsLoaded] = useState(false);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!draft) return;
      setStep(draft.step || 0);
      setCompanyMode(draft.companyMode || 'existing');
      setCompanySearch(draft.companySearch || '');
      setCompany(draft.company || emptyCompany);
      setCourseInfo(draft.courseInfo || emptyCourseInfo);
      setRows(Array.isArray(draft.rows) && draft.rows.length ? draft.rows : [emptyStudent()]);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (quickDefaultsLoaded) return;
    try {
      const defaults = JSON.parse(localStorage.getItem(QUICK_DEFAULTS_KEY) || 'null');
      if (defaults) {
        setCompany(prev => ({
          ...prev,
          nome: prev.nome || defaults.companyName || '',
        }));
        setCourseInfo(prev => ({
          ...prev,
          horarioInicio: prev.horarioInicio || defaults.horarioInicio || '',
          local: prev.local || defaults.local || '',
        }));
      }
    } catch {
      // noop
    } finally {
      setQuickDefaultsLoaded(true);
    }
  }, [quickDefaultsLoaded]);

  useEffect(() => {
    const draft = { step, companyMode, companySearch, company, courseInfo, rows };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, companyMode, companySearch, company, courseInfo, rows]);

  useEffect(() => {
    const warnBeforeExit = (event) => {
      const hasDraft = company.nome || courseInfo.cursoId || rows.some(row => studentFields.some(field => row[field]));
      if (!hasDraft || step === 4) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeExit);
    return () => window.removeEventListener('beforeunload', warnBeforeExit);
  }, [company, courseInfo, rows, step]);

  const registeredCompanies = useMemo(() => {
    const map = new Map();
    const add = (nome, extra = {}) => {
      const key = String(nome || '').trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, { nome: String(nome).trim(), ...extra });
    };
    courses.forEach(course => add(course.empresaContratante));
    students.forEach(student => add(student.empresa));
    classes.forEach(turma => add(turma.empresa?.nome, turma.empresa));
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [courses, students, classes]);

  const filteredCompanies = registeredCompanies.filter(item => (
    !companySearch || item.nome.toLowerCase().includes(companySearch.toLowerCase())
  ));
  const selectedCourse = courses.find(course => String(course.id) === String(courseInfo.cursoId));

  const rowErrors = useMemo(() => validateRows(rows), [rows]);

  const validRows = rowErrors.filter(errors => Object.keys(errors).length === 0).length;
  const invalidRows = rows.length - validRows;
  const pageSize = 25;
  const totalStudentPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleOffset = (studentPage - 1) * pageSize;
  const visibleRows = rows.slice(visibleOffset, visibleOffset + pageSize);
  const canAdvanceCompany = Boolean(company.nome.trim());
  const canAdvanceCourse = Boolean(courseInfo.cursoId && courseInfo.data && courseInfo.periodoInicio && courseInfo.periodoFim && courseInfo.local);
  const canAdvanceStudents = rows.length > 0 && invalidRows === 0;
  const maxUnlockedStep = useMemo(() => {
    if (step === 4) return 4;
    if (!canAdvanceCompany) return 0;
    if (!canAdvanceCourse) return 1;
    if (!canAdvanceStudents) return 2;
    return 3;
  }, [step, canAdvanceCompany, canAdvanceCourse, canAdvanceStudents]);

  useEffect(() => {
    if (step > maxUnlockedStep && step !== 4) {
      setStep(maxUnlockedStep);
    }
  }, [step, maxUnlockedStep]);

  const updateCourse = (field, value) => {
    setCourseInfo(prev => {
      if (field !== 'cursoId') return { ...prev, [field]: value };
      const course = courses.find(item => String(item.id) === String(value));
      return {
        ...prev,
        cursoId: value,
        data: prev.data || course?.data || '',
        horarioInicio: prev.horarioInicio || course?.horarioInicio || '',
        periodoInicio: prev.periodoInicio || course?.data || '',
        periodoFim: prev.periodoFim || course?.data || '',
        local: prev.local || course?.local || '',
      };
    });
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handlePaste = (event, rowId, startField) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const fields = studentFields;
    const startIndex = fields.indexOf(startField);
    const rowIndex = rows.findIndex(row => row.id === rowId);
    const pasted = text.trim().split(/\r?\n/).map(line => line.split('\t'));
    setRows(prev => {
      const next = [...prev];
      pasted.forEach((cols, offset) => {
        const targetIndex = rowIndex + offset;
        if (!next[targetIndex]) next[targetIndex] = emptyStudent();
        cols.forEach((value, colOffset) => {
          const field = fields[startIndex + colOffset];
          if (field) next[targetIndex] = { ...next[targetIndex], [field]: value.trim() };
        });
      });
      return next;
    });
    setStudentPage(Math.ceil((rowIndex + pasted.length + 1) / pageSize));
  };

  const importFile = async (file) => {
    if (!file) return;
    setMessage(null);
    setImportPreview(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let rawRows = [];
      if (extension === 'xls') {
        throw new Error('Arquivos .xls antigos foram desativados por segurança. Salve como .xlsx ou .csv e importe novamente.');
      }
      if (extension === 'csv') {
        rawRows = parseCsv(await file.text());
      } else if (extension === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('Arquivo vazio. Confira se a planilha possui uma aba com alunos.');
        sheet.eachRow({ includeEmpty: false }, row => {
          rawRows.push(row.values.slice(1).map(value => {
            if (value && typeof value === 'object') return value.text || value.result || value.hyperlink || '';
            return value ?? '';
          }));
        });
      } else {
        throw new Error('Formato não suportado. Use .csv ou .xlsx.');
      }

      if (rawRows.length < 2) throw new Error('Arquivo vazio ou sem alunos para importar.');
      const parsed = rowsToObjects(rawRows);
      if (parsed.missing.length) throw new Error(`Coluna obrigatória ausente: ${parsed.missing.join(', ')}.`);
      if (!parsed.rows.length) throw new Error('Nenhum aluno encontrado no arquivo.');
      const errors = validateRows(parsed.rows);
      setImportPreview({
        fileName: file.name,
        rows: parsed.rows,
        errors,
        valid: errors.filter(item => Object.keys(item).length === 0).length,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao importar arquivo.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyImportPreview = () => {
    if (!importPreview) return;
    setRows(importPreview.rows);
    setStudentPage(1);
    setImportPreview(null);
    setMessage({ type: 'success', text: `${importPreview.rows.length} aluno(s) importados para revisão.` });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCsvTemplate = () => {
    const csv = templateRows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'modelo-alunos-drm.csv');
  };

  const downloadExcelTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Alunos');
    templateRows.forEach(row => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.columns = [{ width: 28 }, { width: 18 }, { width: 28 }, { width: 18 }, { width: 18 }];
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'modelo-alunos-drm.xlsx');
  };

  const finalize = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await addManualClass({
        empresa: company,
        ...courseInfo,
        alunos: rows,
        ambienteTeste: company.nome.includes('[TESTE]'),
      });
      if (result) {
        localStorage.setItem(QUICK_DEFAULTS_KEY, JSON.stringify({
          companyName: company.nome,
          horarioInicio: courseInfo.horarioInicio,
          local: courseInfo.local,
        }));
        localStorage.setItem(LAST_CLASS_KEY, JSON.stringify({
          company,
          courseInfo,
        }));
        localStorage.removeItem(DRAFT_KEY);
        setMessage({ type: 'success', text: 'Turma criada e enviada para análise.' });
        setStep(4);
      }
    } finally {
      setSaving(false);
    }
  };

  const applyLastClass = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_CLASS_KEY) || 'null');
      if (!saved) {
        setMessage({ type: 'error', text: 'Nenhuma turma anterior encontrada para duplicar.' });
        return;
      }
      setCompany(saved.company || emptyCompany);
      setCourseInfo(saved.courseInfo || emptyCourseInfo);
      setStep(2);
      setMessage({ type: 'success', text: 'Última turma carregada. Agora revise os alunos e finalize.' });
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível carregar a última turma.' });
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setStep(0);
    setCompanyMode('existing');
    setCompanySearch('');
    setCompany(emptyCompany);
    setCourseInfo(emptyCourseInfo);
    setRows([emptyStudent(), emptyStudent(), emptyStudent()]);
    setImportPreview(null);
    setStudentPage(1);
    setMessage(null);
  };

  const StepButton = ({ index }) => (
    <button
      type="button"
      onClick={() => {
        if (index <= maxUnlockedStep) setStep(index);
      }}
      disabled={index > maxUnlockedStep}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
        step === index
          ? 'bg-blue-700 text-white'
          : index < step
            ? 'bg-green-50 text-green-700'
            : 'bg-white border border-gray-200 text-gray-500'
      } ${
        index > maxUnlockedStep ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <span className="w-6 h-6 rounded-full bg-white/20 border border-current flex items-center justify-center text-xs">{index + 1}</span>
      {steps[index]}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Nova turma manual</h2>
            <p className="text-sm text-gray-500 mt-1">Crie uma turma completa, cole ou importe alunos e envie tudo para análise.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={applyLastClass} className="btn-secondary text-sm">Usar última turma</button>
            <button type="button" onClick={clearDraft} className="btn-secondary text-sm">Limpar rascunho</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {steps.map((_, index) => <StepButton key={index} index={index} />)}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {step === 0 && (
        <div className="card space-y-5">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-700" />
            <h3 className="font-bold text-gray-900">Empresa contratante</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setCompanyMode('existing')} className={`rounded-xl border p-4 text-left ${companyMode === 'existing' ? 'border-blue-600 bg-blue-50' : 'border-gray-100'}`}>
              <p className="font-bold">Empresa já cadastrada</p>
              <p className="text-xs text-gray-500 mt-1">Buscar por empresas usadas em cursos, alunos e turmas.</p>
            </button>
            <button onClick={() => setCompanyMode('new')} className={`rounded-xl border p-4 text-left ${companyMode === 'new' ? 'border-green-600 bg-green-50' : 'border-gray-100'}`}>
              <p className="font-bold">Nova empresa</p>
              <p className="text-xs text-gray-500 mt-1">Cadastrar dados principais rapidamente.</p>
            </button>
          </div>

          {companyMode === 'existing' ? (
            <div className="space-y-3">
              <input value={companySearch} onChange={event => setCompanySearch(event.target.value)} className="input-field" placeholder="Buscar empresa..." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredCompanies.slice(0, 8).map(item => (
                  <button key={item.nome} onClick={() => setCompany(item)} className={`rounded-lg border p-3 text-left ${company.nome === item.nome ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <p className="text-sm font-bold text-gray-900">{item.nome}</p>
                    <p className="text-xs text-gray-500">{item.cnpj || 'Sem CNPJ informado'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['nome', 'cnpj', 'contato', 'telefone', 'email'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field === 'nome' ? 'Nome da empresa *' : field}</label>
                  <input value={company[field] || ''} onChange={event => setCompany(prev => ({ ...prev, [field]: event.target.value }))} className="input-field" />
                </div>
              ))}
            </div>
          )}

          {company.nome && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm">
              <p className="font-bold text-gray-900">{company.nome}</p>
              <p className="text-gray-500">{company.cnpj || 'CNPJ não informado'} {company.contato ? `- ${company.contato}` : ''}</p>
            </div>
          )}
          <div className="flex justify-end">
            <button disabled={!canAdvanceCompany} onClick={() => setStep(1)} className="btn-primary disabled:opacity-50">Avançar <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-5">
          <h3 className="font-bold text-gray-900">Curso e data da turma</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso/treinamento *</label>
              <select value={courseInfo.cursoId} onChange={event => updateCourse('cursoId', event.target.value)} className="input-field">
                <option value="">Selecione</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.nomeCurso}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data inicial *</label><input type="date" value={courseInfo.periodoInicio} onChange={e => updateCourse('periodoInicio', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data final *</label><input type="date" value={courseInfo.periodoFim} onChange={e => updateCourse('periodoFim', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data da turma *</label><input type="date" value={courseInfo.data} onChange={e => updateCourse('data', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Hora de início</label><input type="time" value={courseInfo.horarioInicio} onChange={e => updateCourse('horarioInicio', e.target.value)} className="input-field" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Local *</label><input value={courseInfo.local} onChange={e => updateCourse('local', e.target.value)} className="input-field" /></div>
          </div>
          {selectedCourse && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-600">Carga horária</p><p className="font-bold text-blue-950">{selectedCourse.duracao}</p></div>
              <div className="rounded-xl bg-green-50 p-3"><p className="text-xs text-green-600">Instrutor</p><p className="font-bold text-green-950">{selectedCourse.instrutorNome || selectedCourse.instrutor || 'Não informado'}</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-600">Modelo</p><p className="font-bold text-amber-950">Certificado padrão</p></div>
            </div>
          )}
          <div className="flex justify-between"><button onClick={() => setStep(0)} className="btn-secondary">Voltar</button><button disabled={!canAdvanceCourse} onClick={() => setStep(2)} className="btn-primary disabled:opacity-50">Avançar</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">Alunos da turma</h3>
              <p className="text-xs text-gray-500">Cole dados do Excel direto na grade ou importe um arquivo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={event => importFile(event.target.files?.[0])} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm"><FileSpreadsheet className="w-4 h-4" />Importar lista de alunos</button>
              <button onClick={downloadCsvTemplate} className="btn-secondary text-sm"><Download className="w-4 h-4" />Modelo CSV</button>
              <button onClick={downloadExcelTemplate} className="btn-secondary text-sm"><Download className="w-4 h-4" />Modelo Excel</button>
              <button onClick={() => setRows(prev => [...prev, emptyStudent()])} className="btn-primary text-sm"><Plus className="w-4 h-4" />Adicionar linha</button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            Colunas aceitas: <strong>nome, CPF, e-mail, telefone e cargo</strong>. Arquivos .xlsx e .csv abrem em prévia antes de aplicar; .xls antigo fica bloqueado por segurança.
          </div>

          {importPreview && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">Prévia da importação</p>
                  <p className="text-sm text-gray-500">{importPreview.fileName}: {importPreview.rows.length} registro(s), {importPreview.valid} válido(s), {importPreview.rows.length - importPreview.valid} com erro.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setImportPreview(null)} className="btn-secondary text-sm"><XCircle className="w-4 h-4" />Cancelar</button>
                  <button onClick={applyImportPreview} className="btn-primary text-sm"><CheckCircle className="w-4 h-4" />Aplicar importação</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full min-w-[820px] text-xs">
                  <thead><tr className="text-left text-gray-500 uppercase">{['linha', ...studentFields, 'erros'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
                  <tbody>
                    {importPreview.rows.slice(0, 50).map((row, index) => {
                      const errors = importPreview.errors[index] || {};
                      return (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="p-2">{index + 2}</td>
                          {studentFields.map(field => <td key={field} className="p-2">{row[field] || '-'}</td>)}
                          <td className={`p-2 ${Object.keys(errors).length ? 'text-red-600' : 'text-green-700'}`}>
                            {Object.entries(errors).map(([field, error]) => `${field}: ${error}`).join('; ') || 'OK'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 text-center"><p className="text-2xl font-bold">{rows.length}</p><p className="text-xs text-gray-500">Total</p></div>
            <div className="rounded-xl bg-green-50 p-3 text-center"><p className="text-2xl font-bold text-green-700">{validRows}</p><p className="text-xs text-green-600">Válidos</p></div>
            <div className="rounded-xl bg-red-50 p-3 text-center"><p className="text-2xl font-bold text-red-700">{invalidRows}</p><p className="text-xs text-red-600">Com erro</p></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead><tr className="text-left text-xs text-gray-500 uppercase">{[...studentFields, ''].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    {studentFields.map(field => (
                      <td key={field} className="p-2">
                        <input
                          value={row[field]}
                          onChange={event => updateRow(row.id, field, event.target.value)}
                          onPaste={event => handlePaste(event, row.id, field)}
                          className={`input-field text-sm ${rowErrors[visibleOffset + index]?.[field] ? 'border-red-300 bg-red-50' : ''}`}
                        />
                        {rowErrors[visibleOffset + index]?.[field] && <p className="text-[10px] text-red-600 mt-1">{rowErrors[visibleOffset + index][field]}</p>}
                      </td>
                    ))}
                    <td className="p-2">
                      <button onClick={() => setRows(prev => prev.filter(item => item.id !== row.id))} className="text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > pageSize && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <p className="text-gray-500">Mostrando {visibleOffset + 1}-{Math.min(rows.length, visibleOffset + pageSize)} de {rows.length} alunos.</p>
              <div className="flex gap-2">
                <button disabled={studentPage === 1} onClick={() => setStudentPage(prev => Math.max(1, prev - 1))} className="btn-secondary text-sm disabled:opacity-50">Anterior</button>
                <button disabled={studentPage === totalStudentPages} onClick={() => setStudentPage(prev => Math.min(totalStudentPages, prev + 1))} className="btn-secondary text-sm disabled:opacity-50">Próxima</button>
              </div>
            </div>
          )}
          <div className="flex justify-between"><button onClick={() => setStep(1)} className="btn-secondary">Voltar</button><button disabled={!canAdvanceStudents} onClick={() => setStep(3)} className="btn-primary disabled:opacity-50">Revisar turma</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-5">
          <h3 className="font-bold text-gray-900">Revisão final</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-500">Empresa</p><p className="font-bold">{company.nome}</p></div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-500">Curso</p><p className="font-bold">{selectedCourse?.nomeCurso}</p></div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-500">Data da turma</p><p className="font-bold">{formatDate(courseInfo.data)}</p></div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-500">Alunos</p><p className="font-bold">{rows.length} total, {validRows} válidos, {invalidRows} pendência(s)</p></div>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="font-semibold text-blue-950">Quem vai para análise</p>
            <p className="text-sm text-blue-700 mt-1">{validRows} aluno(s) serão criados como presentes e com certificado pendente para aprovação.</p>
          </div>
          <div className="flex justify-between"><button onClick={() => setStep(2)} className="btn-secondary">Voltar</button><button onClick={finalize} disabled={saving || !canAdvanceStudents} className="btn-primary disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Criar turma e enviar para análise</button></div>
        </div>
      )}

      {step === 4 && (
        <div className="card text-center py-12">
          <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-black text-gray-900">Turma enviada para análise</h3>
          <p className="text-sm text-gray-500 mt-2">Agora use a tela Análise para aprovar os certificados em lote ou individualmente.</p>
        </div>
      )}

      {loadingData && <div className="fixed bottom-4 right-4 rounded-xl bg-gray-950 text-white px-4 py-3 text-sm">Carregando dados...</div>}
    </div>
  );
}
