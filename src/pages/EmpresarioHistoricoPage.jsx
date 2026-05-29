import React, { useMemo, useState } from 'react';
import { Award, BookOpen, Clock3, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

function statusBadge(status) {
  if (status === 'aprovado') return 'badge-green';
  if (status === 'recusado') return 'badge-red';
  return 'badge-yellow';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${value}T12:00`).toLocaleDateString('pt-BR');
}

export default function EmpresarioHistoricoPage() {
  const { classes, students, courses, user } = useApp();
  const [q, setQ] = useState('');

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => Date.parse(b.criadoEm || b.createdAt || 0) - Date.parse(a.criadoEm || a.createdAt || 0)),
    [classes],
  );

  const filteredStudents = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => (
      String(s.nome || '').toLowerCase().includes(term)
      || String(s.cpf || '').toLowerCase().includes(term)
      || String(s.nomeCurso || '').toLowerCase().includes(term)
    ));
  }, [students, q]);

  const stats = useMemo(() => ({
    cursos: courses.length,
    turmas: classes.length,
    alunos: students.length,
    certificados: students.filter(s => s.statusCertificado === 'aprovado').length,
  }), [courses.length, classes.length, students]);

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-xl font-black text-gray-900">Histórico da sua empresa</h2>
        <p className="text-sm text-gray-500 mt-1">
          {user?.empresa ? `Empresa: ${user.empresa}` : 'Veja os últimos cursos, histórico de turmas e status de certificados dos seus funcionários.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><p className="text-xs text-gray-500">Cursos contratados</p><p className="text-2xl font-bold text-blue-700 mt-1">{stats.cursos}</p></div>
        <div className="card"><p className="text-xs text-gray-500">Turmas no histórico</p><p className="text-2xl font-bold text-slate-700 mt-1">{stats.turmas}</p></div>
        <div className="card"><p className="text-xs text-gray-500">Funcionários</p><p className="text-2xl font-bold text-emerald-700 mt-1">{stats.alunos}</p></div>
        <div className="card"><p className="text-xs text-gray-500">Certificados aprovados</p><p className="text-2xl font-bold text-amber-700 mt-1">{stats.certificados}</p></div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-gray-900">Últimos cursos / turmas</h3>
        </div>
        <div className="space-y-3">
          {sortedClasses.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-100 p-3">
              <p className="font-semibold text-gray-900">{item.nomeCurso || item.nome}</p>
              <p className="text-xs text-gray-500 mt-1">
                <Clock3 className="w-3 h-3 inline mr-1" />
                {formatDate(item.data)} • {item.local || 'Local não informado'} • {item.cargaHoraria || '-'}
              </p>
            </div>
          ))}
          {sortedClasses.length === 0 && <p className="text-sm text-gray-500">Nenhuma turma encontrada.</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-gray-900">Alunos e certificados</h3>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input-field sm:w-80" placeholder="Buscar por nome, CPF ou curso..." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                <th className="p-2">Funcionário</th>
                <th className="p-2">Curso</th>
                <th className="p-2">Data</th>
                <th className="p-2">Cadastro</th>
                <th className="p-2">Certificado</th>
                <th className="p-2">Código</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="p-2">
                    <p className="font-semibold text-gray-900">{s.nome}</p>
                    <p className="text-xs text-gray-500">{s.cpf}</p>
                  </td>
                  <td className="p-2">{s.nomeCurso || '-'}</td>
                  <td className="p-2">{formatDate(s.data)}</td>
                  <td className="p-2"><span className={statusBadge(s.statusCadastro)}>{s.statusCadastro || 'pendente'}</span></td>
                  <td className="p-2">
                    <span className={statusBadge(s.statusCertificado)}>{s.statusCertificado || 'pendente'}</span>
                    {s.statusCertificado === 'aprovado' && <Award className="w-3.5 h-3.5 inline ml-1 text-green-600" />}
                  </td>
                  <td className="p-2 text-xs font-mono text-gray-600">{s.certificadoAssinaturaCodigo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && <p className="text-sm text-gray-500 py-4">Nenhum aluno encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
