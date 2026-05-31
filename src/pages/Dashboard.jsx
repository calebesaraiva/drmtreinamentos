import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Award, ClipboardCheck, QrCode,
  AlertTriangle, CheckCircle, Clock,
  ArrowRight, BookOpen, UserPlus, Building2, Send, PlayCircle, Mail
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

export default function Dashboard() {
  const { students, courses, classes, user, apiError, addCourse, addManualStudent, markAllCertificadosSent, refreshData, loadingData, addSystemUser } = useApp();
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

  const handleSendAllApproved = async () => {
    setQuickStatus(null);
    const result = await markAllCertificadosSent();
    if (result) {
      setQuickStatus({ type: 'success', text: 'Envio em lote concluído. Verifique os alertas de falha de SMTP, se houver.' });
      await refreshData();
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
        <GoalCard icon={Building2} title="Ver clientes" description="Empresas, funcionários e certificados" onClick={() => navigate('/empresas-clientes')} color="bg-slate-50 border-slate-200 text-slate-900" />
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

      <Modal isOpen={quickModal === 'certificados'} onClose={() => setQuickModal('')} title="Emitir certificados (rápido)" size="md">
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-sm text-amber-900"><strong>{aprovadosNaoEnviados}</strong> certificado(s) aprovado(s) aguardando envio.</p>
          </div>
          {quickStatus && (
            <div className={`rounded-xl border p-3 text-sm ${quickStatus.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {quickStatus.text}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/certificados')} className="btn-secondary text-sm">Abrir tela completa</button>
            <button type="button" onClick={handleSendAllApproved} disabled={aprovadosNaoEnviados === 0 || loadingData} className="btn-primary text-sm disabled:opacity-60">
              Enviar todos por e-mail
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
