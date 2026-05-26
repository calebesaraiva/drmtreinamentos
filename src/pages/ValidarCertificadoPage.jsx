import React, { useState } from 'react';
import { Search, ShieldCheck, XCircle } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

function formatDateTime(dateTime) {
  if (!dateTime) return '-';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ValidarCertificadoPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.validateCertificate(code.trim());
      setResult(data.certificado);
    } catch (err) {
      setError(err.message || 'Certificado não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <BrandLogo className="w-24 h-12 rounded-xl border border-gray-100 shadow-sm" />
          <a href="/cursos" className="text-sm text-blue-700 font-semibold hover:underline">Cursos ativos</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="card">
          <div className="text-center mb-6">
            <ShieldCheck className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h1 className="text-2xl font-black text-gray-900">Validação de certificado</h1>
            <p className="text-sm text-gray-500 mt-1">Digite o código de assinatura impresso no certificado.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input-field font-mono"
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase())}
              placeholder="DRM-CERT-..."
            />
            <button onClick={validate} disabled={loading} className="btn-primary sm:w-40">
              <Search className="w-4 h-4" />
              Validar
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 flex gap-3 text-red-700">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800 mb-3">
                <ShieldCheck className="w-5 h-5" />
                <p className="font-bold">Certificado válido</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <p><span className="font-semibold text-gray-600">Aluno:</span> {result.aluno}</p>
                <p><span className="font-semibold text-gray-600">CPF:</span> {result.cpf}</p>
                <p className="sm:col-span-2"><span className="font-semibold text-gray-600">Curso:</span> {result.curso}</p>
                <p><span className="font-semibold text-gray-600">Local:</span> {result.local}</p>
                <p><span className="font-semibold text-gray-600">Autorizado em:</span> {formatDateTime(result.autorizadoEm)}</p>
                <p className="sm:col-span-2"><span className="font-semibold text-gray-600">Código:</span> <span className="font-mono">{result.codigo}</span></p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
