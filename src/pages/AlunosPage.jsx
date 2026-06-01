import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const cursos = aluno.cursos || [];

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
              <StatusBadge status={aluno.statusCadastroGeral} />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem icon={User} label="CPF" value={aluno.cpf} />
          <InfoItem icon={Mail} label="E-mail" value={aluno.email} />
          <InfoItem icon={Phone} label="Telefone" value={aluno.telefone} />
          <InfoItem icon={Building2} label="Empresa" value={aluno.empresa} />
          <InfoItem icon={BookOpen} label="Cursos" value={`${cursos.length} curso(s)`} />
          <InfoItem icon={MapPin} label="Local principal" value={aluno.local || '-'} />
          <InfoItem icon={Calendar} label="Última data" value={aluno.data ? new Date(aluno.data + 'T12:00').toLocaleDateString('pt-BR') : '-'} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Cursos e status</p>
          {cursos.map((curso) => {
            const cadastroProcessing = processing === `${curso.id}:statusCadastro`;
            const certificadoProcessing = processing === `${curso.id}:statusCertificado`;
            const cadastroRecusaProcessing = processing === `${curso.id}:statusCadastro:recusar`;
            const certificadoRecusaProcessing = processing === `${curso.id}:statusCertificado:recusar`;
            const isPresent = curso.presente === true || Number(curso.presenca || 0) >= 75;

            return (
              <div key={curso.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{curso.nomeCurso || '-'}</p>
                    <p className="text-xs text-gray-500">
                      {curso.data ? new Date(curso.data + 'T12:00').toLocaleDateString('pt-BR') : '-'} • {curso.local || 'Local pendente'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={curso.statusCadastro} />
                    <StatusBadge status={curso.statusCertificado} />
                  </div>
                </div>
                {curso.motivoRecusa && (
                  <p className="text-xs text-red-600 mt-2">{curso.motivoRecusa}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {curso.statusCadastro === 'pendente' && (
                    <>
                      <button type="button" onClick={() => onAutorizar(curso, 'statusCadastro')} disabled={cadastroProcessing || cadastroRecusaProcessing} className="btn-success text-xs disabled:opacity-60">
                        {cadastroProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {cadastroProcessing ? 'Autorizando...' : 'Autorizar aluno'}
                      </button>
                      <button type="button" onClick={() => onRecusar(curso, 'statusCadastro')} disabled={cadastroProcessing || cadastroRecusaProcessing} className="btn-danger text-xs disabled:opacity-60">
                        {cadastroRecusaProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        {cadastroRecusaProcessing ? 'Recusando...' : 'Recusar aluno'}
                      </button>
                    </>
                  )}
                  {curso.statusCadastro === 'aprovado' && curso.statusCertificado === 'pendente' && isPresent && (
                    <>
                      <button type="button" onClick={() => onAutorizar(curso, 'statusCertificado')} disabled={certificadoProcessing || certificadoRecusaProcessing} className="btn-success text-xs disabled:opacity-60">
                        {certificadoProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {certificadoProcessing ? 'Liberando...' : 'Liberar certificado'}
                      </button>
                      <button type="button" onClick={() => onRecusar(curso, 'statusCertificado')} disabled={certificadoProcessing || certificadoRecusaProcessing} className="btn-danger text-xs disabled:opacity-60">
                        {certificadoRecusaProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        {certificadoRecusaProcessing ? 'Recusando...' : 'Recusar certificado'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
  data: '',
  horarioInicio: '',
  periodoInicio: '',
  periodoFim: '',
  presenca: 100,
  notaProva: 10,
  emitirCertificado: false,
  cadastroRetroativo: false,
  motivoRetroativo: '',
};

const courseConfirmInitial = {
  cursoId: '',
  local: '',
  data: '',
  duracao: '',
};

const companyInitialForm = {
  nome: '',
  cnpj: '',
  contato: '',
  telefone: '',
  email: '',
};

export function ManualStudentModal({ isOpen, onClose, courses, students, onSubmit, loading, embedded = false }) {
  const { updateStudentProfile } = useApp();
  const [form, setForm] = useState(manualInitialForm);
  const [companyForm, setCompanyForm] = useState(companyInitialForm);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [errors, setErrors] = useState({});
  const [createdStudent, setCreatedStudent] = useState(null);
  const [sequenceCount, setSequenceCount] = useState(0);
  const [step, setStep] = useState('aluno');
  const [companyMode, setCompanyMode] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [registrationMode, setRegistrationMode] = useState('');
  const [batchTarget, setBatchTarget] = useState(2);
  const [batchSaved, setBatchSaved] = useState(0);
  const [batchStarted, setBatchStarted] = useState(false);
  const [batchEntries, setBatchEntries] = useState([]);
  const [editingBatchEntry, setEditingBatchEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({ nome: '', cpf: '' });
  const [companyLocked, setCompanyLocked] = useState(false);
  const [showCourseConfirmModal, setShowCourseConfirmModal] = useState(false);
  const [pendingCourseConfirm, setPendingCourseConfirm] = useState(courseConfirmInitial);
  const [courseConfirmErrors, setCourseConfirmErrors] = useState({});
  const [companyDataConfirmed, setCompanyDataConfirmed] = useState(false);
  const [actionWarning, setActionWarning] = useState('');
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
    if (field === 'cursoId') {
      if (!value) {
        setForm(prev => ({ ...prev, cursoId: '', data: '', horarioInicio: '', periodoInicio: '', periodoFim: '' }));
        setPendingCourseConfirm(courseConfirmInitial);
        setCourseConfirmErrors({});
        setShowCourseConfirmModal(false);
        setErrors(prev => ({ ...prev, cursoId: null }));
        return;
      }

      const course = courses.find(item => String(item.id) === String(value));
      setPendingCourseConfirm({
        cursoId: value,
        local: course?.local || '',
        data: course?.data || '',
        duracao: course?.duracao || '',
      });
      setCourseConfirmErrors({});
      setShowCourseConfirmModal(true);
      setErrors(prev => ({ ...prev, cursoId: null }));
      return;
    }

    setForm(prev => {
      return { ...prev, [field]: value };
    });
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const confirmCourseInfo = () => {
    const nextErrors = {};
    if (!String(pendingCourseConfirm.local || '').trim()) nextErrors.local = 'Informe o local.';
    if (!String(pendingCourseConfirm.data || '').trim()) nextErrors.data = 'Informe a data.';
    if (!String(pendingCourseConfirm.duracao || '').trim()) nextErrors.duracao = 'Informe a duração.';
    if (Object.keys(nextErrors).length > 0) {
      setCourseConfirmErrors(nextErrors);
      return;
    }

    const course = courses.find(item => String(item.id) === String(pendingCourseConfirm.cursoId));
    setForm(prev => ({
      ...prev,
      cursoId: pendingCourseConfirm.cursoId,
      data: pendingCourseConfirm.data || '',
      periodoInicio: pendingCourseConfirm.data || '',
      periodoFim: pendingCourseConfirm.data || '',
      horarioInicio: prev.horarioInicio || course?.horarioInicio || '',
    }));
    setCourseConfirmErrors({});
    setShowCourseConfirmModal(false);
  };

  const cancelCourseInfo = () => {
    const currentCourse = courses.find(item => String(item.id) === String(form.cursoId));
    setPendingCourseConfirm({
      cursoId: form.cursoId || '',
      local: currentCourse?.local || '',
      data: currentCourse?.data || '',
      duracao: currentCourse?.duracao || '',
    });
    setCourseConfirmErrors({});
    setShowCourseConfirmModal(false);
  };

  const getCourseDisplay = (field) => {
    if (!selectedCourse) return '-';
    if (field === 'empresa') return selectedCourse.empresaContratante || 'A definir';
    if (field === 'local') return pendingCourseConfirm.local || selectedCourse.local || '-';
    if (field === 'data') {
      const dateValue = pendingCourseConfirm.data || selectedCourse.data;
      return dateValue ? new Date(`${dateValue}T12:00`).toLocaleDateString('pt-BR') : '-';
    }
    if (field === 'horaDuracao') {
      return `${selectedCourse.horarioInicio || '-'} / ${pendingCourseConfirm.duracao || selectedCourse.duracao || '-'}`;
    }
    return '-';
  };
  const canConfirmCourseInfo = Boolean(
    String(pendingCourseConfirm.local || '').trim() &&
    String(pendingCourseConfirm.data || '').trim() &&
    String(pendingCourseConfirm.duracao || '').trim()
  );

  const updateCompanyField = (field, value) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
    setCompanyDataConfirmed(false);
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const resetCompanyStep = () => {
    setStep('aluno');
    setCompanyMode(null);
    setCompanySearch('');
    setForm(manualInitialForm);
    setCompanyForm(companyInitialForm);
    setCompanyProfile(null);
    setErrors({});
    setCreatedStudent(null);
    setSequenceCount(0);
    setBatchMode(false);
    setRegistrationMode('');
    setBatchTarget(2);
    setBatchSaved(0);
    setBatchStarted(false);
    setBatchEntries([]);
    setEditingBatchEntry(null);
    setEntryForm({ nome: '', cpf: '' });
    setCompanyLocked(false);
    setShowCourseConfirmModal(false);
    setPendingCourseConfirm(courseConfirmInitial);
    setCourseConfirmErrors({});
    setCompanyDataConfirmed(false);
    setActionWarning('');
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
    setCompanyProfile({ nome: companyName, origem: 'registrada' });
    setErrors(prev => ({ ...prev, empresa: null }));
    setStep('aluno');
  };

  const startManualCompany = () => {
    setCompanyMode('manual');
    setCompanySearch('');
    setForm(prev => ({ ...prev, empresa: '' }));
    setCompanyForm(companyInitialForm);
    setCompanyProfile(null);
    setCompanyDataConfirmed(false);
    setErrors({});
    setStep('novaEmpresa');
  };

  const continueWithTypedCompany = () => {
    const companyName = companySearch.trim();
    if (!companyName) {
      setErrors(prev => ({ ...prev, empresaLookup: 'Digite ou selecione uma empresa.' }));
      return;
    }
    chooseRegisteredCompany(companyName);
  };

  const registerNewCompany = () => {
    const companyName = companyForm.nome.trim();
    if (!companyName) {
      setErrors(prev => ({ ...prev, nome: 'Informe o nome da empresa.' }));
      return;
    }

    setForm(prev => ({ ...prev, empresa: companyName }));
    setCompanyProfile({
      ...companyForm,
      nome: companyName,
      origem: 'nova',
    });
    setCompanyDataConfirmed(true);
    setErrors(prev => ({ ...prev, nome: null, companyConfirm: null }));
  };

  const continueWithNewCompany = () => {
    if (!companyDataConfirmed) {
      setErrors(prev => ({ ...prev, companyConfirm: 'Cadastre e confirme a empresa antes de continuar.' }));
      setActionWarning('Para continuar, primeiro clique em "Cadastrar empresa" para confirmar os dados da empresa contratante.');
      return;
    }
    setErrors(prev => ({ ...prev, companyConfirm: null }));
    setStep('aluno');
  };

  const handleNextSameCourse = () => {
    setForm(prev => ({
      ...manualInitialForm,
      cursoId: prev.cursoId,
      empresa: prev.empresa,
      cargo: prev.cargo,
      data: prev.data,
      horarioInicio: prev.horarioInicio,
      periodoInicio: prev.periodoInicio,
      periodoFim: prev.periodoFim,
      presenca: prev.presenca,
      notaProva: prev.notaProva,
      emitirCertificado: prev.emitirCertificado,
    }));
    setErrors({});
    setCreatedStudent(null);
    setStep('aluno');
  };

  const startBatch = () => {
    if (!companyLocked) {
      setErrors(prev => ({ ...prev, empresa: 'Confirme os dados da empresa antes de iniciar o lote.' }));
      setActionWarning('Confirme a empresa contratante antes de iniciar o cadastro em lote.');
      return;
    }
    setBatchStarted(true);
    setBatchSaved(0);
    setBatchEntries([]);
    setCreatedStudent(null);
    setErrors({});
    setForm(prev => ({
      ...prev,
      nome: '',
      cpf: '',
    }));
  };

  const handleSubmit = async () => {
    if (!registrationMode) {
      setErrors(prev => ({ ...prev, registrationMode: 'Selecione Individual ou Lote para continuar.' }));
      setActionWarning('Selecione o modo de cadastro (Individual ou Lote) antes de salvar o aluno.');
      return;
    }

    if (batchMode && !batchStarted) {
      setActionWarning('No modo Lote, clique em "Iniciar lote" antes de cadastrar o aluno.');
      return;
    }

    const required = ['cursoId', 'nome', 'cpf'];
    const nextErrors = required.reduce((acc, field) => {
      if (!String(form[field] ?? '').trim()) acc[field] = 'Obrigatório';
      return acc;
    }, {});

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (form.cadastroRetroativo && !String(form.motivoRetroativo || '').trim()) {
      setErrors(prev => ({ ...prev, motivoRetroativo: 'Informe o motivo para cadastro retroativo.' }));
      return;
    }

    const created = await onSubmit({
      ...form,
      email: '',
      telefone: '',
      cargo: 'Participante',
      empresa: selectedCourse?.empresaContratante || form.empresa || 'A definir',
      local: pendingCourseConfirm.local || selectedCourse?.local || '',
      data: pendingCourseConfirm.data || selectedCourse?.data || '',
      horarioInicio: selectedCourse?.horarioInicio || '',
      periodoInicio: pendingCourseConfirm.data || selectedCourse?.data || '',
      periodoFim: pendingCourseConfirm.data || selectedCourse?.data || '',
      emitirCertificado: false,
      cadastroRetroativo: Boolean(form.cadastroRetroativo),
      motivoRetroativo: String(form.motivoRetroativo || '').trim(),
      presenca: Number(form.presenca || 100),
      notaProva: Number(form.notaProva || 10),
    });
    if (created) {
      const slot = batchSaved + 1;
      setCreatedStudent(created);
      setSequenceCount(prev => prev + 1);
      setBatchSaved(prev => prev + 1);
      if (batchMode && batchStarted) {
        setBatchEntries(prev => ([
          ...prev.filter(item => item.slot !== slot),
          {
            slot,
            id: created.id,
            nome: created.nome,
            cpf: created.cpf,
          },
        ]));
      }
    }
  };

  const openBatchEntry = (entry) => {
    setEditingBatchEntry(entry);
    setEntryForm({ nome: entry.nome || '', cpf: entry.cpf || '' });
  };

  const saveBatchEntry = async () => {
    if (!editingBatchEntry?.id) return;
    const updated = await updateStudentProfile(editingBatchEntry.id, {
      nome: String(entryForm.nome || '').trim(),
      cpf: String(entryForm.cpf || '').trim(),
    });
    if (!updated) return;
    setBatchEntries(prev => prev.map(item => (
      item.id === editingBatchEntry.id
        ? { ...item, nome: updated.nome, cpf: updated.cpf }
        : item
    )));
    setEditingBatchEntry(null);
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

  const companyInput = (field, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={companyForm[field]}
        onChange={event => updateCompanyField(field, event.target.value)}
        placeholder={placeholder}
        className={`input-field ${errors[field] ? 'border-red-300 focus:ring-red-200' : ''}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  const content = (
    <>
      {createdStudent ? (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-700 mt-0.5" />
              <div>
                <p className="text-base font-bold text-green-950">Cadastro finalizado</p>
                <p className="text-sm text-green-800 mt-1">
                  {createdStudent.nome} foi cadastrado em {createdStudent.nomeCurso} e enviado para análise do responsável.
                </p>
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
            {batchMode && (
              <p className="text-xs text-amber-700 mt-2">
                Progresso do lote: {batchSaved}/{batchTarget} aluno(s) confirmado(s).
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={handleClose} className="btn-secondary">
              {batchMode && batchSaved >= batchTarget ? 'Concluir lote' : 'Encerrar'}
            </button>
            {(!batchMode || batchSaved < batchTarget) && (
              <button type="button" onClick={handleNextSameCourse} className="btn-primary">
                <Plus className="w-4 h-4" />
                {batchMode ? 'Confirmar salvo e cadastrar próximo' : 'Cadastrar outro no mesmo curso'}
              </button>
            )}
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
              <p className="text-xs text-gray-500 mt-1">Cadastrar a empresa antes dos alunos.</p>
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
      ) : step === 'novaEmpresa' ? (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-green-700 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-950">Cadastrar empresa contratante</p>
                <p className="text-xs text-green-700 mt-1">
                  Defina primeiro quem contratou o treinamento. Depois o sistema usa essa empresa para todos os alunos desta sequência.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companyInput('nome', 'Nome da empresa *', 'text', 'Ex: Empresa ABC Ltda')}
            {companyInput('cnpj', 'CNPJ', 'text', '00.000.000/0000-00')}
            {companyInput('contato', 'Contato responsável', 'text', 'Nome do contato')}
            {companyInput('telefone', 'Telefone da empresa', 'text', '(00) 00000-0000')}
            <div className="sm:col-span-2">
              {companyInput('email', 'E-mail da empresa', 'email', 'empresa@email.com')}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900">Próximo passo</p>
            <p className="text-xs text-amber-800 mt-1">
              Depois de confirmar a empresa, você escolhe o curso e cadastra os alunos. Ao cadastrar outro aluno, estes dados permanecem salvos na sequência.
            </p>
          </div>

          {companyDataConfirmed && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-800">
              Empresa confirmada com sucesso. Agora você já pode continuar para o cadastro dos alunos.
            </div>
          )}
          {errors.companyConfirm && <p className="text-xs text-red-500">{errors.companyConfirm}</p>}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={resetCompanyStep} className="btn-secondary">
              Voltar
            </button>
            <button type="button" onClick={registerNewCompany} className="btn-secondary">
              Cadastrar empresa
            </button>
            <button
              type="button"
              onClick={continueWithNewCompany}
              className="btn-primary"
            >
              Continuar para alunos
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-700 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-950">Cadastro rápido para análise</p>
              <p className="text-xs text-blue-700 mt-1">
                Cadastre apenas os dados mínimos. O certificado será liberado somente após aprovação do responsável.
              </p>
              {companyProfile?.origem === 'nova' && (
                <p className="text-xs text-blue-600 mt-1">
                  {companyProfile.cnpj ? `CNPJ ${companyProfile.cnpj}` : 'Nova empresa'}{companyProfile.contato ? ` - contato: ${companyProfile.contato}` : ''}
                </p>
              )}
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"><strong className="text-gray-700">Empresa:</strong> {getCourseDisplay('empresa')}</div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"><strong className="text-gray-700">Local:</strong> {getCourseDisplay('local')}</div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"><strong className="text-gray-700">Data:</strong> {getCourseDisplay('data')}</div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"><strong className="text-gray-700">Hora/Duração:</strong> {getCourseDisplay('horaDuracao')}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {registrationMode && input('nome', 'Nome completo *', 'text', 'Nome do aluno')}
          {registrationMode && input('cpf', 'CPF *', 'text', '000.000.000-00')}
        </div>

        {registrationMode && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={Boolean(form.cadastroRetroativo)}
                onChange={(event) => updateField('cadastroRetroativo', event.target.checked)}
              />
              Cadastro retroativo (curso realizado em data anterior)
            </label>
            {form.cadastroRetroativo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do retroativo *</label>
                <textarea
                  value={form.motivoRetroativo || ''}
                  onChange={(event) => updateField('motivoRetroativo', event.target.value)}
                  className={`input-field min-h-24 ${errors.motivoRetroativo ? 'border-red-300 focus:ring-red-200' : ''}`}
                  placeholder="Ex: turma antiga de 2025 para emissão de certificado após conferência."
                />
                {errors.motivoRetroativo && <p className="text-xs text-red-500 mt-1">{errors.motivoRetroativo}</p>}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gray-900">Empresa contratante</p>
              <p className="text-xs text-gray-500">Confirme os dados da empresa para liberar o cadastro dos alunos.</p>
            </div>
            {companyLocked && <span className="badge-green">Confirmada</span>}
          </div>
          {!companyLocked ? (
            <div className="space-y-2">
              <select
                value={form.empresa}
                onChange={(event) => {
                  updateField('empresa', event.target.value);
                  setErrors(prev => ({ ...prev, empresa: null }));
                }}
                className={`input-field ${errors.empresa ? 'border-red-300 focus:ring-red-200' : ''}`}
              >
                <option value="">Selecione a empresa do curso</option>
                {registeredCompanies.map(company => (
                  <option key={company.nome} value={company.nome}>{company.nome}</option>
                ))}
                {selectedCourse?.empresaContratante && !registeredCompanies.some(item => item.nome === selectedCourse.empresaContratante) && (
                  <option value={selectedCourse.empresaContratante}>{selectedCourse.empresaContratante}</option>
                )}
              </select>
              {errors.empresa && <p className="text-xs text-red-500">{errors.empresa}</p>}
              <div className="flex justify-between items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={startManualCompany}
                >
                  Cadastrar empresa
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    if (!String(form.empresa || '').trim()) {
                      setErrors(prev => ({ ...prev, empresa: 'Selecione a empresa antes de confirmar.' }));
                      return;
                    }
                    setCompanyLocked(true);
                  }}
                >
                  Confirmar empresa
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-sm flex items-center justify-between">
              <span><strong>Empresa:</strong> {form.empresa}</span>
              <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => setCompanyLocked(false)}>
                Alterar
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Modo de cadastro</p>
              <p className="text-xs text-gray-500">Escolha individual ou lote (sequencial).</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!companyLocked}
                onClick={() => {
                  setRegistrationMode('individual');
                  setErrors(prev => ({ ...prev, registrationMode: null }));
                  setBatchMode(false);
                  setBatchStarted(false);
                  setBatchSaved(0);
                  setBatchEntries([]);
                }}
                className={`btn-secondary text-xs disabled:opacity-50 ${registrationMode === 'individual' ? 'ring-2 ring-blue-100' : ''}`}
              >
                Individual
              </button>
              <button
                type="button"
                disabled={!companyLocked}
                onClick={() => {
                  setRegistrationMode('lote');
                  setErrors(prev => ({ ...prev, registrationMode: null }));
                  setBatchMode(true);
                }}
                className={`btn-secondary text-xs disabled:opacity-50 ${registrationMode === 'lote' ? 'ring-2 ring-blue-100' : ''}`}
              >
                Lote
              </button>
            </div>
          </div>
          {errors.registrationMode && (
            <p className="mt-2 text-xs text-red-500">{errors.registrationMode}</p>
          )}
          {registrationMode === 'lote' && (
            <div className="mt-3 space-y-3">
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade de alunos no lote</label>
                <input
                  type="number"
                  min="2"
                  value={batchTarget}
                  onChange={(event) => setBatchTarget(Math.max(2, Number(event.target.value || 2)))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      startBatch();
                    }
                  }}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={startBatch}>
                  Iniciar lote
                </button>
                {batchStarted && (
                  <span className="text-xs text-blue-700 self-center">
                    Preenchendo aluno {Math.min(batchSaved + 1, batchTarget)} de {batchTarget}
                  </span>
                )}
              </div>

              {batchStarted && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Array.from({ length: batchTarget }).map((_, index) => {
                    const number = index + 1;
                    const entry = batchEntries.find(item => item.slot === number);
                    const saved = Boolean(entry);
                    const current = number === Math.min(batchSaved + 1, batchTarget) && batchSaved < batchTarget;
                    return (
                      <button
                        type="button"
                        key={`slot-${number}`}
                        onClick={() => entry && openBatchEntry(entry)}
                        disabled={!entry}
                        className={`rounded-lg border px-2 py-1 text-xs text-center ${
                          saved
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : current
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-green-50 border-green-200 text-green-700'
                        }`}
                      >
                        {saved ? `${number}. ${String(entry.nome || '').split(' ')[0]}` : `Aluno ${number}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={resetCompanyStep} disabled={loading} className="btn-secondary disabled:opacity-60">
            Voltar
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Finalizando...' : 'Cadastrar aluno para análise'}
          </button>
        </div>
      </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="card max-w-5xl mx-auto">
        {content}
      </div>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar aluno manualmente" size="lg">
        {content}
      </Modal>
      <Modal isOpen={!!actionWarning} onClose={() => setActionWarning('')} title="Atenção" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{actionWarning}</p>
          <div className="flex justify-end">
            <button type="button" className="btn-primary text-sm" onClick={() => setActionWarning('')}>
              Entendi
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={showCourseConfirmModal}
        onClose={cancelCourseInfo}
        title="Confirmar dados do curso"
        size="sm"
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
            Confirme os dados do treinamento antes de continuar com o cadastro dos alunos.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input
              value={pendingCourseConfirm.local}
              onChange={(event) => {
                setPendingCourseConfirm(prev => ({ ...prev, local: event.target.value }));
                setCourseConfirmErrors(prev => ({ ...prev, local: null }));
              }}
              className={`input-field ${courseConfirmErrors.local ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="Local do treinamento"
            />
            {courseConfirmErrors.local && <p className="text-xs text-red-500 mt-1">{courseConfirmErrors.local}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={pendingCourseConfirm.data}
              onChange={(event) => {
                setPendingCourseConfirm(prev => ({ ...prev, data: event.target.value }));
                setCourseConfirmErrors(prev => ({ ...prev, data: null }));
              }}
              className={`input-field ${courseConfirmErrors.data ? 'border-red-300 focus:ring-red-200' : ''}`}
            />
            {courseConfirmErrors.data && <p className="text-xs text-red-500 mt-1">{courseConfirmErrors.data}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duração</label>
            <input
              value={pendingCourseConfirm.duracao}
              onChange={(event) => {
                setPendingCourseConfirm(prev => ({ ...prev, duracao: event.target.value }));
                setCourseConfirmErrors(prev => ({ ...prev, duracao: null }));
              }}
              className={`input-field ${courseConfirmErrors.duracao ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="Ex: 8 horas"
            />
            {courseConfirmErrors.duracao && <p className="text-xs text-red-500 mt-1">{courseConfirmErrors.duracao}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelCourseInfo} className="btn-secondary text-sm">Cancelar</button>
            <button
              type="button"
              onClick={confirmCourseInfo}
              disabled={!canConfirmCourseInfo}
              className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Confirmar dados
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!editingBatchEntry} onClose={() => setEditingBatchEntry(null)} title={`Aluno ${editingBatchEntry?.slot || ''} - revisar dados`} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input value={entryForm.nome} onChange={(event) => setEntryForm(prev => ({ ...prev, nome: event.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input value={entryForm.cpf} onChange={(event) => setEntryForm(prev => ({ ...prev, cpf: event.target.value }))} className="input-field" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingBatchEntry(null)} className="btn-secondary text-sm">Cancelar</button>
            <button type="button" onClick={saveBatchEntry} className="btn-primary text-sm">Salvar alteração</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function AlunosPage() {
  const { students, updateStudentStatus } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCurso, setFilterCurso] = useState('todos');
  const [quickFilter, setQuickFilter] = useState('todos');
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [sortField, setSortField] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  const [processing, setProcessing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const monthQuery = String(searchParams.get('mes') || '').trim().toLowerCase();
  const monthMap = {
    jan: 1, janeiro: 1,
    fev: 2, fevereiro: 2,
    mar: 3, marco: 3, março: 3,
    abr: 4, abril: 4,
    mai: 5, maio: 5,
    jun: 6, junho: 6,
    jul: 7, julho: 7,
    ago: 8, agosto: 8,
    set: 9, setembro: 9,
    out: 10, outubro: 10,
    nov: 11, novembro: 11,
    dez: 12, dezembro: 12,
  };
  const monthNumber = monthMap[monthQuery] || null;
  const matchesMonth = (value) => {
    if (!monthNumber) return true;
    if (!value) return false;
    const raw = String(value);
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getMonth() + 1 === monthNumber;
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return Number(br[2]) === monthNumber;
    return false;
  };
  useEffect(() => {
    if (!monthNumber) return;
    setQuickFilter('todos');
  }, [monthNumber]);

  const cursos = [...new Set(students.map(s => s.nomeCurso).filter(Boolean))];

  const filteredRecords = students
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
      const matchQuick = (
        quickFilter === 'todos' ||
        (quickFilter === 'pendencias' && (s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente')) ||
        (quickFilter === 'cert-pronto' && s.statusCertificado === 'aprovado' && !s.certificadoEnviado) ||
        (quickFilter === 'sem-email' && !String(s.email || '').trim()) ||
        (quickFilter === 'recusados' && (s.statusCadastro === 'recusado' || s.statusCertificado === 'recusado'))
      );
      const matchMonth = matchesMonth(s.data || s.periodoFim || s.periodoInicio || s.createdAt);
      return matchSearch && matchStatus && matchCurso && matchQuick && matchMonth;
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

  const groupedStudents = useMemo(() => {
    const groups = new Map();
    filteredRecords.forEach((item) => {
      const key = String(item.cpf || item.id || '').trim() || String(item.id);
      if (!groups.has(key)) {
        groups.set(key, {
          id: item.id,
          cpf: item.cpf,
          nome: item.nome,
          email: item.email,
          telefone: item.telefone,
          empresa: item.empresa,
          cargo: item.cargo,
          local: item.local,
          data: item.data,
          cursos: [],
        });
      }
      groups.get(key).cursos.push(item);
    });
    const aggregate = (arr, field) => {
      if (arr.some((x) => x[field] === 'pendente')) return 'pendente';
      if (arr.some((x) => x[field] === 'recusado')) return 'recusado';
      return 'aprovado';
    };
    return [...groups.values()].map((group) => ({
      ...group,
      cursosCount: group.cursos.length,
      statusCadastroGeral: aggregate(group.cursos, 'statusCadastro'),
      statusCertificadoGeral: aggregate(group.cursos, 'statusCertificado'),
      cursosAprovados: group.cursos.filter((c) => c.statusCertificado === 'aprovado').length,
      cursosPendentes: group.cursos.filter((c) => c.statusCertificado === 'pendente').length,
    }))
      .sort((a, b) => {
        let va = a[sortField] ?? '';
        let vb = b[sortField] ?? '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [filteredRecords, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const toggleSelected = (studentId) => {
    const id = String(studentId);
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };
  const approvedVisibleIds = filteredRecords
    .filter(item => item.statusCertificado === 'aprovado')
    .map(item => String(item.id));
  const toggleSelectApprovedVisible = () => {
    const allSelected = approvedVisibleIds.length > 0 && approvedVisibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => (
      allSelected
        ? prev.filter(id => !approvedVisibleIds.includes(id))
        : [...new Set([...prev, ...approvedVisibleIds])]
    ));
  };
  const goToCertificadosWithSelected = () => {
    if (selectedIds.length === 0) return;
    const params = new URLSearchParams();
    params.set('ids', selectedIds.join(','));
    if (monthQuery) params.set('mes', monthQuery);
    navigate(`/certificados?${params.toString()}`);
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

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card">
        {monthNumber && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-700">Filtro do dashboard ativo: mês <strong>{monthQuery}</strong></p>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('mes');
                setSearchParams(next);
              }}
              className="text-xs text-blue-700 hover:underline"
            >
              Limpar filtro
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pendencias', label: 'Pendências' },
            { id: 'cert-pronto', label: 'Certificado pronto' },
            { id: 'sem-email', label: 'Sem e-mail' },
            { id: 'recusados', label: 'Recusados' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuickFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                quickFilter === item.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar aluno, CPF, e-mail, empresa, curso..."
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
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total (alunos únicos)', val: groupedStudents.length, cls: 'text-blue-700 bg-blue-50' },
          { label: 'Aprovados', val: groupedStudents.filter(s => s.statusCadastroGeral === 'aprovado').length, cls: 'text-green-700 bg-green-50' },
          { label: 'Pendentes', val: groupedStudents.filter(s => s.statusCadastroGeral === 'pendente').length, cls: 'text-amber-700 bg-amber-50' },
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectApprovedVisible}
              className="btn-secondary text-xs"
            >
              {approvedVisibleIds.length > 0 && approvedVisibleIds.every(id => selectedIds.includes(id))
                ? 'Limpar aprovados'
                : 'Selecionar aprovados'}
            </button>
            <button
              type="button"
              onClick={goToCertificadosWithSelected}
              disabled={selectedIds.length === 0}
              className="btn-primary text-xs disabled:opacity-60"
            >
              <Mail className="w-3 h-3" />
              Enviar selecionados ({selectedIds.length})
            </button>
            <span className="text-sm text-gray-400">{groupedStudents.length} aluno(s)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Sel.</th>
                {[
                  { field: 'nome', label: 'Aluno' },
                  { field: 'cursosCount', label: 'Cursos' },
                  { field: 'empresa', label: 'Empresa' },
                  { field: 'statusCadastroGeral', label: 'Cadastro' },
                  { field: 'statusCertificadoGeral', label: 'Certificado' },
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
              {groupedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : groupedStudents.map(s => (
                <tr key={s.cpf || s.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={s.cursos.filter((c) => c.statusCertificado === 'aprovado').every((c) => selectedIds.includes(String(c.id))) && s.cursos.some((c) => c.statusCertificado === 'aprovado')}
                      onChange={() => {
                        const ids = s.cursos.filter((c) => c.statusCertificado === 'aprovado').map((c) => String(c.id));
                        const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
                        setSelectedIds((prev) => allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
                      }}
                      disabled={!s.cursos.some((c) => c.statusCertificado === 'aprovado')}
                    />
                  </td>
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
                    <p className="text-sm text-gray-700">{s.cursosCount} curso(s)</p>
                    <p className="text-xs text-gray-400">{s.cursosAprovados} aprovado(s) • {s.cursosPendentes} pendente(s)</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-36 truncate">{s.empresa}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.statusCadastroGeral} /></td>
                  <td className="px-4 py-3"><StatusBadge status={s.statusCertificadoGeral} /></td>
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

    </div>
  );
}
