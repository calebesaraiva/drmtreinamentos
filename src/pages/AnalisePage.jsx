import React, { useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Loader2, RefreshCcw
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { MOTIVOS_RECUSA } from '../data/mockData';

function StatusBadge({ status }) {
  if (status === 'aprovado') return <span className="badge-green">Aprovado</span>;
  if (status === 'recusado') return <span className="badge-red">Recusado</span>;
  return <span className="badge-yellow">Pendente</span>;
}

function safeText(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatDateTime(dateTime) {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RecusaModal({ isOpen, onClose, onConfirm, nome, tipo, loading }) {
  const [motivo, setMotivo] = useState('');
  const [custom, setCustom] = useState('');

  const handleConfirm = () => {
    const finalMotivo = motivo === 'Outro motivo' ? custom : motivo;
    if (!finalMotivo) return;
    onConfirm(finalMotivo);
    setMotivo('');
    setCustom('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Recusar ${tipo}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Você está recusando o <strong>{tipo.toLowerCase()}</strong> de <strong>{nome}</strong>.
          Selecione o motivo:
        </p>
        <div className="space-y-2">
          {MOTIVOS_RECUSA.map(m => (
            <label key={m} className="flex items-start gap-2 cursor-pointer group">
              <input
                type="radio"
                name="motivo"
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{m}</span>
            </label>
          ))}
        </div>
        {motivo === 'Outro motivo' && (
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Descreva o motivo da recusa..."
            rows={3}
            className="input-field resize-none"
          />
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 disabled:opacity-50">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={loading || !motivo || (motivo === 'Outro motivo' && !custom)}
            className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recusando...
              </>
            ) : 'Confirmar Recusa'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AlunoCard({ aluno, onAprovar, onRecusar, processing }) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = processing?.startsWith(`${aluno.id}:`);
  const isPresent = aluno.presente === true || Number(aluno.presenca || 0) >= 75;
  const nome = safeText(aluno.nome, 'Aluno sem nome');
  const curso = safeText(aluno.nomeCurso, 'Curso não informado');
  const cpf = safeText(aluno.cpf);
  const empresa = safeText(aluno.empresa);
  const presenca = Number(aluno.presenca || 0);
  const nota = Number(aluno.notaProva || 0);

  return (
    <div className="card hover:shadow-md transition-all duration-200">
      {/* Main row */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{nome}</p>
            <p className="text-xs text-gray-500 truncate">{curso}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">CPF</p>
              <p className="text-gray-700 font-medium">{cpf}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Empresa</p>
              <p className="text-gray-700 font-medium truncate">{empresa}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Presença</p>
              <p className={`font-bold ${presenca >= 75 ? 'text-green-600' : 'text-red-600'}`}>{presenca}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Nota</p>
              <p className={`font-bold ${nota >= 6 ? 'text-green-600' : 'text-red-600'}`}>{nota}</p>
            </div>
          </div>
          {aluno.motivoRecusa && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700">Motivo da Recusa:</p>
              <p className="text-xs text-red-600 mt-0.5">{aluno.motivoRecusa}</p>
            </div>
          )}
          {aluno.certificadoAutorizadoEm && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700">Certificado autorizado</p>
              <p className="text-xs text-green-700 mt-0.5">
                {formatDateTime(aluno.certificadoAutorizadoEm)} por {aluno.certificadoAutorizadoPor || 'Responsável DRM'}
              </p>
              {aluno.certificadoAssinaturaCodigo && (
                <p className="text-xs text-green-600 font-mono mt-1">{aluno.certificadoAssinaturaCodigo}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {/* Cadastro */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cadastro</p>
            <StatusBadge status={aluno.statusCadastro} />
          </div>
          {aluno.statusCadastro === 'pendente' && (
            <div className="flex gap-2">
              <button
                onClick={() => onAprovar(aluno.id, 'statusCadastro')}
                disabled={isProcessing}
                className="btn-success text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isProcessing ? 'Salvando' : 'Autorizar aluno'}
              </button>
              <button
                onClick={() => onRecusar(aluno, 'Cadastro')}
                disabled={isProcessing}
                className="btn-danger text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" />
                Recusar
              </button>
            </div>
          )}
        </div>

        {/* Certificado */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Certificado</p>
            <StatusBadge status={aluno.statusCertificado} />
          </div>
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && isPresent && (
            <div className="flex gap-2">
              <button
                onClick={() => onAprovar(aluno.id, 'statusCertificado')}
                disabled={isProcessing}
                className="btn-success text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isProcessing ? 'Salvando' : 'Autorizar certificado'}
              </button>
              <button
                onClick={() => onRecusar(aluno, 'Certificado')}
                disabled={isProcessing}
                className="btn-danger text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" />
                Recusar
              </button>
            </div>
          )}
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && !isPresent && (
            <span className="text-xs text-amber-600 italic">Aguardando presença na chamada</span>
          )}
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro !== 'aprovado' && (
            <span className="text-xs text-gray-400 italic">Aguardando aprovação do cadastro</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalisePage() {
  const { students, classes, updateStudentStatus, updateClassStudentsStatus, refreshData, loadingData, apiError } = useApp();
  const [filter, setFilter] = useState('pendente');
  const [recusaModal, setRecusaModal] = useState(null); // { aluno, tipo }
  const [processing, setProcessing] = useState(null);
  const [recusaLoading, setRecusaLoading] = useState(false);

  const filtered = students.filter(s => {
    if (filter === 'todos') return true;
    if (filter === 'pendente') return s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente';
    if (filter === 'aprovado') return s.statusCadastro === 'aprovado';
    if (filter === 'recusado') return s.statusCadastro === 'recusado' || s.statusCertificado === 'recusado';
    return true;
  });

  const handleAprovar = async (id, field) => {
    setProcessing(`${id}:${field}`);
    try {
      await updateStudentStatus(id, field, 'aprovado');
    } finally {
      setProcessing(null);
    }
  };

  const handleRecusar = (aluno, tipo) => {
    setRecusaModal({ aluno, tipo });
  };

  const confirmRecusa = async (motivo) => {
    if (!recusaModal) return;
    const field = recusaModal.tipo === 'Cadastro' ? 'statusCadastro' : 'statusCertificado';
    setRecusaLoading(true);
    try {
      await updateStudentStatus(recusaModal.aluno.id, field, 'recusado', motivo);
      setRecusaModal(null);
    } finally {
      setRecusaLoading(false);
    }
  };

  const pendentes = students.filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente').length;
  const turmaPendentes = classes
    .map(turma => ({
      ...turma,
      students: students.filter(student => String(student.turmaId) === String(turma.id)),
    }))
    .filter(turma => turma.students.length > 0);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">Análise operacional</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">Aprove ou recuse cadastros e certificados</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cadastros entram pendentes; certificados só podem ser liberados depois da presença na chamada.
            </p>
            {apiError && <p className="text-xs text-amber-600 mt-2">{apiError}</p>}
          </div>
          <button
            type="button"
            onClick={refreshData}
            disabled={loadingData}
            className="btn-secondary text-sm w-full sm:w-auto disabled:opacity-60"
          >
            {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Atualizar análise
          </button>
        </div>
      </div>

      {/* Alert */}
      {pendentes > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendentes} item(s)</strong> aguardando análise. Revise e tome as ações necessárias.
          </p>
        </div>
      )}

      {turmaPendentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Análise por turma</h3>
            <span className="text-xs text-gray-400">{turmaPendentes.length} turma(s)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {turmaPendentes.map(turma => {
              const certPendentes = turma.students.filter(student => student.statusCadastro === 'aprovado' && student.statusCertificado === 'pendente');
              const certAprovados = turma.students.filter(student => student.statusCertificado === 'aprovado');
              const comErro = turma.students.filter(student => student.statusCadastro === 'recusado' || student.statusCertificado === 'recusado');
              return (
                <div key={turma.id} className="card space-y-4">
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase">Turma manual</p>
                    <h4 className="font-black text-gray-900">{turma.nome}</h4>
                    <p className="text-xs text-gray-500">{turma.empresa?.nome} - {turma.nomeCurso}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-gray-50 p-2"><p className="font-bold">{turma.students.length}</p><p className="text-[10px] text-gray-500">Alunos</p></div>
                    <div className="rounded-lg bg-amber-50 p-2"><p className="font-bold text-amber-700">{certPendentes.length}</p><p className="text-[10px] text-amber-600">Pendentes</p></div>
                    <div className="rounded-lg bg-green-50 p-2"><p className="font-bold text-green-700">{certAprovados.length}</p><p className="text-[10px] text-green-600">Aprovados</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateClassStudentsStatus(turma.id, { field: 'statusCertificado', value: 'aprovado' })}
                      disabled={certPendentes.length === 0}
                      className="btn-success text-xs disabled:opacity-50"
                    >
                      Aprovar certificados em lote
                    </button>
                    <button
                      type="button"
                      onClick={() => updateClassStudentsStatus(turma.id, { field: 'statusCertificado', value: 'recusado', studentIds: certPendentes.map(student => student.id), motivo: 'Recusado na análise da turma.' })}
                      disabled={certPendentes.length === 0}
                      className="btn-danger text-xs disabled:opacity-50"
                    >
                      Recusar pendentes
                    </button>
                  </div>
                  {comErro.length > 0 && <p className="text-xs text-red-600">{comErro.length} aluno(s) com recusa ou pendência impeditiva.</p>}
                  <div className="space-y-1">
                    {(turma.checklist || []).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{item.label}</span>
                        <span className={
                          item.status === 'concluido' ? 'text-green-700 font-bold' :
                          item.status === 'erro' ? 'text-red-700 font-bold' :
                          item.status === 'bloqueado' ? 'text-gray-400 font-bold' : 'text-amber-700 font-bold'
                        }>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {[
          { val: 'todos', label: 'Todos' },
          { val: 'pendente', label: 'Pendentes' },
          { val: 'aprovado', label: 'Aprovados' },
          { val: 'recusado', label: 'Recusados' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === val
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              filter === val ? 'bg-blue-600 text-blue-100' : 'bg-gray-100 text-gray-500'
            }`}>
              {val === 'todos' ? students.length :
               val === 'pendente' ? students.filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente').length :
               val === 'aprovado' ? students.filter(s => s.statusCadastro === 'aprovado').length :
               students.filter(s => s.statusCadastro === 'recusado' || s.statusCertificado === 'recusado').length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loadingData ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-gray-500 font-medium">Carregando análise...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-green-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum item para exibir</p>
          <p className="text-gray-400 text-sm">Mude o filtro ou aguarde novos cadastros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(aluno => (
            <AlunoCard
              key={aluno.id}
              aluno={aluno}
              onAprovar={handleAprovar}
              onRecusar={handleRecusar}
              processing={processing}
            />
          ))}
        </div>
      )}

      {/* Recusa modal */}
      <RecusaModal
        isOpen={!!recusaModal}
        onClose={() => setRecusaModal(null)}
        onConfirm={confirmRecusa}
        nome={recusaModal?.aluno?.nome}
        tipo={recusaModal?.tipo}
        loading={recusaLoading}
      />
    </div>
  );
}
