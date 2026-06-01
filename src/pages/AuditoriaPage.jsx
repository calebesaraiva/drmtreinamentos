import React, { useMemo, useState } from 'react';
import { RefreshCw, Download, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

function toCsv(rows = []) {
  const headers = [
    'DataHora', 'Metodo', 'Rota', 'Status', 'DuracaoMs', 'IP',
    'Usuario', 'Username', 'Perfil',
  ];
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [headers.join(';')];
  rows.forEach((item) => {
    lines.push([
      item.at,
      item.method,
      item.path,
      item.status,
      item.durationMs,
      item.ip,
      item.actor?.name,
      item.actor?.username,
      item.actor?.role,
    ].map(esc).join(';'));
  });
  return lines.join('\n');
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditoriaPage() {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    path: '',
    method: '',
    actor: '',
    status: '',
    limit: 200,
  });

  const canAccess = ['admin', 'responsavel'].includes(String(user?.role || '').toLowerCase());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getAuditLogs(filters);
      setItems(Array.isArray(result?.items) ? result.items : []);
    } catch (e) {
      setError(e?.message || 'Não foi possível carregar auditoria.');
    } finally {
      setLoading(false);
    }
  };

  const statusCount = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = String(item.status || '');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  if (!canAccess) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">Você não tem permissão para acessar a auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input-field" placeholder="Rota (/api/students)" value={filters.path} onChange={(e) => setFilters((p) => ({ ...p, path: e.target.value }))} />
          <select className="input-field" value={filters.method} onChange={(e) => setFilters((p) => ({ ...p, method: e.target.value }))}>
            <option value="">Método</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input className="input-field" placeholder="Ator (nome/username)" value={filters.actor} onChange={(e) => setFilters((p) => ({ ...p, actor: e.target.value }))} />
          <input className="input-field" placeholder="Status (200/401/500)" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} />
          <input className="input-field" type="number" min="1" max="2000" value={filters.limit} onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value || 200) }))} />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-primary text-sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => downloadCsv(`auditoria-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(items))}
            disabled={items.length === 0}
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="card text-sm">Total: <strong>{items.length}</strong></div>
        <div className="card text-sm">200: <strong>{statusCount['200'] || 0}</strong></div>
        <div className="card text-sm">4xx: <strong>{Object.entries(statusCount).filter(([k]) => k.startsWith('4')).reduce((a, [, v]) => a + v, 0)}</strong></div>
        <div className="card text-sm">5xx: <strong>{Object.entries(statusCount).filter(([k]) => k.startsWith('5')).reduce((a, [, v]) => a + v, 0)}</strong></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Eventos de auditoria</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Data/Hora', 'Método', 'Rota', 'Status', 'Duração', 'Usuário', 'Perfil', 'IP'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-sm text-gray-500 text-center">Sem eventos para os filtros selecionados.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.at ? new Date(item.at).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{item.method}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.path}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.durationMs} ms</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.actor?.name || item.actor?.username || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.actor?.role || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{item.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

