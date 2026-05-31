import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Award, ClipboardCheck, QrCode,
  AlertTriangle, CheckCircle, Clock,
  ArrowRight, BookOpen, UserPlus, Building2, Send, PlayCircle, Mail, Shield, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CHART_DATA_MONTHLY } from '../data/mockData';
import { api } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import Modal from '../components/Modal';
import { ManualStudentModal } from './AlunosPage';

const chartColors = {
  primary: 'var(--cor-primaria)',
  success: 'var(--cor-sucesso-texto)',
  grid: 'var(--cor-borda)',
};

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function buildDashboardFallback(students, courses) {
  const totalAlunos = students.length;
  const alunosAprovados = students.filter(s => s.statusCadastro === 'aprovado').length;
  const alunosPendentes = students.filter(s => s.statusCadastro === 'pendente').length;
  const certificadosEmitidos = students.filter(s => s.statusCertificado === 'aprovado').length;
  const certificadosEnviados = students.filter(s => s.certificadoEnviado).length;
  const totalCursos = courses.length;
  const pendingItems = students.filter(s =>
    s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente'
  );

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
    recentStudents: students.slice(0, 5),
  };
}

function getNextSuggestedAction({ alunosPendentes, certificadosEmitidos, certificadosEnviados, totalCursos }) {
  if (totalCursos === 0) return { label: 'Iniciar primeira turma', path: '/qrcode' };
  if (certificadosEmitidos > certificadosEnviados) return { label: 'Enviar certificados pendentes', path: '/certificados' };
  if (alunosPendentes > 0) return { label: 'Revisar pendências da análise', path: '/analise' };
  return { label: 'Cadastrar turma rapidamente', path: '/qrcode' };
}

function GoalCard({ icon: Icon, title, description, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${color}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/80 border border-white flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-xs opacity-80 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

function StatusPill({ value }) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'aprovado') return <span className="badge-green">Aprovado</span>;
  if (normalized === 'recusado') return <span className="badge-red">Recusado</span>;
  return <span className="badge-yellow">Em análise</span>;
}

