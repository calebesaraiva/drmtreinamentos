import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Award, BookOpen, Calendar, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CHART_DATA_MONTHLY, CHART_DATA_COURSES, CHART_DATA_STATUS } from '../data/mockData';

const RADIAN = Math.PI / 180;
const chartColors = {
  primary: 'var(--cor-primaria)',
  success: 'var(--cor-sucesso-texto)',
  grid: 'var(--cor-borda)',
};
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function StatBox({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-black text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const { students, courses } = useApp();
  const [period, setPeriod] = useState('6m');

  const totalAlunos = students.length;
  const aprovados = students.filter(s => s.statusCadastro === 'aprovado').length;
  const certificados = students.filter(s => s.statusCertificado === 'aprovado').length;
  const taxaAprovacao = totalAlunos ? ((aprovados / totalAlunos) * 100).toFixed(1) : 0;
  const mediaPresenca = totalAlunos
    ? (students.reduce((a, s) => a + (s.presenca || 0), 0) / totalAlunos).toFixed(1)
    : 0;
  const mediaNota = totalAlunos
    ? (students.reduce((a, s) => a + (s.notaProva || 0), 0) / totalAlunos).toFixed(1)
    : 0;

  // Students per course
  const porCurso = courses.map(c => ({
    nome: c.nomeCurso?.length > 20 ? c.nomeCurso.substring(0, 20) + '...' : c.nomeCurso,
    alunos: students.filter(s => s.cursoId === c.id).length,
  }));

  // Presença distribution
  const presencaDist = [
    { range: '100%', count: students.filter(s => s.presenca === 100).length },
    { range: '75-99%', count: students.filter(s => s.presenca >= 75 && s.presenca < 100).length },
    { range: '50-74%', count: students.filter(s => s.presenca >= 50 && s.presenca < 75).length },
    { range: '<50%', count: students.filter(s => s.presenca < 50).length },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">Análise completa do sistema</p>
        <div className="flex gap-1">
          {['3m', '6m', '1a'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                period === p ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p === '3m' ? '3 Meses' : p === '6m' ? '6 Meses' : '1 Ano'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon={Users} label="Total de Alunos" value={totalAlunos} sub={`${aprovados} aprovados`} color="bg-blue-700" />
        <StatBox icon={Award} label="Certificados Emitidos" value={certificados} sub={`${taxaAprovacao}% taxa de aprovação`} color="bg-green-600" />
        <StatBox icon={BarChart3} label="Presença Média" value={`${mediaPresenca}%`} sub="de frequência" color="bg-amber-500" />
        <StatBox icon={BookOpen} label="Nota Média" value={mediaNota} sub="de 10 possíveis" color="bg-purple-600" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly area */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Evolução Mensal
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={CHART_DATA_MONTHLY}>
              <defs>
                <linearGradient id="colorAlunos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="alunos" name="Alunos" stroke={chartColors.primary} fill="url(#colorAlunos)" strokeWidth={2} />
              <Area type="monotone" dataKey="certificados" name="Certificados" stroke={chartColors.success} fill="url(#colorCerts)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Status dos Alunos
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={CHART_DATA_STATUS}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  dataKey="value"
                >
                  {CHART_DATA_STATUS.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value, entry) => `${value} (${entry.payload.value})`}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per course */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Alunos por Curso
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porCurso} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="alunos" name="Alunos" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Presença dist */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Distribuição de Presença
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={presencaDist}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Alunos" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-4">Resumo por Curso</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Curso</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Alunos</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Aprovados</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Certificados</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Média Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {courses.map(c => {
                const cs = students.filter(s => s.cursoId === c.id);
                const ap = cs.filter(s => s.statusCadastro === 'aprovado').length;
                const cert = cs.filter(s => s.statusCertificado === 'aprovado').length;
                const mn = cs.length ? (cs.reduce((a, s) => a + (s.notaProva || 0), 0) / cs.length).toFixed(1) : '-';
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{c.nomeCurso}</td>
                    <td className="py-3 text-center text-gray-600">{cs.length}</td>
                    <td className="py-3 text-center">
                      <span className="badge-green">{ap}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="badge-blue">{cert}</span>
                    </td>
                    <td className="py-3 text-center font-semibold text-gray-700">{mn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
