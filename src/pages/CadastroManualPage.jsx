import React, { useMemo, useState } from 'react';
import { CheckCircle, Download, Loader2, Mail, Send, UserPlus } from 'lucide-react';
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

export default function CadastroManualPage() {
  const { courses, addManualStudent, refreshData, user } = useApp();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [status, setStatus] = useState(null);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [usarDadosCursoSelecionado, setUsarDadosCursoSelecionado] = useState(true);

  const activeCourses = useMemo(
    () => courses.filter(course => course.status !== 'inativo'),
    [courses],
  );
  const selectedCourse = useMemo(
    () => courses.find(course => String(course.id) === String(form.cursoId)),
    [courses, form.cursoId],
  );

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const required = ['cursoId', 'nome', 'cpf', 'email', 'telefone', 'empresa', 'cargo'];
    if (!usarDadosCursoSelecionado) {
      required.push('dataRealizacao', 'horarioInicioReal', 'localReal');
    }
    const next = {};
    required.forEach((field) => {
      if (!String(form[field] || '').trim()) next[field] = 'Obrigatório';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

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
        data: usarDadosCursoSelecionado ? (selectedCourse?.data || '') : form.dataRealizacao,
        horarioInicio: usarDadosCursoSelecionado ? (selectedCourse?.horarioInicio || '') : form.horarioInicioReal,
        local: usarDadosCursoSelecionado ? (selectedCourse?.local || '') : form.localReal,
        duracao: usarDadosCursoSelecionado ? (selectedCourse?.duracao || '') : (form.duracaoReal || selectedCourse?.duracao || ''),
        periodoInicio: usarDadosCursoSelecionado ? (selectedCourse?.data || '') : form.dataRealizacao,
        periodoFim: usarDadosCursoSelecionado ? (selectedCourse?.data || '') : form.dataRealizacao,
      });
      if (!created) return;
      setCreatedStudent(created);
      setForm(prev => ({
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

  const handleNextSameCourse = () => {
    setCreatedStudent(null);
    setStatus(null);
    setErrors({});
    setForm(prev => ({
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
    <div className="space-y-5">
      <div className="card max-w-5xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Cadastro manual rápido (cursos antigos)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre o aluno, autorize o certificado automaticamente e finalize com impressão ou envio por e-mail.
            </p>
          </div>
        </div>
      </div>

      <div className="card max-w-5xl mx-auto space-y-4">
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
                {course.nomeCurso} - {course.data ? new Date(`${course.data}T12:00`).toLocaleDateString('pt-BR') : 'sem data'}
              </option>
            ))}
          </select>
          {errors.cursoId && <p className="text-xs text-red-500 mt-1">{errors.cursoId}</p>}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={usarDadosCursoSelecionado}
            onChange={event => setUsarDadosCursoSelecionado(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-bold text-blue-900">Usar data/local do curso selecionado</span>
            <span className="block text-xs text-blue-700 mt-1">
              Desmarque para informar a data real de um curso já realizado e emitir o certificado retroativo corretamente.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {input('nome', 'Nome completo *', 'text', 'Nome do aluno')}
          {input('cpf', 'CPF *', 'text', '000.000.000-00')}
          {input('email', 'E-mail *', 'email', 'aluno@email.com')}
          {input('telefone', 'Telefone *', 'text', '(00) 00000-0000')}
          {input('empresa', 'Empresa *', 'text', 'Empresa do aluno')}
          {input('cargo', 'Cargo/Função *', 'text', 'Função no treinamento')}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Cadastrando...' : 'Cadastrar e autorizar certificado'}
          </button>
        </div>

        {createdStudent && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-bold text-green-900">
              {createdStudent.nome} cadastrado com certificado autorizado.
            </p>
            {createdStudent.certificadoAssinaturaCodigo && (
              <p className="text-xs font-mono text-green-700">{createdStudent.certificadoAssinaturaCodigo}</p>
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
                {actionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Imprimir / Baixar PDF
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={actionLoading !== ''}
                className="btn-primary disabled:opacity-60"
              >
                {actionLoading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar por e-mail
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`rounded-xl border p-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
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
