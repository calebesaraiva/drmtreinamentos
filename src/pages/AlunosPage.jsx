import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Filter, User, Building2, Phone, Mail,
  BookOpen, MapPin, Calendar, ChevronDown, ChevronUp, X,
  CheckCircle, Loader2, XCircle, Plus, Award, Save
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';

function StatusBadge({ status }) {
  if (status === 'aprovado') return <span className="badge-green">Aprovado</span>;
  if (status === 'recusado') return <span className="badge-red">Recusado</span>;
  return <span className="badge-yellow">Pendente</span>;
}

function formatDateTime(dateTime) {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AlunoDetalheModal({ aluno, onClose, onAutorizar, onRecusar, processing }) {
  if (!aluno) return null;
  const cadastroProcessing = processing === `${aluno.id}:statusCadastro`;
  const certificadoProcessing = processing === `${aluno.id}:statusCertificado`;
  const cadastroRecusaProcessing = processing === `${aluno.id}:statusCadastro:recusar`;
  const certificadoRecusaProcessing = processing === `${aluno.id}:statusCertificado:recusar`;
  const isPresent = aluno.presente === true || Number(aluno.presenca || 0) >= 75;

  return (
    <Modal isOpen={!!aluno} onClose={onClose} title="Detalhes do Aluno" size="lg">
      <div className="space-y-5">
        {/* Avatar & Name */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
            <span className="text-blue-700 text-2xl font-bold">{aluno.nome.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{aluno.nome}</h3>
            <p className="text-gray-500 text-sm">{aluno.cargo} — {aluno.empresa}</p>
            <div className="flex gap-2 mt-1">
              <StatusBadge status={aluno.statusCadastro} />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem icon={User} label="CPF" value={aluno.cpf} />
          <InfoItem icon={Mail} label="E-mail" value={aluno.email} />
          <InfoItem icon={Phone} label="Telefone" value={aluno.telefone} />
          <InfoItem icon={Building2} label="Empresa" value={aluno.empresa} />
          <InfoItem icon={BookOpen} label="Curso" value={aluno.nomeCurso} />
          <InfoItem icon={MapPin} label="Local" value={aluno.local} />
          <InfoItem icon={Calendar} label="Data do Curso" value={aluno.data ? new Date(aluno.data + 'T12:00').toLocaleDateString('pt-BR') : '-'} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{aluno.presenca}%</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">Presença</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{aluno.notaProva}</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">Nota</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${aluno.certificadoEnviado ? 'bg-purple-50' : 'bg-gray-50'}`}>
            <p className={`text-sm font-bold mt-1 ${aluno.certificadoEnviado ? 'text-purple-700' : 'text-gray-500'}`}>
              {aluno.certificadoEnviado ? 'Enviado' : 'Pendente'}
            </p>
            <p className={`text-xs font-medium mt-0.5 ${aluno.certificadoEnviado ? 'text-purple-600' : 'text-gray-400'}`}>Certificado</p>
          </div>
        </div>

        {/* Motivo recusa */}
        {aluno.motivoRecusa && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-1">Motivo da Recusa</p>
            <p className="text-sm text-red-600">{aluno.motivoRecusa}</p>
          </div>
        )}

        {/* Cert status */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Status do Certificado</span>
          <StatusBadge status={aluno.statusCertificado} />
        </div>
        {aluno.dataEnvio && (
          <p className="text-xs text-gray-400 -mt-3">Certificado enviado em {new Date(aluno.dataEnvio + 'T12:00').toLocaleDateString('pt-BR')}</p>
        )}

        {aluno.certificadoAutorizadoEm && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-1">Assinatura do certificado</p>
            <p className="text-sm text-green-700">
              Autorizado em {formatDateTime(aluno.certificadoAutorizadoEm)}
              {aluno.certificadoAutorizadoPor ? ` por ${aluno.certificadoAutorizadoPor}` : ''}
            </p>
            {aluno.certificadoAssinaturaCodigo && (
              <p className="text-xs font-mono text-green-600 mt-1">{aluno.certificadoAssinaturaCodigo}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
          {aluno.statusCadastro === 'pendente' && (
            <>
              <button
                type="button"
                onClick={() => onAutorizar(aluno, 'statusCadastro')}
                disabled={cadastroProcessing || cadastroRecusaProcessing}
                className="btn-success flex-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cadastroProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {cadastroProcessing ? 'Autorizando...' : 'Autorizar aluno'}
              </button>
              <button
                type="button"
                onClick={() => onRecusar(aluno, 'statusCadastro')}
                disabled={cadastroProcessing || cadastroRecusaProcessing}
                className="btn-danger flex-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cadastroRecusaProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {cadastroRecusaProcessing ? 'Recusando...' : 'Recusar aluno'}
              </button>
            </>
          )}

          {aluno.statusCadastro === 'aprovado' && aluno.statusCertificado === 'pendente' && isPresent && (
            <>
              <button
                type="button"
                onClick={() => onAutorizar(aluno, 'statusCertificado')}
                disabled={certificadoProcessing || certificadoRecusaProcessing}
                className="btn-success flex-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {certificadoProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {certificadoProcessing ? 'Liberando...' : 'Liberar certificado'}
              </button>
              <button
                type="button"
                onClick={() => onRecusar(aluno, 'statusCertificado')}
                disabled={certificadoProcessing || certificadoRecusaProcessing}
                className="btn-danger flex-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {certificadoRecusaProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {certificadoRecusaProcessing ? 'Recusando...' : 'Recusar certificado'}
              </button>
            </>
          )}
          {aluno.statusCadastro === 'aprovado' && aluno.statusCertificado === 'pendente' && !isPresent && (
            <>
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex-1">
                Aguardando presença na chamada para liberar certificado.
              </div>
              <button
                type="button"
                onClick={() => onRecusar(aluno, 'statusCertificado')}
                disabled={certificadoRecusaProcessing}
                className="btn-danger flex-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {certificadoRecusaProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {certificadoRecusaProcessing ? 'Recusando...' : 'Recusar certificado'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-700">{value || '-'}</p>
      </div>
    </div>
  );
}

const manualInitialForm = {
  cursoId: '',
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  empresa: '',
  cargo: '',
  presenca: 100,
  notaProva: 10,
  emitirCertificado: true,
};

function ManualStudentModal({ isOpen, onClose, courses, students, onSubmit, loading }) {
  const [form, setForm] = useState(manualInitialForm);
  const [errors, setErrors] = useState({});
  const [createdStudent, setCreatedStudent] = useState(null);
  const [sequenceCount, setSequenceCount] = useState(0);
  const [step, setStep] = useState('empresa');
  const [companyMode, setCompanyMode] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const activeCourses = courses.filter(course => course.status !== 'inativo');
  const selectedCourse = courses.find(course => String(course.id) === String(form.cursoId));
  const registeredCompanies = useMemo(() => {
    const companyMap = new Map();
    const addCompany = (name, source = 'Sistema') => {
      const normalized = String(name || '').trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (!companyMap.has(key)) {
        companyMap.set(key, { nome: normalized, source, cursos: 0, alunos: 0 });
      }
      const item = companyMap.get(key);
      if (source === 'Curso') item.cursos += 1;
      if (source === 'Aluno') item.alunos += 1;
    };

    courses.forEach(course => addCompany(course.empresaContratante, 'Curso'));
    students.forEach(student => addCompany(student.empresa, 'Aluno'));

    return [...companyMap.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [courses, students]);
  const filteredCompanies = registeredCompanies.filter(company => (
    !companySearch || company.nome.toLowerCase().includes(companySearch.toLowerCase())
  ));

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const resetCompanyStep = () => {
    setStep('empresa');
    setCompanyMode(null);
    setCompanySearch('');
    setForm(manualInitialForm);
    setErrors({});
    setCreatedStudent(null);
    setSequenceCount(0);
  };

  const handleClose = () => {
    if (loading) return;
    resetCompanyStep();
    onClose();
  };

  const chooseRegisteredCompany = (companyName) => {
    setCompanyMode('registered');
    setCompanySearch(companyName);
    setForm(prev => ({ ...prev, empresa: companyName }));
    setErrors(prev => ({ ...prev, empresa: null }));
    setStep('aluno');
  };

  const startManualCompany = () => {
    setCompanyMode('manual');
    setCompanySearch('');
    setForm(prev => ({ ...prev, empresa: '' }));
    setStep('aluno');
  };

  const continueWithTypedCompany = () => {
    const companyName = companySearch.trim();
    if (!companyName) {
      setErrors(prev => ({ ...prev, empresaLookup: 'Digite ou selecione uma empresa.' }));
      return;
    }
    chooseRegisteredCompany(companyName);
  };

  const handleNextSameCourse = () => {
    setForm(prev => ({
      ...manualInitialForm,
      cursoId: prev.cursoId,
      empresa: prev.empresa,
      cargo: prev.cargo,
      presenca: prev.presenca,
      notaProva: prev.notaProva,
      emitirCertificado: prev.emitirCertificado,
    }));
    setErrors({});
    setCreatedStudent(null);
    setStep('aluno');
  };

  const handleSubmit = async () => {
    const required = ['cursoId', 'nome', 'cpf', 'email', 'telefone', 'empresa', 'cargo'];
    const nextErrors = required.reduce((acc, field) => {
      if (!String(form[field] ?? '').trim()) acc[field] = 'Obrigatório';
      return acc;
    }, {});

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const created = await onSubmit({
      ...form,
      presenca: Number(form.presenca || 100),
      notaProva: Number(form.notaProva || 10),
    });
    if (created) {
      setCreatedStudent(created);
      setSequenceCount(prev => prev + 1);
    }
  };

  const input = (field, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={event => updateField(field, event.target.value)}
        placeholder={placeholder}
        className={`input-field ${errors[field] ? 'border-red-300 focus:ring-red-200' : ''}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar aluno manualmente" size="lg">
      {createdStudent ? (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-700 mt-0.5" />
              <div>
                <p className="text-base font-bold text-green-950">Cadastro finalizado</p>
                <p className="text-sm text-green-800 mt-1">
                  {createdStudent.nome} foi cadastrado em {createdStudent.nomeCurso}.
                </p>
                {createdStudent.certificadoAssinaturaCodigo && (
                  <p className="text-xs font-mono text-green-700 mt-2">{createdStudent.certificadoAssinaturaCodigo}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900">Deseja cadastrar mais um aluno neste mesmo curso?</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
              <span><strong className="text-gray-700">Curso:</strong> {selectedCourse?.nomeCurso || createdStudent.nomeCurso}</span>
              <span><strong className="text-gray-700">Local:</strong> {selectedCourse?.local || createdStudent.local}</span>
              <span><strong className="text-gray-700">Empresa:</strong> {form.empresa}</span>
            </div>
            {sequenceCount > 1 && (
              <p className="text-xs text-blue-600 mt-3">{sequenceCount} alunos cadastrados nesta sequência.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Encerrar
            </button>
            <button type="button" onClick={handleNextSameCourse} className="btn-primary">
              <Plus className="w-4 h-4" />
              Cadastrar outro no mesmo curso
            </button>
          </div>
        </div>
      ) : step === 'empresa' ? (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-700 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-950">Primeiro, vamos identificar a empresa contratante</p>
                <p className="text-xs text-blue-700 mt-1">
                  Se ela já apareceu em algum curso ou aluno, o sistema reaproveita o nome e acelera o restante do cadastro.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCompanyMode('registered')}
              className={`text-left rounded-xl border p-4 transition-all ${
                companyMode === 'registered'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              <Search className="w-5 h-5 text-blue-700 mb-3" />
              <p className="text-sm font-bold text-gray-900">Empresa já registrada</p>
              <p className="text-xs text-gray-500 mt-1">Buscar e preencher automaticamente.</p>
            </button>
            <button
              type="button"
              onClick={startManualCompany}
              className={`text-left rounded-xl border p-4 transition-all ${
                companyMode === 'manual'
                  ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                  : 'border-gray-100 hover:border-green-200 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-5 h-5 text-green-700 mb-3" />
              <p className="text-sm font-bold text-gray-900">Nova empresa</p>
              <p className="text-xs text-gray-500 mt-1">Digitar manualmente no próximo passo.</p>
            </button>
          </div>

          {companyMode === 'registered' && (
            <div className="rounded-xl border border-gray-100 p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa</label>
                <input
                  value={companySearch}
                  onChange={event => {
                    setCompanySearch(event.target.value);
                    setErrors(prev => ({ ...prev, empresaLookup: null }));
                  }}
                  placeholder="Digite para buscar..."
                  className={`input-field ${errors.empresaLookup ? 'border-red-300 focus:ring-red-200' : ''}`}
                />
                {errors.empresaLookup && <p className="text-xs text-red-500 mt-1">{errors.empresaLookup}</p>}
              </div>

              <div className="max-h-44 overflow-y-auto space-y-2">
                {filteredCompanies.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Nenhuma empresa encontrada. Você pode continuar com o nome digitado.</p>
                ) : filteredCompanies.slice(0, 8).map(company => (
                  <button
                    key={company.nome}
                    type="button"
                    onClick={() => chooseRegisteredCompany(company.nome)}
                    className="w-full text-left rounded-lg border border-gray-100 px-3 py-2 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-800">{company.nome}</p>
                    <p className="text-xs text-gray-400">
                      {company.cursos} curso(s) e {company.alunos} aluno(s) vinculados
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={continueWithTypedCompany} className="btn-primary">
                  Continuar
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-700 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-950">Cadastro direto com validação</p>
              <p className="text-xs text-blue-700 mt-1">
                Empresa: <strong>{form.empresa || 'preencha no formulário'}</strong>. O aluno entra aprovado, presente e pode receber certificado assinado.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
          <select
            value={form.cursoId}
            onChange={event => updateField('cursoId', event.target.value)}
            className={`input-field ${errors.cursoId ? 'border-red-300 focus:ring-red-200' : ''}`}
          >
            <option value="">Selecione um curso</option>
            {activeCourses.map(course => (
              <option key={course.id} value={course.id}>
                {course.nomeCurso} - {course.data ? new Date(course.data + 'T12:00').toLocaleDateString('pt-BR') : 'sem data'}
              </option>
            ))}
          </select>
          {errors.cursoId && <p className="text-xs text-red-500 mt-1">{errors.cursoId}</p>}
          {selectedCourse && (
            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>{selectedCourse.local}</span>
              <span>{selectedCourse.duracao}</span>
              <span>{selectedCourse.empresaContratante}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {input('nome', 'Nome completo *', 'text', 'Nome do aluno')}
          {input('cpf', 'CPF *', 'text', '000.000.000-00')}
          {input('email', 'E-mail *', 'email', 'aluno@email.com')}
          {input('telefone', 'Telefone *', 'text', '(00) 00000-0000')}
          {input('empresa', 'Empresa *', 'text', 'Empresa do aluno')}
          {input('cargo', 'Cargo/Função *', 'text', 'Função no treinamento')}
          {input('presenca', 'Presença (%)', 'number')}
          {input('notaProva', 'Nota', 'number')}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.emitirCertificado}
            onChange={event => updateField('emitirCertificado', event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-bold text-green-900">Emitir certificado agora</span>
            <span className="block text-xs text-green-700 mt-1">
              Gera código de validação público, assinatura digital e tenta enviar o PDF por e-mail automaticamente.
            </span>
          </span>
        </label>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={resetCompanyStep} disabled={loading} className="btn-secondary disabled:opacity-60">
            Voltar
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Finalizando...' : 'Finalizar cadastro'}
          </button>
        </div>
      </div>
      )}
    </Modal>
  );
}

export default function AlunosPage() {
  const { students, courses, addManualStudent, updateStudentStatus } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCurso, setFilterCurso] = useState('todos');
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [sortField, setSortField] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  const [processing, setProcessing] = useState(null);
  const [manualOpen, setManualOpen] = useState(() => searchParams.get('manual') === '1');
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get('manual') === '1') setManualOpen(true);
  }, [searchParams]);

  const cursos = [...new Set(students.map(s => s.nomeCurso))];

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        s.nome.toLowerCase().includes(q) ||
        s.cpf.includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.empresa.toLowerCase().includes(q) ||
        s.nomeCurso.toLowerCase().includes(q) ||
        s.local.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'todos' || s.statusCadastro === filterStatus;
      const matchCurso = filterCurso === 'todos' || s.nomeCurso === filterCurso;
      return matchSearch && matchStatus && matchCurso;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleAutorizar = async (aluno, field) => {
    setProcessing(`${aluno.id}:${field}`);
    try {
      const updated = await updateStudentStatus(aluno.id, field, 'aprovado');
      if (updated) setSelectedAluno(updated);
    } finally {
      setProcessing(null);
    }
  };

  const handleRecusar = async (aluno, field) => {
    const processingKey = `${aluno.id}:${field}:recusar`;
    const motivo = field === 'statusCadastro'
      ? 'Cadastro recusado após conferência dos dados.'
      : 'Certificado recusado após conferência da chamada.';
    setProcessing(processingKey);
    try {
      const updated = await updateStudentStatus(aluno.id, field, 'recusado', motivo);
      if (updated) setSelectedAluno(updated);
    } finally {
      setProcessing(null);
    }
  };

  const handleManualSubmit = async (payload) => {
    setManualSaving(true);
    try {
      return await addManualStudent(payload);
    } finally {
      setManualSaving(false);
    }
  };

  const openManualModal = () => {
    setManualOpen(true);
    setSearchParams({ manual: '1' });
  };

  const closeManualModal = () => {
    setManualOpen(false);
    if (searchParams.get('manual') === '1') {
      setSearchParams({});
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, e-mail, empresa, curso ou local..."
              className="input-field pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-field sm:w-40"
          >
            <option value="todos">Todos os status</option>
            <option value="aprovado">Aprovado</option>
            <option value="pendente">Pendente</option>
            <option value="recusado">Recusado</option>
          </select>
          <select
            value={filterCurso}
            onChange={e => setFilterCurso(e.target.value)}
            className="input-field sm:w-56"
          >
            <option value="todos">Todos os cursos</option>
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            onClick={openManualModal}
            className="btn-primary justify-center sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Adicionar manual
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', val: students.length, cls: 'text-blue-700 bg-blue-50' },
          { label: 'Aprovados', val: students.filter(s => s.statusCadastro === 'aprovado').length, cls: 'text-green-700 bg-green-50' },
          { label: 'Pendentes', val: students.filter(s => s.statusCadastro === 'pendente').length, cls: 'text-amber-700 bg-amber-50' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`rounded-xl p-3 text-center ${cls.split(' ')[1]}`}>
            <p className={`text-2xl font-bold ${cls.split(' ')[0]}`}>{val}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Lista de Alunos</h3>
          <span className="text-sm text-gray-400">{filtered.length} resultado(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { field: 'nome', label: 'Aluno' },
                  { field: 'nomeCurso', label: 'Curso' },
                  { field: 'empresa', label: 'Empresa' },
                  { field: 'statusCadastro', label: 'Cadastro' },
                  { field: 'statusCertificado', label: 'Certificado' },
                ].map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-gray-700 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-sm font-bold">{s.nome.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                        <p className="text-xs text-gray-400">{s.cpf}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-44 truncate">{s.nomeCurso}</p>
                    <p className="text-xs text-gray-400">{s.data ? new Date(s.data + 'T12:00').toLocaleDateString('pt-BR') : '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-36 truncate">{s.empresa}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.statusCadastro} /></td>
                  <td className="px-4 py-3"><StatusBadge status={s.statusCertificado} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedAluno(s)}
                      className="text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlunoDetalheModal
        aluno={selectedAluno}
        onClose={() => setSelectedAluno(null)}
        onAutorizar={handleAutorizar}
        onRecusar={handleRecusar}
        processing={processing}
      />

      <ManualStudentModal
        isOpen={manualOpen}
        onClose={closeManualModal}
        courses={courses}
        students={students}
        onSubmit={handleManualSubmit}
        loading={manualSaving}
      />
    </div>
  );
}