export default function Dashboard() {
  const { students, courses, classes, user, apiError, addCourse, addManualStudent, refreshData, loadingData, addSystemUser } = useApp();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [quickModal, setQuickModal] = useState('');
  const [quickCourseSaving, setQuickCourseSaving] = useState(false);
  const [quickStatus, setQuickStatus] = useState(null);
  const [quickCourseForm, setQuickCourseForm] = useState({
    courseTemplateId: '',
    nomeCurso: '',
    empresaContratante: '',
    local: '',
    data: '',
    horarioInicio: '08:00',
    duracao: '8 horas',
    maxAlunos: 30,
  });
  const [quickCompanyModal, setQuickCompanyModal] = useState(false);
  const [quickCompanySaving, setQuickCompanySaving] = useState(false);
  const [quickCompanyForm, setQuickCompanyForm] = useState({
    empresa: '',
    nomeResponsavel: '',
    email: '',
    telefone: '',
  });
  const [quickSelectedIds, setQuickSelectedIds] = useState([]);
  const [quickSelectedCompany, setQuickSelectedCompany] = useState(null);
  const [quickCompanyStudentSearch, setQuickCompanyStudentSearch] = useState('');
  const [quickClientsSearch, setQuickClientsSearch] = useState('');
  const [quickClientDetail, setQuickClientDetail] = useState(null);
  const [quickClientAction, setQuickClientAction] = useState('');
  const [quickClientReason, setQuickClientReason] = useState('');
  const [quickClientDataForm, setQuickClientDataForm] = useState({ contato: '', email: '', telefone: '' });
  const [quickClientRequests, setQuickClientRequests] = useState([]);
  const [quickClientSubmitting, setQuickClientSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const data = await api.getDashboard();
        if (!ignore) {
          setDashboardData(data);
          setDashboardError(null);
        }
      } catch {
        if (!ignore) {
          setDashboardData(null);
          setDashboardError('Dashboard usando dados locais. API indisponível.');
        }
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, [students, courses]);

  const fallbackData = useMemo(() => buildDashboardFallback(students, courses), [students, courses]);
  const dashboard = dashboardData || fallbackData;
  const {
    totalAlunos,
    alunosAprovados,
    alunosPendentes,
    certificadosEmitidos,
    certificadosEnviados,
    totalCursos,
  } = dashboard.metrics;
  const pendingItems = dashboard.pendingItems || [];
  const recentStudents = dashboard.recentStudents || [];
  const monthlyChart = dashboard.charts?.monthly || CHART_DATA_MONTHLY;
  const connectionWarning = dashboardData ? null : (dashboardError || apiError);
  const nextAction = getNextSuggestedAction({ alunosPendentes, certificadosEmitidos, certificadosEnviados, totalCursos });
  const certificadosParaEnviar = Math.max(0, certificadosEmitidos - certificadosEnviados);
  const certificatesToday = students.filter(s => s.statusCertificado === 'aprovado' && s.certificadoAutorizadoEm && s.certificadoAutorizadoEm.startsWith(new Date().toISOString().slice(0, 10))).length;
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const isBusinessUser = String(user?.role || '').toLowerCase() === 'empresario';
  const businessCourseRequests = useMemo(() => classes.filter(item => String(item.origem || '') === 'pre-cadastro-empresarial'), [classes]);
  const businessCourseApproved = useMemo(() => businessCourseRequests.filter(item => item.solicitacaoCursoStatus === 'aprovado').length, [businessCourseRequests]);
  const businessCoursePending = useMemo(() => businessCourseRequests.filter(item => !item.solicitacaoCursoStatus || item.solicitacaoCursoStatus === 'pendente').length, [businessCourseRequests]);
  const aprovadosNaoEnviados = useMemo(
    () => students.filter(item => item.statusCertificado === 'aprovado' && !item.certificadoEnviado).length,
    [students],
  );
  const aprovadosJaEnviados = useMemo(
    () => students.filter(item => item.statusCertificado === 'aprovado' && item.certificadoEnviado).length,
    [students],
  );
  const hasSecondCopyFlow = aprovadosNaoEnviados === 0 && aprovadosJaEnviados > 0;
  const approvedStudents = useMemo(
    () => students.filter(item => item.statusCertificado === 'aprovado'),
    [students],
  );
  const quickCompanies = useMemo(() => {
    const map = new Map();
    approvedStudents.forEach((item) => {
      const companyName = String(item.empresa || 'Empresa não informada').trim() || 'Empresa não informada';
      if (!map.has(companyName)) map.set(companyName, []);
      map.get(companyName).push(item);
    });
    return [...map.entries()]
      .map(([empresa, rows]) => ({
        empresa,
        rows: [...rows].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')),
      }))
      .sort((a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'));
  }, [approvedStudents]);
  const clientsOverview = useMemo(() => {
    const map = new Map();
    const add = (companyName, data = {}) => {
      const name = String(companyName || '').trim() || 'A definir';
      if (!map.has(name)) {
        map.set(name, {
          empresa: name,
          alunos: 0,
          certificadosAprovados: 0,
          cursos: new Set(),
          contato: '',
          email: '',
          telefone: '',
        });
      }
      const item = map.get(name);
      item.alunos += data.aluno ? 1 : 0;
      item.certificadosAprovados += data.certificadoAprovado ? 1 : 0;
      if (data.curso) item.cursos.add(data.curso);
      if (!item.email && data.email) item.email = data.email;
      if (!item.telefone && data.telefone) item.telefone = data.telefone;
    };

    students.forEach((s) => add(s.empresa, {
      aluno: true,
      certificadoAprovado: s.statusCertificado === 'aprovado',
      curso: s.nomeCurso,
      email: s.email,
      telefone: s.telefone,
    }));
    courses.forEach((c) => add(c.empresaContratante, { curso: c.nomeCurso }));
    classes.forEach((t) => add(t.empresa?.nome, { curso: t.nomeCurso }));

    return [...map.values()]
      .map((item) => ({ ...item, totalCursos: item.cursos.size }))
      .sort((a, b) => b.alunos - a.alunos || a.empresa.localeCompare(b.empresa, 'pt-BR'));
  }, [students, courses, classes]);
  const filteredClientsOverview = useMemo(() => {
    const q = quickClientsSearch.trim().toLowerCase();
    if (!q) return clientsOverview;
    return clientsOverview.filter((item) => item.empresa.toLowerCase().includes(q));
  }, [clientsOverview, quickClientsSearch]);
  const companyOptions = useMemo(() => {
    const map = new Map();
    const add = (name) => {
      const value = String(name || '').trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (!map.has(key)) map.set(key, value);
    };
    courses.forEach(item => add(item.empresaContratante));
    students.forEach(item => add(item.empresa));
    classes.forEach(item => add(item.empresa?.nome));
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [courses, students, classes]);
  const activeCourseOptions = useMemo(
    () => courses.filter(item => String(item.status || '').toLowerCase() !== 'inativo'),
    [courses],
  );

  const openQuickModal = (type) => {
    setQuickStatus(null);
    setQuickModal(type);
    if (type === 'certificados') {
      const defaults = students
        .filter(item => item.statusCertificado === 'aprovado' && !item.certificadoEnviado)
        .map(item => String(item.id));
      setQuickSelectedIds(defaults);
    }
    if (type === 'clientes') {
      setQuickClientsSearch('');
      setQuickClientDetail(null);
      setQuickClientAction('');
      setQuickClientReason('');
      setQuickClientDataForm({ contato: '', email: '', telefone: '' });
      api.getCompanyChangeRequests().then(setQuickClientRequests).catch(() => setQuickClientRequests([]));
    }
  };

  const openClientDetail = (item) => {
    setQuickClientDetail(item);
    setQuickClientAction('');
    setQuickClientReason('');
    setQuickClientDataForm({
      contato: item?.contato || '',
      email: item?.email || '',
      telefone: item?.telefone || '',
    });
  };

  const submitClientChangeRequest = async () => {
    if (!quickClientDetail) return;
    if (!quickClientAction) {
      setQuickStatus({ type: 'error', text: 'Selecione uma ação: trocar senha ou alterar dados.' });
      return;
    }
    if (!quickClientReason.trim()) {
      setQuickStatus({ type: 'error', text: 'Informe o motivo da solicitação para validação.' });
      return;
    }
    setQuickClientSubmitting(true);
    setQuickStatus(null);
    try {
      const payload = quickClientAction === 'senha'
        ? {
            empresa: quickClientDetail.empresa,
            tipo: 'senha',
            motivo: quickClientReason.trim(),
            detalhes: { acao: 'troca_senha_perfil_empresa' },
          }
        : {
            empresa: quickClientDetail.empresa,
            tipo: 'dados',
            motivo: quickClientReason.trim(),
            detalhes: {
              contato: quickClientDataForm.contato,
              email: quickClientDataForm.email,
              telefone: quickClientDataForm.telefone,
            },
          };
      await api.createCompanyChangeRequest(payload);
      const requests = await api.getCompanyChangeRequests();
      setQuickClientRequests(requests);
      setQuickStatus({ type: 'success', text: 'Solicitação enviada para validação/aprovação. As alterações só valem após aprovação.' });
      setQuickClientAction('');
      setQuickClientReason('');
    } catch (error) {
      setQuickStatus({ type: 'error', text: error?.message || 'Não foi possível enviar a solicitação.' });
    } finally {
      setQuickClientSubmitting(false);
    }
  };

  const handleCreateQuickCourse = async () => {
    if (!quickCourseForm.nomeCurso || !quickCourseForm.empresaContratante || !quickCourseForm.local || !quickCourseForm.data || !quickCourseForm.horarioInicio || !quickCourseForm.duracao || !quickCourseForm.maxAlunos) {
      setQuickStatus({ type: 'error', text: 'Preencha os campos obrigatórios para iniciar a turma.' });
      return;
    }
    setQuickCourseSaving(true);
    setQuickStatus(null);
    try {
      const created = await addCourse({
        ...quickCourseForm,
        temInstrutor: false,
        instrutorNome: '',
        instrutorCargo: '',
        instrutorRegistro: '',
        status: 'ativo',
      });
      if (!created) return;
      setQuickStatus({ type: 'success', text: 'Turma criada com sucesso.' });
      await refreshData();
    } catch (error) {
      setQuickStatus({ type: 'error', text: error?.message || 'Não foi possível criar a turma.' });
    } finally {
      setQuickCourseSaving(false);
    }
  };

  const handleSelectCourseTemplate = (templateId) => {
    const template = activeCourseOptions.find(item => String(item.id) === String(templateId));
    setQuickCourseForm(prev => ({
      ...prev,
      courseTemplateId: templateId,
      nomeCurso: template?.nomeCurso || prev.nomeCurso,
      local: template?.local || prev.local,
      horarioInicio: template?.horarioInicio || prev.horarioInicio,
      duracao: template?.duracao || prev.duracao,
      maxAlunos: Number(template?.maxAlunos || prev.maxAlunos || 30),
    }));
  };

  const handleCreateQuickCompany = async () => {
    if (!quickCompanyForm.empresa || !quickCompanyForm.nomeResponsavel || !quickCompanyForm.email) {
      setQuickStatus({ type: 'error', text: 'Preencha empresa, responsável e e-mail para cadastrar a empresa.' });
      return;
    }
    const base = String(quickCompanyForm.empresa || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const username = `emp_${base.slice(0, 12) || 'empresa'}_${String(Date.now()).slice(-4)}`;
    const tempPassword = `Drm@${String(Date.now()).slice(-6)}`;
    setQuickCompanySaving(true);
    try {
      const result = await addSystemUser({
        name: quickCompanyForm.nomeResponsavel,
        username,
        email: quickCompanyForm.email,
        password: tempPassword,
        role: 'empresario',
        status: 'pendente',
        empresa: quickCompanyForm.empresa,
      });
      if (!result?.success) {
        setQuickStatus({ type: 'error', text: result?.error || 'Não foi possível cadastrar a empresa.' });
        return;
      }
      setQuickCourseForm(prev => ({ ...prev, empresaContratante: quickCompanyForm.empresa }));
      setQuickCompanyModal(false);
      setQuickStatus({
        type: 'success',
        text: `Empresa cadastrada para validação do responsável. Acesso criado (${username}) com senha temporária: ${result.temporaryPassword || '(gerada)'} . No primeiro login, a empresa será obrigada a trocar a senha.`,
      });
      setQuickCompanyForm({ empresa: '', nomeResponsavel: '', email: '', telefone: '' });
    } finally {
      setQuickCompanySaving(false);
    }
  };

  const toggleQuickStudent = (id) => {
    const key = String(id);
    setQuickSelectedIds(prev => (
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    ));
  };

  const toggleQuickCompany = (rows) => {
    const ids = rows.map(item => String(item.id));
    const allSelected = ids.length > 0 && ids.every(id => quickSelectedIds.includes(id));
    setQuickSelectedIds(prev => (
      allSelected
        ? prev.filter(id => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    ));
  };

  const toggleQuickAll = () => {
    const allIds = approvedStudents.map(item => String(item.id));
    const allSelected = allIds.length > 0 && allIds.every(id => quickSelectedIds.includes(id));
    setQuickSelectedIds(allSelected ? [] : allIds);
  };

  const openQuickCompanyStudents = (group) => {
    setQuickSelectedCompany(group);
    setQuickCompanyStudentSearch('');
  };

  const handleSendSelectedQuick = async () => {
    if (quickSelectedIds.length === 0) {
      setQuickStatus({ type: 'error', text: 'Selecione pelo menos um aluno para enviar.' });
      return;
    }
    try {
      setQuickStatus(null);
      await api.exportCertificates({
        studentIds: quickSelectedIds,
        action: 'email',
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      setQuickStatus({ type: 'success', text: 'Envio processado para os alunos selecionados.' });
      await refreshData();
    } catch (error) {
      setQuickStatus({ type: 'error', text: error?.message || 'Falha ao enviar e-mails selecionados.' });
    }
  };

  if (isBusinessUser) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className={`rounded-xl border px-4 py-3 ${alunosPendentes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-gray-600">Situação de análise</p>
            <p className={`text-lg font-bold ${alunosPendentes > 0 ? 'text-amber-700' : 'text-green-700'}`}>
              {alunosPendentes > 0 ? `${alunosPendentes} pendência(s)` : 'Sem pendências'}
            </p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${certificadosParaEnviar > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-gray-600">Situação de emissão</p>
            <p className={`text-lg font-bold ${certificadosParaEnviar > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {certificadosParaEnviar > 0 ? `${certificadosParaEnviar} certificado(s) para enviar` : 'Tudo enviado'}
            </p>
          </div>
          <div className="rounded-xl border bg-blue-50 border-blue-200 px-4 py-3">
            <p className="text-xs text-blue-700">Ações rápidas</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button type="button" onClick={() => navigate('/qrcode')} className="btn-secondary text-xs">+ Nova turma</button>
              <button type="button" onClick={() => navigate('/cadastro-manual')} className="btn-secondary text-xs">+ Cadastro rápido</button>
              <button type="button" onClick={() => navigate('/pendencias')} className="btn-secondary text-xs">Fila única</button>
            </div>
          </div>
        </div>

        {connectionWarning && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">{connectionWarning}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold">{saudacao}, {user?.name?.split(' ')[0]}!</h2>
          <p className="text-blue-200 text-sm mt-1">
            Portal da sua empresa: acompanhe alunos, cursos contratados e envie novos pré-cadastros.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => navigate('/pre-cadastro-empresarial')} className="bg-white text-blue-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
              Cadastrar alunos para curso
            </button>
            <button onClick={() => navigate('/cursos')} className="bg-blue-800/70 text-white text-sm font-semibold px-4 py-2 rounded-lg border border-blue-300/30 hover:bg-blue-800 transition-colors">
              Contratar curso
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Funcionários" value={totalAlunos} sub="Da sua empresa" color="text-blue-600" />
          <StatCard icon={Clock} label="Pendentes" value={alunosPendentes} sub="Aguardando validação DRM" color="text-amber-500" />
          <StatCard icon={Award} label="Certificados" value={certificadosEmitidos} sub={`${certificadosEnviados} enviados`} color="text-green-600" />
          <StatCard icon={BookOpen} label="Cursos contratados" value={totalCursos} sub="Da sua empresa" color="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <p className="text-xs text-gray-500">Solicitações de curso aprovadas</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{businessCourseApproved}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">Solicitações aguardando aprovação</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{businessCoursePending}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Funcionários recentes da sua empresa</h3>
            <button onClick={() => navigate('/pre-cadastro-empresarial')} className="text-blue-600 text-sm hover:underline">
              Novo pré-cadastro
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Nome</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 hidden sm:table-cell">Curso</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Cadastro</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentStudents.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4"><p className="text-sm font-medium text-gray-800 truncate max-w-40">{s.nome}</p></td>
                    <td className="py-3 pr-4 hidden sm:table-cell"><p className="text-xs text-gray-600 truncate max-w-40">{s.nomeCurso}</p></td>
                    <td className="py-3 pr-4">
                      <span className={s.statusCadastro === 'aprovado' ? 'badge-green' : s.statusCadastro === 'recusado' ? 'badge-red' : 'badge-yellow'}>
                        {s.statusCadastro === 'aprovado' ? 'Aprovado' : s.statusCadastro === 'recusado' ? 'Recusado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={s.statusCertificado === 'aprovado' ? 'badge-green' : s.statusCertificado === 'recusado' ? 'badge-red' : 'badge-yellow'}>
                        {s.statusCertificado === 'aprovado' ? 'Aprovado' : s.statusCertificado === 'recusado' ? 'Recusado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {connectionWarning && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">{connectionWarning}</p>
        </div>
      )}

      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{saudacao}, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-blue-200 text-sm mt-1">
              Você tem <span className="font-semibold text-white">{alunosPendentes} cadastros</span> aguardando análise.
            </p>
          </div>
          <div className="hidden sm:block">
            <BrandLogo className="w-36 h-20 rounded-2xl border border-white/10 shadow-xl" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={() => navigate(nextAction.path)} className="bg-white text-blue-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4" />
            Próximo passo sugerido: {nextAction.label}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <GoalCard icon={QrCode} title="Iniciar turma" description="Curso + empresa + data em segundos" onClick={() => openQuickModal('turma')} color="bg-blue-50 border-blue-100 text-blue-900" />
        <GoalCard icon={UserPlus} title="Aluno retroativo" description="Cadastro e certificado rápido" onClick={() => openQuickModal('aluno')} color="bg-green-50 border-green-100 text-green-900" />
        <GoalCard icon={Send} title="Emitir certificados" description="Baixar PDF/ZIP ou enviar e-mail" onClick={() => openQuickModal('certificados')} color="bg-amber-50 border-amber-100 text-amber-900" />
        <GoalCard icon={Building2} title="Ver clientes" description="Empresas, funcionários e certificados" onClick={() => openQuickModal('clientes')} color="bg-slate-50 border-slate-200 text-slate-900" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total de Alunos"
          value={totalAlunos}
          sub={`${alunosAprovados} aprovados`}
          color="text-blue-600"
          onClick={() => navigate('/alunos')}
        />
        <StatCard
          icon={Clock}
          label="Aguardando Análise"
          value={alunosPendentes}
          sub="Cadastros pendentes"
          color="text-amber-500"
          onClick={() => navigate('/pendencias')}
        />
        <StatCard
          icon={Award}
          label="Certificados Emitidos"
          value={certificadosEmitidos}
          sub={`${certificadosEnviados} enviados`}
          color="text-green-600"
          onClick={() => navigate('/certificados')}
        />
        <StatCard
          icon={BookOpen}
          label="Cursos Cadastrados"
          value={totalCursos}
          sub="Cursos ativos"
          color="text-purple-600"
          onClick={() => navigate('/qrcode')}
        />
        <StatCard
          icon={Send}
          label="Para enviar"
          value={certificadosParaEnviar}
          sub={`${certificatesToday} certificados aprovados hoje`}
          color={certificadosParaEnviar > 0 ? 'text-red-600' : 'text-green-600'}
          onClick={() => navigate('/certificados')}
        />
      </div>

      {/* Chart + Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-bold text-gray-800 mb-4">Alunos por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="alunos" name="Alunos" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="certificados" name="Certificados" fill={chartColors.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pending */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Pendências</h3>
            {pendingItems.length > 0 && (
              <span className="badge-yellow">{pendingItems.length}</span>
            )}
          </div>
          <div className="space-y-3">
            {pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm">Nenhuma pendência!</p>
                <button type="button" onClick={() => navigate('/certificados')} className="btn-secondary text-xs mt-3">
                  Ir para emissão
                </button>
              </div>
            ) : (
              pendingItems.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{s.nomeCurso}</p>
                  </div>
                </div>
              ))
            )}
            {pendingItems.length > 5 && (
              <p className="text-xs text-gray-400 text-center">+{pendingItems.length - 5} mais</p>
            )}
          </div>
          {pendingItems.length > 0 && (
            <button
              onClick={() => navigate('/analise')}
              className="btn-primary w-full mt-4 text-sm"
            >
              Analisar agora
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recent students */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">Alunos Recentes</h3>
          <button
            onClick={() => navigate('/alunos')}
            className="text-blue-600 text-sm hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Aluno</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 hidden sm:table-cell">Curso</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Cadastro</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Certificado</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentStudents.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">{s.nome.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-32">{s.nome}</p>
                        <p className="text-xs text-gray-400 truncate hidden sm:block">{s.empresa}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <p className="text-xs text-gray-600 truncate max-w-40">{s.nomeCurso}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={
                      s.statusCadastro === 'aprovado' ? 'badge-green' :
                      s.statusCadastro === 'recusado' ? 'badge-red' : 'badge-yellow'
                    }>
                      {s.statusCadastro === 'aprovado' ? 'Aprovado' :
                       s.statusCadastro === 'recusado' ? 'Recusado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={
                      s.statusCertificado === 'aprovado' ? 'badge-green' :
                      s.statusCertificado === 'recusado' ? 'badge-red' : 'badge-yellow'
                    }>
                      {s.statusCertificado === 'aprovado' ? 'Aprovado' :
                       s.statusCertificado === 'recusado' ? 'Recusado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-3">
                    {s.statusCertificado === 'aprovado' ? (
                      <button type="button" onClick={() => navigate('/certificados')} className="btn-secondary text-xs">
                        <Mail className="w-3 h-3" />
                        Enviar
                      </button>
                    ) : (
                      <button type="button" onClick={() => navigate('/analise')} className="btn-secondary text-xs">
                        <ClipboardCheck className="w-3 h-3" />
                        Analisar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={quickModal === 'turma'} onClose={() => setQuickModal('')} title="Iniciar turma (rápido)" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso base cadastrado *</label>
              <select value={quickCourseForm.courseTemplateId} onChange={(e) => handleSelectCourseTemplate(e.target.value)} className="input-field">
                <option value="">Selecione um curso cadastrado</option>
                {activeCourseOptions.map(item => (
                  <option key={item.id} value={item.id}>{item.nomeCurso}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do curso *</label>
              <input value={quickCourseForm.nomeCurso} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, nomeCurso: e.target.value }))} className="input-field" placeholder="Preenchido automaticamente pelo curso base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
              <select value={quickCourseForm.empresaContratante} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, empresaContratante: e.target.value }))} className="input-field">
                <option value="">Selecione empresa cadastrada</option>
                {companyOptions.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              <button type="button" onClick={() => setQuickCompanyModal(true)} className="text-xs text-blue-700 hover:underline mt-1">
                Empresa não cadastrada? Fazer cadastro rápido
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
              <input value={quickCourseForm.local} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, local: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={quickCourseForm.data} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, data: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
              <input type="time" value={quickCourseForm.horarioInicio} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, horarioInicio: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração *</label>
              <input value={quickCourseForm.duracao} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, duracao: e.target.value }))} className="input-field" placeholder="Ex: 8 horas" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vagas *</label>
              <input type="number" min="1" value={quickCourseForm.maxAlunos} onChange={(e) => setQuickCourseForm(prev => ({ ...prev, maxAlunos: Number(e.target.value || 1) }))} className="input-field" />
            </div>
          </div>
          {quickStatus && (
            <div className={`rounded-xl border p-3 text-sm ${quickStatus.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {quickStatus.text}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/qrcode')} className="btn-secondary text-sm">Abrir tela completa</button>
            <button type="button" onClick={handleCreateQuickCourse} disabled={quickCourseSaving} className="btn-primary text-sm disabled:opacity-60">
              {quickCourseSaving ? 'Criando...' : 'Criar turma'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={quickCompanyModal} onClose={() => setQuickCompanyModal(false)} title="Cadastro rápido de empresa" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
            <input value={quickCompanyForm.empresa} onChange={(e) => setQuickCompanyForm(prev => ({ ...prev, empresa: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável da empresa *</label>
            <input value={quickCompanyForm.nomeResponsavel} onChange={(e) => setQuickCompanyForm(prev => ({ ...prev, nomeResponsavel: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input type="email" value={quickCompanyForm.email} onChange={(e) => setQuickCompanyForm(prev => ({ ...prev, email: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input value={quickCompanyForm.telefone} onChange={(e) => setQuickCompanyForm(prev => ({ ...prev, telefone: e.target.value }))} className="input-field" />
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
            O cadastro será criado como <strong>pendente</strong> para validação do responsável DRM. Após aprovação, a empresa acessa o dashboard para completar as informações.
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => setQuickCompanyModal(false)}>Cancelar</button>
            <button type="button" className="btn-primary text-sm disabled:opacity-60" onClick={handleCreateQuickCompany} disabled={quickCompanySaving}>
              {quickCompanySaving ? 'Cadastrando...' : 'Cadastrar empresa'}
            </button>
          </div>
        </div>
      </Modal>

      <ManualStudentModal
        isOpen={quickModal === 'aluno'}
        onClose={() => setQuickModal('')}
        courses={courses}
        students={students}
        onSubmit={addManualStudent}
        loading={loadingData}
      />
      <Modal isOpen={quickModal === 'clientes'} onClose={() => setQuickModal('')} title="Ver clientes (rápido)" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 uppercase">Empresas</p>
              <p className="text-xl font-bold text-gray-800">{clientsOverview.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 uppercase">Funcionários</p>
              <p className="text-xl font-bold text-gray-800">{students.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 uppercase">Certificados aprovados</p>
              <p className="text-xl font-bold text-gray-800">{students.filter(s => s.statusCertificado === 'aprovado').length}</p>
            </div>
          </div>

          {!quickClientDetail ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar empresa</label>
                <input
                  value={quickClientsSearch}
                  onChange={(event) => setQuickClientsSearch(event.target.value)}
                  className="input-field"
                  placeholder="Digite o nome da empresa..."
                />
              </div>

              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {filteredClientsOverview.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-500">Nenhuma empresa encontrada.</p>
                ) : (
                  <div className="max-h-80 overflow-auto">
                    {filteredClientsOverview.map((item) => (
                      <button
                        key={`client-quick-${item.empresa}`}
                        type="button"
                        onClick={() => openClientDetail(item)}
                        className="w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-gray-50"
                      >
                        <p className="text-sm font-semibold text-gray-800">{item.empresa}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.alunos} funcionário(s) · {item.certificadosAprovados} certificado(s) aprovado(s) · {item.totalCursos} curso(s)
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-gray-900">{quickClientDetail.empresa}</p>
                  <p className="text-xs text-gray-500">Dados da empresa cliente e ações rápidas</p>
                </div>
                <button type="button" onClick={() => setQuickClientDetail(null)} className="btn-secondary text-xs">Voltar para empresas</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[11px] uppercase text-gray-500">Funcionários</p>
                  <p className="text-lg font-bold text-gray-800">{quickClientDetail.alunos}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[11px] uppercase text-gray-500">Certificados aprovados</p>
                  <p className="text-lg font-bold text-gray-800">{quickClientDetail.certificadosAprovados}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[11px] uppercase text-gray-500">Cursos vinculados</p>
                  <p className="text-lg font-bold text-gray-800">{quickClientDetail.totalCursos}</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4" />Alterações com validação DRM</div>
                Qualquer alteração solicitada aqui fica <strong>pendente</strong> e só passa a valer após aprovação do responsável/admin.
              </div>

              <div className="rounded-xl border border-gray-100 p-3 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Ações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setQuickClientAction('senha')} className={`btn-secondary text-xs ${quickClientAction === 'senha' ? 'ring-2 ring-blue-100' : ''}`}>
                    <Shield className="w-3.5 h-3.5" />Solicitar troca de senha do perfil empresa
                  </button>
                  <button type="button" onClick={() => setQuickClientAction('dados')} className={`btn-secondary text-xs ${quickClientAction === 'dados' ? 'ring-2 ring-blue-100' : ''}`}>
                    <FileText className="w-3.5 h-3.5" />Solicitar alteração de dados
                  </button>
                </div>

                {quickClientAction === 'dados' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className="input-field" placeholder="Contato" value={quickClientDataForm.contato} onChange={(e) => setQuickClientDataForm(prev => ({ ...prev, contato: e.target.value }))} />
                    <input className="input-field" placeholder="E-mail" value={quickClientDataForm.email} onChange={(e) => setQuickClientDataForm(prev => ({ ...prev, email: e.target.value }))} />
                    <input className="input-field" placeholder="Telefone" value={quickClientDataForm.telefone} onChange={(e) => setQuickClientDataForm(prev => ({ ...prev, telefone: e.target.value }))} />
                  </div>
                )}
                <textarea
                  className="input-field min-h-20"
                  placeholder="Motivo da solicitação (obrigatório)"
                  value={quickClientReason}
                  onChange={(e) => setQuickClientReason(e.target.value)}
                />
                <div className="flex justify-end">
                  <button type="button" onClick={submitClientChangeRequest} disabled={quickClientSubmitting} className="btn-primary text-sm disabled:opacity-60">
                    {quickClientSubmitting ? 'Enviando...' : 'Enviar para validação/aprovação'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Solicitações da empresa</p>
                </div>
                <div className="max-h-44 overflow-auto">
                  {quickClientRequests.filter(item => item.empresa === quickClientDetail.empresa).length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-500">Sem solicitações registradas.</p>
                  ) : quickClientRequests
                    .filter(item => item.empresa === quickClientDetail.empresa)
                    .slice(0, 10)
                    .map(item => (
                      <div key={`req-${item.id}`} className="px-3 py-2 border-b border-gray-50">
                        <p className="text-xs font-semibold text-gray-800">{item.tipo === 'senha' ? 'Troca de senha' : 'Alteração de dados'}</p>
                        <p className="text-xs text-gray-500">{item.motivo}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Status: {item.status}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setQuickModal('')} className="btn-secondary text-sm">Fechar</button>
            <button type="button" onClick={() => navigate('/empresas-clientes')} className="btn-primary text-sm">
              Abrir tela completa
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={quickModal === 'certificados'} onClose={() => setQuickModal('')} title="Emitir certificados (rápido)" size="lg">
        <div className="space-y-4">
          <div className={`rounded-xl border p-3 ${
            hasSecondCopyFlow
              ? 'bg-blue-50 border-blue-100'
              : 'bg-amber-50 border-amber-100'
          }`}>
            <p className={`text-sm ${hasSecondCopyFlow ? 'text-blue-900' : 'text-amber-900'}`}>
              {hasSecondCopyFlow ? (
                <>
                  <strong>{aprovadosJaEnviados}</strong> certificado(s) já enviados. Você pode reenviar <strong>2ª via</strong> ao cliente.
                </>
              ) : (
                <>
                  <strong>{aprovadosNaoEnviados}</strong> certificado(s) aprovado(s) aguardando envio.
                </>
              )}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">Empresas (clique para selecionar alunos)</p>
              <button type="button" onClick={toggleQuickAll} className="text-xs text-blue-700 hover:underline">
                {approvedStudents.length > 0 && approvedStudents.every(item => quickSelectedIds.includes(String(item.id))) ? 'Limpar seleção' : 'Selecionar todos'}
              </button>
            </div>
            {quickCompanies.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">Nenhum certificado aprovado encontrado.</p>
            ) : (
              <div className="max-h-80 overflow-auto p-2 space-y-2">
                {quickCompanies.map((group) => {
                  const groupIds = group.rows.map(item => String(item.id));
                  const selectedCount = groupIds.filter(id => quickSelectedIds.includes(id)).length;
                  return (
                    <button
                      key={`grp-${group.empresa}`}
                      type="button"
                      onClick={() => openQuickCompanyStudents(group)}
                      className="w-full text-left rounded-lg border border-gray-100 bg-white px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{group.empresa}</p>
                          <p className="text-xs text-gray-500">{group.rows.length} aluno(s) · {selectedCount} selecionado(s)</p>
                        </div>
                        <span className="text-xs text-blue-700 font-medium">Selecionar alunos</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {quickSelectedIds.length} aluno(s) selecionado(s) para envio.
          </div>
          {quickStatus && (
            <div className={`rounded-xl border p-3 text-sm ${quickStatus.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {quickStatus.text}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/certificados')} className="btn-secondary text-sm">Abrir tela completa</button>
            <button
              type="button"
              onClick={hasSecondCopyFlow ? handleSendSelectedQuick : handleSendSelectedQuick}
              disabled={loadingData || quickSelectedIds.length === 0}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {hasSecondCopyFlow ? 'Enviar 2ª via ao cliente' : `Enviar via e-mail (${quickSelectedIds.length})`}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={!!quickSelectedCompany}
        onClose={() => setQuickSelectedCompany(null)}
        title={quickSelectedCompany ? `Selecionar alunos - ${quickSelectedCompany.empresa}` : 'Selecionar alunos'}
        size="lg"
      >
        <div className="space-y-3">
          {quickSelectedCompany && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar por nome ou CPF</label>
                <input
                  value={quickCompanyStudentSearch}
                  onChange={(event) => setQuickCompanyStudentSearch(event.target.value)}
                  className="input-field"
                  placeholder="Digite o nome ou CPF do aluno..."
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {quickSelectedCompany.rows.filter((item) => {
                    const q = quickCompanyStudentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return String(item.nome || '').toLowerCase().includes(q) || String(item.cpf || '').includes(q);
                  }).length} aluno(s) exibido(s)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const filteredRows = quickSelectedCompany.rows.filter((item) => {
                      const q = quickCompanyStudentSearch.trim().toLowerCase();
                      if (!q) return true;
                      return String(item.nome || '').toLowerCase().includes(q) || String(item.cpf || '').includes(q);
                    });
                    toggleQuickCompany(filteredRows);
                  }}
                  className="btn-secondary text-xs"
                >
                  {quickSelectedCompany.rows
                    .filter((item) => {
                      const q = quickCompanyStudentSearch.trim().toLowerCase();
                      if (!q) return true;
                      return String(item.nome || '').toLowerCase().includes(q) || String(item.cpf || '').includes(q);
                    })
                    .every(item => quickSelectedIds.includes(String(item.id)))
                    ? 'Desmarcar todos da empresa'
                    : 'Selecionar todos da empresa'}
                </button>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border border-gray-100">
                {quickSelectedCompany.rows
                  .filter((item) => {
                    const q = quickCompanyStudentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return String(item.nome || '').toLowerCase().includes(q) || String(item.cpf || '').includes(q);
                  })
                  .map((item) => (
                  <label key={`quick-student-modal-${item.id}`} className="px-3 py-2 flex items-center gap-3 border-b last:border-b-0 border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quickSelectedIds.includes(String(item.id))}
                      onChange={() => toggleQuickStudent(item.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.nome}</p>
                      <p className="text-xs text-gray-500 truncate">{item.nomeCurso || '-'} · {item.cpf || 'CPF não informado'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill value={item.statusCadastro} />
                      <StatusPill value={item.statusCertificado} />
                    </div>
                  </label>
                ))}
                {quickSelectedCompany.rows.filter((item) => {
                  const q = quickCompanyStudentSearch.trim().toLowerCase();
                  if (!q) return true;
                  return String(item.nome || '').toLowerCase().includes(q) || String(item.cpf || '').includes(q);
                }).length === 0 && (
                  <p className="px-3 py-4 text-sm text-gray-500">Nenhum aluno encontrado para essa busca.</p>
                )}
              </div>
            </>
          )}
          <div className="flex justify-end">
            <button type="button" className="btn-primary text-sm" onClick={() => setQuickSelectedCompany(null)}>
              Confirmar seleção
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
