import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function PrimeiroAcessoPage() {
  const { user, changeOwnPassword } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ senha: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.senha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (form.senha !== form.confirmar) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    const result = await changeOwnPassword(form.senha);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Não foi possível alterar a senha.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-xl font-bold text-gray-900">Primeiro acesso</h1>
        <p className="text-sm text-gray-500 mt-1">
          Para segurança, defina sua senha fixa antes de continuar.
        </p>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm(prev => ({ ...prev, senha: e.target.value }))}
                className="input-field pl-9"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={form.confirmar}
                onChange={(e) => setForm(prev => ({ ...prev, confirmar: e.target.value }))}
                className="input-field pl-9"
                placeholder="Repita a senha"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

