import React, { useMemo, useState } from 'react';
import { Download, Search, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function statusLabel(value) {
  if (value === 'aprovado') return 'Aprovado';
  if (value === 'recusado') return 'Recusado';
  return 'Pendente';
}

function toCsv(rows = []) {
  const headers = ['Nome', 'CPF', 'Empresa', 'Curso', 'Cadastro', 'Certificado'];
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [headers.join(';')];
  rows.forEach((s) => {
    lines.push([
      s.nome,
      s.cpf,
      s.empresa,
      s.nomeCurso,
      statusLabel(s.statusCadastro),
      statusLabel(s.statusCertificado),
    ].map(esc).join(';'));
  });
  return lines.join('\n');
}

function downloadCsv(name, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ConferenciaPage() {
  const { students } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('GRUPO MATEUS');

  const companyOptions = useMemo(() => {
    const values = [...new Set(students.map((s) => String(s.empresa || '').trim()).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => !companyFilter || String(s.empresa || '').toLowerCase() === companyFilter.toLowerCase())
      .filter((s) => {
        if (!q) return true;
        return [
          s.nome,
          s.cpf,
          s.empresa,
          s.nomeCurso,
        ].some((value) => String(value || '').toLowerCase().includes(q));
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }, [students, search, companyFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pendentes: filtered.filter((s) => s.statusCadastro === 'pendente').length,
    aprovados: filtered.filter((s) => s.statusCadastro === 'aprovado').length,
    recusados: filtered.filter((s) => s.statusCadastro === 'recusado').length,
  }), [filtered]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900">Conferência de Alunos por Empresa</h2>
        <p className="text-sm text-gray-500 mt-1">Valide CPF/nome e acompanhe status antes da aprovação na análise.</p>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="input-field" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">Todas as empresas</option>
            {companyOptions.map((company) => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input-field pl-9" placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => downloadCsv(`conferencia-${(companyFilter || 'todas').replace(/\s+/g, '-').toLowerCase()}.csv`, toCsv(filtered))} disabled={filtered.length === 0}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button type="button" className="btn-primary text-sm" onClick={() => navigate('/analise')}>
            <ClipboardCheck className="w-4 h-4" />
            Ir para análise
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="card text-sm">Total: <strong>{stats.total}</strong></div>
        <div className="card text-sm">Pendentes: <strong>{stats.pendentes}</strong></div>
        <div className="card text-sm">Aprovados: <strong>{stats.aprovados}</strong></div>
        <div className="card text-sm">Recusados: <strong>{stats.recusados}</strong></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Nome', 'CPF', 'Empresa', 'Curso', 'Cadastro', 'Certificado'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-gray-500 text-center">Sem alunos para os filtros selecionados.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-sm text-gray-800">{s.nome}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{s.cpf}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{s.empresa}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{s.nomeCurso}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{statusLabel(s.statusCadastro)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{statusLabel(s.statusCertificado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

