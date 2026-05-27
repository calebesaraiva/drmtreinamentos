import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Award, ClipboardCheck, QrCode,
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  ArrowRight, BookOpen, UserPlus
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

export default function Dashboard() {
  const { students, courses, user, apiError } = useApp();
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

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

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
            <h2 className="text-xl font-bold">{saudacao}, {user?.name?.split(' ')[0]}! 👋</h2>
            <p className="text-blue-200 text-sm mt-1">
              Você tem <span className="font-semibold text-white">{alunosPendentes} cadastros</span> aguardando análise.
            </p>
          </div>
          <div className="hidden sm:block">
            <BrandLogo className="w-36 h-20 rounded-2xl border border-white/10 shadow-xl" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => navigate('/analise')}
            className="bg-white text-blue-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            Ver Análises
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate('/qrcode')}
            className="bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            Novo QR Code
          </button>
          <button
            onClick={() => navigate('/cadastro-manual')}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Cadastro Manual
          </button>
        </div>
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
