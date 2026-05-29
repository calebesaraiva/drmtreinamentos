import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ShieldCheck, UserCog, Trash2, Power, Loader2, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';

const initialForm = {
  name: '',
  username: '',
  email: '',
  empresa: '',
  password: '',
  role: 'instrutor',
  tipo: 'usuario',
  status: 'ativo',
};

export default function UsuariosPage() {
  const { user, systemUsers, refreshSystemUsers, addSystemUser, updateSystemUser, toggleSystemUserStatus, removeSystemUser, addNotification } = useApp();
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    empresa: '',
    role: 'usuario',
    status: 'ativo',
    password: '',
  });
  const [editingSave, setEditingSave] = useState(false);

  const isAllowed = user?.role === 'admin' || user?.role === 'responsavel';

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      if (!isAllowed) {
        setLoading(false);
        return;
      }
      await refreshSystemUsers();
      if (!ignore) setLoading(false);
    }
    loadUsers();
    return () => {
      ignore = true;
    };
  }, [isAllowed, refreshSystemUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return systemUsers;
    return systemUsers.filter(item => (
      item.name.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q)
    ));
  }, [search, systemUsers]);

  const pendingBusinessUsers = useMemo(
    () => systemUsers.filter(item => item.role === 'empresario' && item.status === 'pendente').length,
    [systemUsers],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await addSystemUser(form);
    setSaving(false);
    if (!result?.success) return;
    setForm(initialForm);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name || '',
      username: item.username || '',
      email: item.email || '',
      empresa: item.empresa || '',
      role: item.role || 'usuario',
      status: item.status || 'ativo',
      password: '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      username: '',
      email: '',
      empresa: '',
      role: 'usuario',
      status: 'ativo',
      password: '',
    });
  };

  const saveEdit = async (id) => {
    setEditingSave(true);
    const changingPassword = Boolean(editForm.password.trim());
    const payload = {
      name: editForm.name,
      username: editForm.username,
      email: editForm.email,
      empresa: editForm.empresa,
      role: editForm.role,
      status: editForm.status,
    };
    if (editForm.password.trim()) payload.password = editForm.password.trim();
    const result = await updateSystemUser(id, payload);
    setEditingSave(false);
    if (!result) return;
    if (changingPassword) {
      addNotification('Senha do usuário alterada com sucesso.', 'success');
    }
    cancelEdit();
  };

  if (!isAllowed) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">Você não tem permissão para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold uppercase">Administração</span>
        </div>
        <h2 className="text-xl font-black text-gray-900">Usuários e Instrutores</h2>
        <p className="text-sm text-gray-500 mt-1">Cadastre novos acessos e gerencie os usuários do sistema.</p>
        {pendingBusinessUsers > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {pendingBusinessUsers} empresário(s) aguardando aprovação de primeiro acesso.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-blue-700" />
          Novo cadastro
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Nome completo" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
          <input className="input-field" placeholder="Usuário de login" value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} />
          <input type="email" className="input-field" placeholder="E-mail" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
          <input className="input-field" placeholder="Empresa (para perfil Empresário)" value={form.empresa} onChange={(e) => setForm(p => ({ ...p, empresa: e.target.value }))} />
          <input type="password" className="input-field" placeholder="Senha (mínimo 6 caracteres)" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} />
          <select className="input-field" value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="instrutor">Instrutor</option>
            <option value="usuario">Usuário</option>
            <option value="empresario">Empresário</option>
            <option value="responsavel">Responsável</option>
            <option value="admin">Administrador</option>
          </select>
          <select className="input-field" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="ativo">ativo</option>
            <option value="pendente">pendente</option>
            <option value="inativo">inativo</option>
          </select>
        </div>
        <button type="submit" className="btn-primary disabled:opacity-60" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Cadastrando...' : 'Cadastrar usuário'}
        </button>
      </form>

      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h3 className="font-bold text-gray-900">Gerenciar cadastros</h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por nome, usuário, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando usuários...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-2">Nome</th>
                <th className="py-2 pr-2">Usuário</th>
                <th className="py-2 pr-2">Perfil</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-2 pr-2">
                    {editingId === item.id ? (
                      <input
                        className="input-field text-sm"
                        value={editForm.name}
                        onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                      />
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.email}</p>
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-gray-700">
                    {editingId === item.id ? (
                      <input
                        className="input-field text-sm"
                        value={editForm.username}
                        onChange={(e) => setEditForm(p => ({ ...p, username: e.target.value }))}
                      />
                    ) : item.username}
                  </td>
                  <td className="py-2 pr-2 capitalize">
                    {editingId === item.id ? (
                      <select
                        className="input-field text-sm"
                        value={editForm.role}
                        onChange={(e) => setEditForm(p => ({ ...p, role: e.target.value }))}
                      >
                        <option value="instrutor">Instrutor</option>
                        <option value="usuario">Usuário</option>
                        <option value="empresario">Empresário</option>
                        <option value="responsavel">Responsável</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : item.role}
                  </td>
                  <td className="py-2 pr-2">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <select
                          className="input-field text-sm"
                          value={editForm.status}
                          onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                        >
                          <option value="ativo">ativo</option>
                          <option value="pendente">pendente</option>
                          <option value="inativo">inativo</option>
                        </select>
                        <input
                          type="password"
                          className="input-field text-sm"
                          value={editForm.password}
                          onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Nova senha (opcional)"
                        />
                        {editForm.password.trim() && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                            A senha será atualizada quando você clicar em Salvar.
                          </p>
                        )}
                        <input
                          type="email"
                          className="input-field text-sm"
                          value={editForm.email}
                          onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="E-mail"
                        />
                        <input
                          className="input-field text-sm"
                          value={editForm.empresa}
                          onChange={(e) => setEditForm(p => ({ ...p, empresa: e.target.value }))}
                          placeholder="Empresa"
                        />
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'ativo' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" onClick={async () => { await saveEdit(item.id); }} disabled={editingSave} className="btn-primary text-xs py-1.5 px-2.5 disabled:opacity-60">
                            {editingSave ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Salvar
                          </button>
                          <button type="button" onClick={cancelEdit} className="btn-secondary text-xs py-1.5 px-2.5">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(item)} className="btn-secondary text-xs py-1.5 px-2.5">
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          {item.role === 'empresario' && item.status === 'pendente' && (
                            <button
                              type="button"
                              onClick={async () => { await updateSystemUser(item.id, { status: 'ativo' }); }}
                              className="btn-success text-xs py-1.5 px-2.5"
                            >
                              Aprovar acesso
                            </button>
                          )}
                          <button type="button" onClick={async () => { await toggleSystemUserStatus(item.id); }} className="btn-secondary text-xs py-1.5 px-2.5">
                            <Power className="w-3.5 h-3.5" />
                            {item.status === 'ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button type="button" onClick={async () => { await removeSystemUser(item.id); }} className="btn-danger text-xs py-1.5 px-2.5">
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
