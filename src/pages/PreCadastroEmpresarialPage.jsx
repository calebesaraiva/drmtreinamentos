import React, { useMemo, useState } from 'react';
import { CheckCircle, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

function newRow() {
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    nome: '',
    cpf: '',
    telefone: '',
  };
}

export default function PreCadastroEmpresarialPage() {
  const { courses, addCompanyPreRegistration, user } = useApp();
  const [form, setForm] = useState({
    cursoId: '',
    empresaNome: '',
    empresaContato: '',
    empresaTelefone: '',
    empresaEmail: '',
    data: '',
    local: '',
    horarioInicio: '',
  });
  const [rows, setRows] = useState([newRow(), newRow()]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const lockedCompany = String(user?.empresa || '').trim();

  const activeCourses = useMemo(
    () => courses.filter(course => course.status !== 'inativo'),
    [courses],
  );
  const selectedCourse = useMemo(
    () => courses.find(course => String(course.id) === String(form.cursoId)),
    [courses, form.cursoId],
  );

  const validRows = rows.filter(row => row.nome.trim() && row.cpf.trim() && row.telefone.trim());

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateRow = (id, field, value) => setRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));

  const handleCourseChange = (value) => {
    const selected = courses.find(course => String(course.id) === String(value));
    setForm(prev => ({
      ...prev,
      cursoId: value,
      data: prev.data || selected?.data || '',
      local: prev.local || selected?.local || '',
      horarioInicio: prev.horarioInicio || selected?.horarioInicio || '',
    }));
  };

  const canSubmit = Boolean(
    form.cursoId && form.empresaNome.trim() && validRows.length > 0,
  );

  React.useEffect(() => {
    if (lockedCompany) {
      setForm(prev => ({ ...prev, empresaNome: prev.empresaNome || lockedCompany }));
    }
  }, [lockedCompany]);

  const submit = async () => {
    if (!canSubmit) {
      setStatus({ type: 'error', text: 'Preencha curso, empresa e pelo menos 1 funcionário válido.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const result = await addCompanyPreRegistration({
        cursoId: form.cursoId,
        empresaNome: form.empresaNome,
        empresaContato: form.empresaContato,
        empresaTelefone: form.empresaTelefone,
        empresaEmail: form.empresaEmail,
        data: form.data || selectedCourse?.data || '',
        local: form.local || selectedCourse?.local || '',
        horarioInicio: form.horarioInicio || selectedCourse?.horarioInicio || '',
        duracao: selectedCourse?.duracao || '',
        alunos: validRows.map(row => ({
          nome: row.nome.trim(),
          cpf: row.cpf.trim(),
          telefone: row.telefone.trim(),
        })),
        actor: user?.name || 'Empresário',
        actorRole: user?.role || 'empresario',
      });
      if (!result) return;
      setStatus({ type: 'success', text: 'Pré-cadastro enviado. Agora o responsável DRM pode validar os alunos na tela de Análise.' });
      setRows([newRow(), newRow()]);
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
            <p className="text-sm text-gray-500 mt-1">Cadastre funcionários da sua empresa para o curso. O responsável DRM fará validação e liberação dos certificados.</p>
          </div>
        </div>
      </div>

      <div className="card max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
            <select value={form.cursoId} onChange={(e) => handleCourseChange(e.target.value)} className="input-field">
              <option value="">Selecione um curso</option>
              {activeCourses.map(course => (
                <option key={course.id} value={course.id}>{course.nomeCurso}</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone empresa</label>
            <input value={form.empresaTelefone} onChange={(e) => updateField('empresaTelefone', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail empresa</label>
            <input value={form.empresaEmail} onChange={(e) => updateField('empresaEmail', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do curso</label>
            <input type="date" value={form.data} onChange={(e) => updateField('data', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário de início</label>
            <input type="time" value={form.horarioInicio} onChange={(e) => updateField('horarioInicio', e.target.value)} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input value={form.local} onChange={(e) => updateField('local', e.target.value)} className="input-field" />
          </div>
        </div>

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
