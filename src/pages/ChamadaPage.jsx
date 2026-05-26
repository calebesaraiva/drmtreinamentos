import React, { useMemo, useState } from 'react';
import { CheckCircle, ClipboardCheck, Loader2, RefreshCcw, UserCheck, UserX, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

function StatusBadge({ status }) {
  if (status === 'aprovado') return <span className="badge-green">Aprovado</span>;
  if (status === 'recusado') return <span className="badge-red">Recusado</span>;
  return <span className="badge-yellow">Pendente</span>;
}

function formatDate(date) {
  return date ? new Date(`${date}T12:00`).toLocaleDateString('pt-BR') : '-';
}

function PresenceButton({ active, tone, icon: Icon, label, onClick }) {
  const activeClass = tone === 'green'
    ? 'bg-green-600 text-white border-green-600 shadow-sm'
    : 'bg-red-600 text-white border-red-600 shadow-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
        active ? activeClass : 'bg-white text-gray-600 border-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default function ChamadaPage() {
  const { courses, students, updateAttendance, updateStudentStatus, refreshData } = useApp();
  const activeCourses = courses.filter(course => course.status === 'ativo');
  const [selectedCourseId, setSelectedCourseId] = useState(activeCourses[0]?.id || '');
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(null);

  const selectedCourse = activeCourses.find(course => String(course.id) === String(selectedCourseId));
  const courseStudents = useMemo(
    () => students.filter(student => String(student.cursoId) === String(selectedCourseId)),
    [students, selectedCourseId],
  );
  const presentStudents = courseStudents.filter(student => student.presente === true || Number(student.presenca || 0) >= 75);
  const pendingAttendance = courseStudents.filter(student => {
    const current = attendance[student.id] ?? student.presente;
    return current !== true && current !== false;
  }).length;

  const setPresence = (studentId, presente) => {
    setAttendance(prev => ({ ...prev, [studentId]: presente }));
  };

  const saveAttendance = async () => {
    if (!selectedCourseId) return;
    const payload = {};
    courseStudents.forEach(student => {
      if (attendance[student.id] !== undefined) {
        payload[student.id] = attendance[student.id];
      } else if (student.presente !== null && student.presente !== undefined) {
        payload[student.id] = student.presente;
      }
    });
    setSaving(true);
    try {
      await updateAttendance(selectedCourseId, payload);
      setAttendance({});
    } finally {
      setSaving(false);
    }
  };

  const authorizeCertificate = async (student) => {
    setProcessing(`${student.id}:approve`);
    try {
      await updateStudentStatus(student.id, 'statusCertificado', 'aprovado');
    } finally {
      setProcessing(null);
    }
  };

  const refuseCertificate = async (student) => {
    setProcessing(`${student.id}:refuse`);
    try {
      await updateStudentStatus(student.id, 'statusCertificado', 'recusado', 'Certificado recusado após conferência da chamada.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <ClipboardCheck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">Chamada por curso</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">Marque presença antes de liberar certificados</h2>
            <p className="text-sm text-gray-500 mt-1">
              Alunos ausentes são recusados automaticamente. Apenas presentes ficam aptos para liberação.
            </p>
          </div>
          <div className="w-full xl:w-[30rem] grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso ativo</label>
              <select
                className="input-field"
                value={selectedCourseId}
                onChange={event => {
                  setSelectedCourseId(event.target.value);
                  setAttendance({});
                }}
              >
                {activeCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.nomeCurso}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={refreshData} className="btn-secondary text-sm">
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {selectedCourse && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 text-sm">
            <div className="rounded-xl bg-gray-50 p-3 min-h-20">
              <p className="text-xs text-gray-400">Data</p>
              <p className="font-bold text-gray-800">{formatDate(selectedCourse.data)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 min-h-20">
              <p className="text-xs text-gray-400">Local</p>
              <p className="font-bold text-gray-800 line-clamp-2">{selectedCourse.local}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 min-h-20">
              <p className="text-xs text-gray-400">Inscritos</p>
              <p className="font-bold text-gray-800">{courseStudents.length}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 min-h-20">
              <p className="text-xs text-green-600">Presentes</p>
              <p className="font-bold text-green-700">{presentStudents.length}</p>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Lista da chamada</h3>
            <p className="text-xs text-gray-500">
              {pendingAttendance > 0 ? `${pendingAttendance} aluno(s) ainda sem marcação` : 'Todos os alunos foram marcados'}
            </p>
          </div>
          <button onClick={saveAttendance} disabled={saving || courseStudents.length === 0} className="btn-primary text-sm disabled:opacity-50 w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salvar chamada
          </button>
        </div>

        {courseStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum aluno pré-cadastrado neste curso.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
            {courseStudents.map(student => {
              const current = attendance[student.id] ?? student.presente;
              const canApprove = current === true && student.statusCertificado !== 'aprovado';
              return (
                <div key={student.id} className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900 break-words">{student.nome}</p>
                        {current === true && <span className="badge-green">Presente</span>}
                        {current === false && <span className="badge-red">Ausente</span>}
                        {current !== true && current !== false && <span className="badge-yellow">Sem chamada</span>}
                      </div>
                      <p className="text-xs text-gray-500 break-words">{student.cpf} - {student.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <StatusBadge status={student.statusCadastro} />
                        <StatusBadge status={student.statusCertificado} />
                      </div>
                    </div>

                    <div className="w-full lg:w-auto lg:min-w-[28rem]">
                      <div className="grid grid-cols-2 gap-2">
                        <PresenceButton
                          active={current === true}
                          tone="green"
                          icon={UserCheck}
                          label="Presente"
                          onClick={() => setPresence(student.id, true)}
                        />
                        <PresenceButton
                          active={current === false}
                          tone="red"
                          icon={UserX}
                          label="Ausente"
                          onClick={() => setPresence(student.id, false)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => authorizeCertificate(student)}
                          disabled={!canApprove || processing === `${student.id}:approve`}
                          className="btn-success text-sm min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === `${student.id}:approve` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Liberar
                        </button>
                        <button
                          type="button"
                          onClick={() => refuseCertificate(student)}
                          disabled={student.statusCertificado === 'recusado' || processing === `${student.id}:refuse`}
                          className="btn-danger text-sm min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === `${student.id}:refuse` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
