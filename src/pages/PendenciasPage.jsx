import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function PendenciasPage() {
  const {
    classes,
    students,
    updateClassRequestStatus,
    updateStudentStatus,
    updateClassStudentsStatus,
    refreshData,
    loadingData,
  } = useApp();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  const pendingClassRequests = useMemo(
    () => classes.filter(item => String(item.origem || '') === 'pre-cadastro-empresarial' && (item.solicitacaoCursoStatus || 'pendente') === 'pendente'),
    [classes],
  );
  const pendingStudents = useMemo(
    () => students.filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente'),
    [students],
  );

  const approveAll = async () => {
    setProcessing(true);
    setStatus(null);
    try {
      for (const turma of pendingClassRequests) {
        // eslint-disable-next-line no-await-in-loop
        await updateClassRequestStatus(turma.id, { value: 'aprovado' });
      }
      for (const aluno of pendingStudents) {
        if (aluno.statusCadastro === 'pendente') {
          // eslint-disable-next-line no-await-in-loop
          await updateStudentStatus(aluno.id, 'statusCadastro', 'aprovado');
        }
        if (aluno.statusCertificado === 'pendente' && (aluno.statusCadastro === 'aprovado' || aluno.statusCadastro === 'pendente')) {
          // eslint-disable-next-line no-await-in-loop
          await updateStudentStatus(aluno.id, 'statusCertificado', 'aprovado');
        }
      }
      await refreshData();
      setStatus({ type: 'success', text: 'Todas as pendências foram aprovadas.' });
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível aprovar tudo.' });
    } finally {
      setProcessing(false);
    }
  };

  const rejectAll = async () => {
    const motivo = 'Recusado em lote pela fila única de pendências.';
    setProcessing(true);
    setStatus(null);
    try {
      for (const turma of pendingClassRequests) {
        // eslint-disable-next-line no-await-in-loop
        await updateClassRequestStatus(turma.id, { value: 'recusado', motivo });
      }
      for (const aluno of pendingStudents) {
        if (aluno.statusCadastro === 'pendente') {
          // eslint-disable-next-line no-await-in-loop
          await updateStudentStatus(aluno.id, 'statusCadastro', 'recusado', motivo);
        } else if (aluno.statusCertificado === 'pendente') {
          // eslint-disable-next-line no-await-in-loop
          await updateStudentStatus(aluno.id, 'statusCertificado', 'recusado', motivo);
        }
      }
      await refreshData();
      setStatus({ type: 'success', text: 'Pendências recusadas em lote com observação.' });
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Não foi possível recusar tudo.' });
    } finally {
      setProcessing(false);
    }
  };

  const pendingByClass = useMemo(() => {
    const map = new Map();
    pendingStudents.forEach((student) => {
      const key = String(student.turmaId || 'sem-turma');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(student);
    });
    return [...map.entries()];
  }, [pendingStudents]);

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-xl font-black text-gray-900">Fila única de pendências</h2>
        <p className="text-sm text-gray-500 mt-1">Aprovação rápida de curso, cadastro e certificado em um único fluxo.</p>
      </div>

      <div className="card flex flex-wrap gap-3">
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">Solicitações de curso pendentes</p>
          <p className="text-2xl font-bold text-amber-800">{pendingClassRequests.length}</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-700">Alunos/certificados pendentes</p>
          <p className="text-2xl font-bold text-blue-800">{pendingStudents.length}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={approveAll} disabled={processing || loadingData} className="btn-success disabled:opacity-60">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aprovar tudo
          </button>
          <button type="button" onClick={rejectAll} disabled={processing || loadingData} className="btn-danger disabled:opacity-60">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Recusar tudo
          </button>
        </div>
      </div>

      {status && (
        <div className={`rounded-xl border p-3 text-sm ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {status.text}
        </div>
      )}

      {pendingClassRequests.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3">Solicitações de curso</h3>
          <div className="space-y-2">
            {pendingClassRequests.map(item => (
              <div key={item.id} className="rounded-lg border border-gray-100 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{item.nomeCurso || item.nome}</p>
                  <p className="text-xs text-gray-500">{item.empresa?.nome || '-'} • {item.local || 'Local não informado'}</p>
                </div>
                <button type="button" onClick={() => updateClassRequestStatus(item.id, { value: 'aprovado' })} className="btn-success text-xs">Aprovar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold text-gray-900 mb-3">Pendências por turma</h3>
        {pendingByClass.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-green-600" />
            Nenhuma pendência no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingByClass.map(([classId, items]) => (
              <div key={classId} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{items[0]?.turmaNome || `Turma ${classId}`}</p>
                  <button
                    type="button"
                    onClick={() => updateClassStudentsStatus(classId, { field: 'statusCertificado', value: 'aprovado' })}
                    className="btn-success text-xs"
                  >
                    Aprovar certificados da turma
                  </button>
                </div>
                <div className="space-y-1">
                  {items.map(student => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span>{student.nome} • {student.cpf}</span>
                      <span className="text-xs text-amber-700">
                        {student.statusCadastro === 'pendente' ? 'Cadastro pendente' : 'Certificado pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

