import { CheckCircle, Download, Loader2, Mail, Search, Send, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const initialForm = {
  cursoId: '',
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  empresa: '',
  cargo: '',
  dataRealizacao: '',
  horarioInicioReal: '',
  localReal: '',
  duracaoReal: '',
};

function triggerDownload(blob, filename = 'certificado.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeCpf(value = '') {
  return String(value).replace(/\D/g, '');
}

export default function CadastroManualPage() {
  const { courses, students, addManualStudent, refreshData, user } = useApp();
  const [mode, setMode] = useState('quick');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [status, setStatus] = useState(null);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [createdBatch, setCreatedBatch] = useState([]);
  const [batchText, setBatchText] = useState('');
  const [usarDadosCursoSelecionado, setUsarDadosCursoSelecionado] = useState(true);
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedCpfs, setSelectedCpfs] = useState([]);

  const activeCourses = useMemo(
    () => courses.filter((course) => course.status !== 'inativo'),
    [courses],
  );
  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === String(form.cursoId)),
    [courses, form.cursoId],
  );

  const existingStudents = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const cpfKey = normalizeCpf(student.cpf);
      if (!cpfKey) return;
      const current = map.get(cpfKey);
      const currentTime = current?.inscritoEm ? Date.parse(current.inscritoEm) : 0;
      const nextTime = student?.inscritoEm ? Date.parse(student.inscritoEm) : 0;
      if (!current || nextTime >= currentTime) {
        map.set(cpfKey, student);
      }
    });
    return [...map.values()].sort((a, b) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'),
    );
  }, [students]);

  const filteredExisting = useMemo(() => {
    const term = String(existingSearch || '')
      .trim()
      .toLowerCase();
    if (!term) return existingStudents;
    return existingStudents.filter(
      (item) =>
        String(item.nome || '')
          .toLowerCase()
          .includes(term) ||
        String(item.cpf || '')
          .toLowerCase()
          .includes(term) ||
        String(item.empresa || '')
          .toLowerCase()
          .includes(term),
    );
  }, [existingSearch, existingStudents]);

  const selectedExistingStudents = useMemo(() => {
    const selectedSet = new Set(selectedCpfs);
    return existingStudents.filter((item) => selectedSet.has(normalizeCpf(item.cpf)));
  }, [existingStudents, selectedCpfs]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const runtimeFields = () => ({
    data: usarDadosCursoSelecionado ? selectedCourse?.data || '' : form.dataRealizacao,
    horarioInicio: usarDadosCursoSelecionado
      ? selectedCourse?.horarioInicio || ''
      : form.horarioInicioReal,
    local: usarDadosCursoSelecionado ? selectedCourse?.local || '' : form.localReal,
    duracao: usarDadosCursoSelecionado
      ? selectedCourse?.duracao || ''
      : form.duracaoReal || selectedCourse?.duracao || '',
    periodoInicio: usarDadosCursoSelecionado ? selectedCourse?.data || '' : form.dataRealizacao,
    periodoFim: usarDadosCursoSelecionado ? selectedCourse?.data || '' : form.dataRealizacao,
  });

  const validate = () => {
    const required =
      mode === 'quick'
        ? ['cursoId', 'nome', 'cpf']
        : ['cursoId', 'nome', 'cpf', 'email', 'telefone', 'empresa', 'cargo'];
    if (!usarDadosCursoSelecionado)
      required.push('dataRealizacao', 'horarioInicioReal', 'localReal');
    const next = {};
    required.forEach((field) => {
      if (!String(form[field] || '').trim()) next[field] = 'Obrigatório';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const parseBatchRows = () =>
    String(batchText || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cols = line.includes('\t') ? line.split('\t') : line.split(';');
        return {
          nome: String(cols[0] || '').trim(),
          cpf: String(cols[1] || '').trim(),
          email: String(cols[2] || '').trim(),
          telefone: String(cols[3] || '').trim(),
          cargo: String(cols[4] || '').trim(),
        };
      });

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    setStatus(null);
    try {
      const created = await addManualStudent({
        ...form,
        emitirCertificado: true,
        presenca: 100,
        notaProva: 10,
        ...runtimeFields(),
      });
      if (!created) return;
      setCreatedStudent(created);
      setForm((prev) => ({
        ...initialForm,
        cursoId: prev.cursoId,
        empresa: prev.empresa,
        cargo: prev.cargo,
        dataRealizacao: prev.dataRealizacao,
        horarioInicioReal: prev.horarioInicioReal,
        localReal: prev.localReal,
        duracaoReal: prev.duracaoReal,
      }));
      setStatus({ type: 'success', text: 'Aluno cadastrado e certificado autorizado.' });
      await refreshData();
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível cadastrar o aluno.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBatch = async () => {
    const required = ['cursoId'];
    const nextErrors = {};
    required.forEach((field) => {
      if (!String(form[field] || '').trim()) nextErrors[field] = 'Obrigatório';
    });
    const rows = parseBatchRows();
    if (!rows.length) nextErrors.batch = 'Informe pelo menos 1 aluno no bloco de importação.';
    const invalid = rows.find((row) => !row.nome || !row.cpf);
    if (invalid)
      nextErrors.batch = 'Cada linha precisa no mínimo: Nome;CPF (demais colunas opcionais).';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setStatus(null);
    setCreatedBatch([]);
    try {
      const created = [];
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        const student = await addManualStudent({
          ...form,
          ...row,
          emitirCertificado: true,
          presenca: 100,
          notaProva: 10,
          ...runtimeFields(),
        });
        if (student) created.push(student);
      }
      setCreatedBatch(created);
      setStatus({
        type: created.length ? 'success' : 'error',
        text: created.length
          ? `${created.length} aluno(s) cadastrados e certificados autorizados.`
          : 'Nenhum aluno foi cadastrado. Verifique os dados.',
      });
      if (created.length) setBatchText('');
      await refreshData();
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível cadastrar em lote.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectedCpf = (cpf) => {
    const key = normalizeCpf(cpf);
    if (!key) return;
    setSelectedCpfs((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleSelectAllFiltered = () => {
    const keys = filteredExisting.map((item) => normalizeCpf(item.cpf)).filter(Boolean);
    setSelectedCpfs(keys);
  };

  const handleClearSelection = () => {
    setSelectedCpfs([]);
  };

  const handleCreateFromExisting = async () => {
    const nextErrors = {};
    if (!String(form.cursoId || '').trim()) nextErrors.cursoId = 'Obrigatório';
    if (selectedExistingStudents.length === 0)
      nextErrors.existing = 'Selecione pelo menos 1 aluno.';
    if (!usarDadosCursoSelecionado) {
      ['dataRealizacao', 'horarioInicioReal', 'localReal'].forEach((field) => {
        if (!String(form[field] || '').trim()) nextErrors[field] = 'Obrigatório';
      });
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setStatus(null);
    setCreatedBatch([]);
    try {
      const created = [];
      for (const source of selectedExistingStudents) {
        // eslint-disable-next-line no-await-in-loop
        const student = await addManualStudent({
          cursoId: form.cursoId,
          nome: source.nome,
          cpf: source.cpf,
          email: source.email || '',
          telefone: source.telefone || '',
          empresa: source.empresa || form.empresa || '',
          cargo: source.cargo || 'Participante',
          emitirCertificado: true,
          presenca: 100,
          notaProva: 10,
          ...runtimeFields(),
        });
        if (student) created.push(student);
      }
      setCreatedBatch(created);
      setStatus({
        type: created.length ? 'success' : 'error',
        text: created.length
          ? `${created.length} aluno(s) reaproveitados e vinculados ao curso.`
          : 'Nenhum aluno foi vinculado. Verifique duplicidade de CPF no curso.',
      });
      if (created.length) setSelectedCpfs([]);
      await refreshData();
    } catch (error) {
      setStatus({
        type: 'error',
        text: error?.message || 'Não foi possível vincular os alunos selecionados.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNextSameCourse = () => {
    setCreatedStudent(null);
    setStatus(null);
    setErrors({});
    setForm((prev) => ({
      ...initialForm,
      cursoId: prev.cursoId,
      empresa: prev.empresa,
      cargo: prev.cargo,
    }));
  };

  const handleDownloadCertificate = async () => {
    if (!createdStudent?.id) return;
    setActionLoading('download');
    setStatus(null);
    try {
      const result = await api.downloadCertificatePdf(createdStudent.id);
      triggerDownload(result.blob, result.filename || `certificado-${createdStudent.nome}.pdf`);
      setStatus({ type: 'success', text: 'Certificado gerado para impressão/download.' });
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível gerar o certificado.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleSendEmail = async () => {
    if (!createdStudent?.id) return;
    setActionLoading('email');
    setStatus(null);
    try {
      await api.exportCertificates({
        studentIds: [String(createdStudent.id)],
        action: 'email',
        signatureType: 'digital',
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      setStatus({ type: 'success', text: 'Certificado enviado por e-mail.' });
      await refreshData();
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível enviar por e-mail.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleBatchCertificates = async (action) => {
    if (!createdBatch.length) return;
    setActionLoading(action);
    setStatus(null);
    try {
      const result = await api.exportCertificates({
        studentIds: createdBatch.map((item) => String(item.id)),
        action,
        signatureType: 'digital',
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      if (action === 'pdf') {
        triggerDownload(result.blob, result.filename || 'certificados.zip');
        setStatus({ type: 'success', text: 'ZIP/PDF dos certificados gerado com sucesso.' });
      } else {
        setStatus({ type: 'success', text: 'Envio de certificados por e-mail concluído.' });
      }
      await refreshData();
    } catch (error) {
      setStatus({
        type: 'error',
        text: error?.message || 'Não foi possível processar os certificados em lote.',
      });
    } finally {
      setActionLoading('');
    }
  };

  const input = (field, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={placeholder}
        className={`input-field ${errors[field] ? 'border-red-300 focus:ring-red-200' : ''}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="card max-w-5xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Cadastro manual rápido (cursos antigos)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Fluxo rápido para emitir certificado: nome+CPF ou seleção em lote de alunos já
              cadastrados.
            </p>
          </div>
        </div>
      </div>

      <div className="card max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={mode === 'quick' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            Rápido (nome + CPF)
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={mode === 'existing' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            Selecionar alunos já cadastrados
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={mode === 'batch' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            Colar lote (texto/Excel)
          </button>
          <button
            type="button"
            onClick={() => setMode('complete')}
            className={mode === 'complete' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            Cadastro completo
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
          <select
            value={form.cursoId}
            onChange={(event) => updateField('cursoId', event.target.value)}
            className={`input-field ${errors.cursoId ? 'border-red-300 focus:ring-red-200' : ''}`}
          >
            <option value="">Selecione um curso</option>
            {activeCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.nomeCurso} -{' '}
                {course.data
                  ? new Date(`${course.data}T12:00`).toLocaleDateString('pt-BR')
                  : 'sem data'}
              </option>
            ))}
          </select>
          {errors.cursoId && <p className="text-xs text-red-500 mt-1">{errors.cursoId}</p>}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={usarDadosCursoSelecionado}
            onChange={(event) => setUsarDadosCursoSelecionado(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-bold text-blue-900">
              Usar data/local do curso selecionado
            </span>
            <span className="block text-xs text-blue-700 mt-1">
              Desmarque para informar a data real de um curso já realizado e emitir o certificado
              retroativo corretamente.
            </span>
          </span>
        </label>

        {!usarDadosCursoSelecionado && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900 mb-3">Dados reais da realização</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {input('dataRealizacao', 'Data real do curso *', 'date')}
              {input('horarioInicioReal', 'Horário real de início *', 'time')}
              {input('localReal', 'Local real do curso *', 'text', 'Ex: Unidade da empresa')}
              {input('duracaoReal', 'Duração (opcional)', 'text', 'Ex: 8 horas')}
            </div>
          </div>
        )}

        {mode === 'quick' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {input('nome', 'Nome completo *', 'text', 'Nome do aluno')}
            {input('cpf', 'CPF *', 'text', '000.000.000-00')}
            {input('empresa', 'Empresa (opcional)', 'text', 'Se vazio: A definir')}
          </div>
        )}

        {mode === 'complete' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {input('nome', 'Nome completo *', 'text', 'Nome do aluno')}
            {input('cpf', 'CPF *', 'text', '000.000.000-00')}
            {input('email', 'E-mail *', 'email', 'aluno@email.com')}
            {input('telefone', 'Telefone *', 'text', '(00) 00000-0000')}
            {input('empresa', 'Empresa *', 'text', 'Empresa do aluno')}
            {input('cargo', 'Cargo/Função *', 'text', 'Função no treinamento')}
          </div>
        )}

        {mode === 'batch' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {input('empresa', 'Empresa (opcional)', 'text', 'Se vazio: A definir')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alunos em lote</label>
              <textarea
                value={batchText}
                onChange={(event) => {
                  setBatchText(event.target.value);
                  setErrors((prev) => ({ ...prev, batch: null }));
                }}
                rows={8}
                className={`input-field resize-y ${errors.batch ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder={
                  '1 aluno por linha no formato:\nNome;CPF;Email;Telefone;Cargo\n\nPara ultra-rápido também aceita só:\nNome;CPF'
                }
              />
              {errors.batch && <p className="text-xs text-red-500 mt-1">{errors.batch}</p>}
            </div>
          </div>
        )}

        {mode === 'existing' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {input(
                'empresa',
                'Empresa padrão (opcional)',
                'text',
                'Usa a empresa do aluno quando existir',
              )}
            </div>
            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={existingSearch}
                    onChange={(event) => setExistingSearch(event.target.value)}
                    placeholder="Buscar por nome, CPF ou empresa..."
                    className="input-field pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="btn-secondary text-sm"
                  >
                    Selecionar filtrados
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="btn-secondary text-sm"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-auto divide-y divide-gray-100">
                {filteredExisting.map((item) => {
                  const cpfKey = normalizeCpf(item.cpf);
                  const checked = selectedCpfs.includes(cpfKey);
                  return (
                    <label
                      key={cpfKey}
                      className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectedCpf(item.cpf)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          {item.nome}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {item.cpf} {item.empresa ? `• ${item.empresa}` : ''}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                {selectedCpfs.length} aluno(s) selecionado(s).
              </p>
              {errors.existing && <p className="text-xs text-red-500">{errors.existing}</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          {(mode === 'quick' || mode === 'complete') && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {saving ? 'Cadastrando...' : 'Cadastrar e autorizar certificado'}
            </button>
          )}
          {mode === 'batch' && (
            <button
              type="button"
              onClick={handleCreateBatch}
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {saving ? 'Processando lote...' : 'Cadastrar lote e autorizar certificados'}
            </button>
          )}
          {mode === 'existing' && (
            <button
              type="button"
              onClick={handleCreateFromExisting}
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {saving ? 'Vinculando...' : 'Vincular selecionados e autorizar certificados'}
            </button>
          )}
        </div>

        {createdStudent && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-bold text-green-900">
              {createdStudent.nome} cadastrado com certificado autorizado.
            </p>
            {createdStudent.certificadoAssinaturaCodigo && (
              <p className="text-xs font-mono text-green-700">
                {createdStudent.certificadoAssinaturaCodigo}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleNextSameCourse}
                disabled={actionLoading !== ''}
                className="btn-secondary disabled:opacity-60"
              >
                Cadastrar próximo no mesmo curso
              </button>
              <button
                type="button"
                onClick={handleDownloadCertificate}
                disabled={actionLoading !== ''}
                className="btn-secondary disabled:opacity-60"
              >
                {actionLoading === 'download' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Imprimir / Baixar PDF
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={actionLoading !== ''}
                className="btn-primary disabled:opacity-60"
              >
                {actionLoading === 'email' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Enviar por e-mail
              </button>
            </div>
          </div>
        )}

        {createdBatch.length > 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-bold text-blue-900">
              {createdBatch.length} aluno(s) criados neste lote.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleBatchCertificates('pdf')}
                disabled={actionLoading !== ''}
                className="btn-secondary disabled:opacity-60"
              >
                {actionLoading === 'pdf' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Baixar certificados (PDF/ZIP)
              </button>
              <button
                type="button"
                onClick={() => handleBatchCertificates('email')}
                disabled={actionLoading !== ''}
                className="btn-primary disabled:opacity-60"
              >
                {actionLoading === 'email' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Enviar todos por e-mail
              </button>
            </div>
          </div>
        )}

        {status && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {status.type === 'success' ? <Send className="w-4 h-4" /> : null}
              <p>{status.text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
