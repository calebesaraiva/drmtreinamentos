import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Award, ClipboardCheck, QrCode,
  AlertTriangle, CheckCircle, Clock,
  ArrowRight, BookOpen, UserPlus, Building2, Send, PlayCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CHART_DATA_MONTHLY } from '../data/mockData';
import { api } from '../services/api';
import BrandLogo from '../components/BrandLogo';

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
  if (alunosPendentes > 0) return { label: 'Revisar pendências da análise', path: '/analise' };
  if (certificadosEmitidos > certificadosEnviados) return { label: 'Enviar certificados pendentes', path: '/certificados' };
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
  const { students, courses, classes, user, apiError } = useApp();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);

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
  const connectionWarning = dashboardError || apiError;
  const nextAction = getNextSuggestedAction({ alunosPendentes, certificadosEmitidos, certificadosEnviados, totalCursos });
  const certificatesToday = students.filter(s => s.statusCertificado === 'aprovado' && s.certificadoAutorizadoEm && s.certificadoAutorizadoEm.startsWith(new Date().toISOString().slice(0, 10))).length;
  const avgClassSetupMinutes = useMemo(() => {
    if (!Array.isArray(classes) || classes.length === 0) return '-';
    const values = classes
      .map(item => {
        const created = Date.parse(item.createdAt || item.criadaEm || '');
        const firstHistory = Array.isArray(item.historico) && item.historico[0]?.em ? Date.parse(item.historico[0].em) : NaN;
        if (Number.isNaN(created) || Number.isNaN(firstHistory)) return null;
        return Math.max(1, Math.round((firstHistory - created) / 60000));
      })
      .filter(value => Number.isFinite(value));
    if (!values.length) return '-';
    return Math.round(values.reduce((acc, item) => acc + item, 0) / values.length);
  }, [classes]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const isBusinessUser = String(user?.role || '').toLowerCase() === 'empresario';

  if (isBusinessUser) {
    return (
      <div className="space-y-6">
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
        <GoalCard icon={QrCode} title="Iniciar turma" description="Curso + empresa + data em segundos" onClick={() => navigate('/qrcode')} color="bg-blue-50 border-blue-100 text-blue-900" />
        <GoalCard icon={UserPlus} title="Aluno retroativo" description="Cadastro e certificado rápido" onClick={() => navigate('/cadastro-manual')} color="bg-green-50 border-green-100 text-green-900" />
        <GoalCard icon={Send} title="Emitir certificados" description="Baixar PDF/ZIP ou enviar e-mail" onClick={() => navigate('/certificados')} color="bg-amber-50 border-amber-100 text-amber-900" />
        <GoalCard icon={Building2} title="Ver clientes" description="Empresas, funcionários e certificados" onClick={() => navigate('/empresas-clientes')} color="bg-slate-50 border-slate-200 text-slate-900" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          onClick={() => navigate('/analise')}
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
          icon={Clock}
          label="Tempo médio de setup"
          value={avgClassSetupMinutes === '-' ? '-' : `${avgClassSetupMinutes} min`}
          sub={`${certificatesToday} certificados aprovados hoje`}
          color="text-slate-600"
          onClick={() => navigate('/nova-turma-manual')}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
