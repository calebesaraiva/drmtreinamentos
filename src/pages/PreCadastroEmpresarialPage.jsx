import React, { useMemo, useState } from 'react';
import { CheckCircle, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NR_CATALOG } from '../data/nrCatalog';

const COMPANY_SETUP_KEY = 'drmCompanyPreCadastroSetupV1';
const COMPANY_PENDING_KEY = 'drmCompanyPreCadastroPendingV1';

function newRow() {
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    nome: '',
    cpf: '',
    telefone: '',
  };
}

function loadSetup() {
  try {
    return JSON.parse(localStorage.getItem(COMPANY_SETUP_KEY) || 'null');
  } catch {
    return null;
  }
}

export default function PreCadastroEmpresarialPage() {
  const { courses, addCompanyPreRegistration, user } = useApp();
  const lockedCompany = String(user?.empresa || '').trim();
  const savedSetup = loadSetup();
  const savedPending = (() => {
    try {
      return JSON.parse(localStorage.getItem(COMPANY_PENDING_KEY) || 'null');
    } catch {
      return null;
    }
  })();

  const [form, setForm] = useState({
    codigoCatalogo: savedSetup?.codigoCatalogo || '',
    empresaNome: lockedCompany || savedSetup?.empresaNome || '',
    empresaContato: savedSetup?.empresaContato || '',
    empresaTelefone: savedSetup?.empresaTelefone || '',
    empresaEmail: savedSetup?.empresaEmail || '',
    local: '',
  });
  const [showSetupForm, setShowSetupForm] = useState(!savedSetup);
  const [setupConfirmed, setSetupConfirmed] = useState(Boolean(savedSetup));
  const [setupMessage, setSetupMessage] = useState(savedSetup ? 'Dados da empresa e curso carregados. Informe o local do treinamento e confirme.' : '');
  const [rows, setRows] = useState([newRow(), newRow()]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null);
  const [pendingRequestId, setPendingRequestId] = useState(savedPending?.classId || null);

  const catalogOptions = useMemo(() => {
    const byCode = new Map();
    NR_CATALOG.forEach((item) => byCode.set(String(item.code).toUpperCase(), item));
    courses
      .filter(course => course.tipoCurso === 'modelo' || course.codigoCatalogo)
      .forEach((course) => {
        const code = String(course.codigoCatalogo || '').toUpperCase();
        if (!code) return;
        if (!byCode.has(code)) {
          byCode.set(code, { code, nomeCurso: course.nomeCurso, duracao: course.duracao || '8 horas', descricao: course.descricao || '' });
        }
      });
    return [...byCode.values()].sort((a, b) => String(a.nomeCurso || '').localeCompare(String(b.nomeCurso || ''), 'pt-BR'));
  }, [courses]);
  const selectedCatalog = useMemo(
    () => catalogOptions.find(item => String(item.code).toUpperCase() === String(form.codigoCatalogo || '').toUpperCase()),
    [catalogOptions, form.codigoCatalogo],
  );
  const validRows = rows.filter(row => row.nome.trim() && row.cpf.trim() && row.telefone.trim());

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSetupConfirmed(false);
  };
  const updateRow = (id, field, value) => setRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));

  const canConfirmSetup = Boolean(form.codigoCatalogo && form.empresaNome.trim() && form.local.trim());
  const canSubmit = setupConfirmed && validRows.length > 0;

  const handleConfirmSetup = async () => {
    if (!canConfirmSetup) {
      setStatus({ type: 'error', text: 'Preencha empresa contratante, curso e local do treinamento.' });
      return;
    }
    setConfirming(true);
    setStatus(null);
    try {
      const result = await addCompanyPreRegistration({
        codigoCatalogo: form.codigoCatalogo,
        nomeCurso: selectedCatalog?.nomeCurso || '',
        duracao: selectedCatalog?.duracao || '',
        descricao: selectedCatalog?.descricao || '',
        empresaNome: form.empresaNome,
        empresaContato: form.empresaContato,
        empresaTelefone: form.empresaTelefone,
        empresaEmail: form.empresaEmail,
        local: form.local.trim(),
        alunos: [],
        actor: user?.name || 'Empresário',
        actorRole: user?.role || 'empresario',
      });
      if (!result?.class?.id) {
        setStatus({ type: 'error', text: 'Não foi possível criar a pendência para autorização DRM.' });
        return;
      }

      const setup = {
        codigoCatalogo: form.codigoCatalogo,
        empresaNome: form.empresaNome.trim(),
        empresaContato: form.empresaContato.trim(),
        empresaTelefone: form.empresaTelefone.trim(),
        empresaEmail: form.empresaEmail.trim(),
      };
      localStorage.setItem(COMPANY_SETUP_KEY, JSON.stringify(setup));
      localStorage.setItem(COMPANY_PENDING_KEY, JSON.stringify({ classId: result.class.id }));
      setPendingRequestId(result.class.id);
      setSetupConfirmed(true);
      setShowSetupForm(false);
      setStatus(null);
      setSetupMessage('Dados confirmados e enviados para autorização DRM. Agora cadastre os alunos e finalize o envio.');
    } finally {
      setConfirming(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      setStatus({ type: 'error', text: 'Confirme os dados do treinamento e preencha ao menos 1 aluno válido.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const result = await addCompanyPreRegistration({
        pendingRequestId,
        codigoCatalogo: form.codigoCatalogo,
        nomeCurso: selectedCatalog?.nomeCurso || '',
        duracao: selectedCatalog?.duracao || '',
        descricao: selectedCatalog?.descricao || '',
        empresaNome: form.empresaNome,
        empresaContato: form.empresaContato,
        empresaTelefone: form.empresaTelefone,
        empresaEmail: form.empresaEmail,
        local: form.local.trim(),
        alunos: validRows.map(row => ({
          nome: row.nome.trim(),
          cpf: row.cpf.trim(),
          telefone: row.telefone.trim(),
        })),
        actor: user?.name || 'Empresário',
        actorRole: user?.role || 'empresario',
      });
      if (!result) return;
      setStatus({ type: 'success', text: 'Pré-cadastro enviado. O responsável DRM vai validar os alunos para liberar a emissão/recusa.' });
      setRows([newRow(), newRow()]);
      setForm(prev => ({ ...prev, local: '' }));
      setSetupConfirmed(false);
      setPendingRequestId(null);
      localStorage.removeItem(COMPANY_PENDING_KEY);
      setSetupMessage('Para o próximo pré-cadastro, informe apenas o local do treinamento e confirme os dados.');
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível enviar o pré-cadastro.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card max-w-6xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Pré-cadastro empresarial</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fluxo rápido: confirme empresa + curso + local do treinamento, depois cadastre os alunos.
            </p>
          </div>
        </div>
      </div>

      <div className="card max-w-6xl mx-auto space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Etapa 1: Dados da empresa e treinamento</p>
          {setupMessage && <p className="text-xs text-blue-700 mt-1">{setupMessage}</p>}
          {!showSetupForm && (
            <div className="mt-3 text-sm text-blue-900">
              <p><strong>Empresa:</strong> {form.empresaNome || '-'}</p>
              <p><strong>Curso:</strong> {selectedCatalog?.nomeCurso || '-'}</p>
              <button type="button" onClick={() => setShowSetupForm(true)} className="btn-secondary text-xs mt-3">
                Editar dados salvos
              </button>
            </div>
          )}
        </div>

        {showSetupForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
              <select value={form.codigoCatalogo} onChange={(e) => updateField('codigoCatalogo', e.target.value)} className="input-field">
                <option value="">Selecione um curso</option>
                {catalogOptions.map(course => (
                  <option key={course.code} value={course.code}>{course.nomeCurso}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa contratante *</label>
              <input value={form.empresaNome} onChange={(e) => updateField('empresaNome', e.target.value)} className="input-field" disabled={Boolean(lockedCompany)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
              <input value={form.empresaContato} onChange={(e) => updateField('empresaContato', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone da empresa</label>
              <input value={form.empresaTelefone} onChange={(e) => updateField('empresaTelefone', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail da empresa</label>
              <input value={form.empresaEmail} onChange={(e) => updateField('empresaEmail', e.target.value)} className="input-field" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local do treinamento *</label>
          <input value={form.local} onChange={(e) => updateField('local', e.target.value)} className="input-field" placeholder="Ex: Unidade da empresa / sala de treinamento" />
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button type="button" onClick={handleConfirmSetup} className="btn-primary disabled:opacity-60" disabled={!canConfirmSetup || confirming}>
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirming ? 'Confirmando...' : 'Confirmar dados do treinamento'}
          </button>
        </div>

        <div className={`rounded-xl border p-4 ${setupConfirmed ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-sm font-semibold ${setupConfirmed ? 'text-green-800' : 'text-gray-700'}`}>
            Etapa 2: Cadastro de alunos {setupConfirmed ? 'liberado' : 'bloqueado até confirmar os dados acima'}
          </p>
        </div>

        {setupConfirmed && (
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Funcionários</h3>
              <button type="button" onClick={() => setRows(prev => [...prev, newRow()])} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="p-2">Nome completo *</th>
                    <th className="p-2">CPF *</th>
                    <th className="p-2">Telefone *</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="p-2"><input value={row.nome} onChange={(e) => updateRow(row.id, 'nome', e.target.value)} className="input-field" /></td>
                      <td className="p-2"><input value={row.cpf} onChange={(e) => updateRow(row.id, 'cpf', e.target.value)} className="input-field" /></td>
                      <td className="p-2"><input value={row.telefone} onChange={(e) => updateRow(row.id, 'telefone', e.target.value)} className="input-field" /></td>
                      <td className="p-2">
                        <button type="button" onClick={() => setRows(prev => prev.filter(item => item.id !== row.id))} className="text-red-600 p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">{validRows.length} funcionário(s) válidos para envio.</p>
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button type="button" onClick={submit} disabled={saving || !canSubmit} className="btn-primary disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Enviando...' : 'Enviar para validação DRM'}
          </button>
        </div>

        {status && (
          <div className={`rounded-xl border p-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
