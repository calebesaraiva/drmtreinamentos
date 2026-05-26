import React, { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle,
  Clock3,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const TEMPLATES = {
  NR10: [
    'Introdução à segurança com eletricidade',
    'Riscos em instalações e serviços com eletricidade',
    'Técnicas de análise de risco',
    'Medidas de controle do risco elétrico',
    'Normas técnicas brasileiras e regulamentações do MTE',
    'Equipamentos de proteção coletiva e individual',
    'Rotinas de trabalho e procedimentos',
    'Documentação de instalações elétricas',
    'Riscos adicionais e combate a incêndios',
    'Acidentes de origem elétrica, primeiros socorros e responsabilidades',
  ],
  NR35: [
    'Noções de segurança de trabalho em altura',
    'Normas aplicáveis para trabalho em altura',
    'Procedimentos de segurança para trabalhos em altura',
    'Análise de riscos e fator de queda',
    'Proteção coletiva, isolamento e segurança',
    'Acesso por corda',
    'Trabalho em altura conforme NR-18',
    'Nós, voltas e sistemas de ancoragem',
    'Prática de movimentação com talabarte e linhas de segurança',
    'Proteção contra quedas e primeiros socorros',
  ],
  NR18: [
    'Plataforma de Trabalho Aéreo e aspectos regulamentares',
    'Tipos construtivos, aplicações e características operacionais',
    'Acidentes previsíveis e como evitá-los',
    'Plano de Segurança da Operação',
    'Processo de capacitação de operadores',
    'Manutenção mínima de segurança',
  ],
  NR12: [
    'Aspectos gerais, objetivos e aplicações',
    'Análise de risco e etapas de adequação',
    'Normas e dispositivos de segurança',
    'Proteções fixas e móveis',
    'Estudo de caso e exemplos práticos',
    'Arranjo físico e meios de acesso',
    'Treinamentos e capacitações',
    'Ergonomia, sinalização e procedimentos',
    'Transporte de materiais, componentes pressurizados e manutenção',
  ],
};

function detectNorm(courseName = '') {
  const match = String(courseName).toUpperCase().match(/NR\s*[- ]?\s*(\d+)/);
  return match ? `NR${match[1]}` : 'GERAL';
}

function buildDefaultSchedule(course) {
  const norm = detectNorm(course?.nomeCurso);
  const topics = TEMPLATES[norm] || [
    'Abertura do treinamento e orientações iniciais',
    'Conteúdo técnico principal',
    'Prática, dúvidas e revisão',
    'Avaliação e encerramento',
  ];

  return topics.map((titulo, index) => ({
    id: `${norm}-${index + 1}`,
    ordem: index + 1,
    titulo,
    status: 'pendente',
  }));
}

function scheduleFor(course) {
  const source = Array.isArray(course?.cronograma) && course.cronograma.length > 0
    ? course.cronograma
    : buildDefaultSchedule(course);

  return source.map((item, index) => ({
    id: item.id || `aula-${index + 1}`,
    ordem: Number(item.ordem || index + 1),
    titulo: item.titulo || `Aula ${index + 1}`,
    status: item.status || 'pendente',
    iniciadoEm: item.iniciadoEm || null,
    concluidoEm: item.concluidoEm || null,
    instrutor: item.instrutor || null,
  }));
}

function formatDate(date) {
  return date ? new Date(`${date}T12:00`).toLocaleDateString('pt-BR') : '-';
}

function StatusBadge({ status }) {
  if (status === 'concluida') return <span className="badge-green">Concluída</span>;
  if (status === 'em_andamento') return <span className="badge-yellow">Em andamento</span>;
  return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-semibold">Pendente</span>;
}

export default function CronogramaPage() {
  const { courses, updateCourseSchedule, refreshData } = useApp();
  const activeCourses = courses.filter(course => course.status === 'ativo');
  const [selectedCourseId, setSelectedCourseId] = useState(activeCourses[0]?.id || '');
  const [savingAction, setSavingAction] = useState(null);

  const selectedCourse = activeCourses.find(course => String(course.id) === String(selectedCourseId));
  const cronograma = useMemo(() => scheduleFor(selectedCourse), [selectedCourse]);
  const currentClass = cronograma.find(item => item.status === 'em_andamento');
  const nextClass = cronograma.find(item => item.status === 'pendente');
  const concluded = cronograma.filter(item => item.status === 'concluida').length;
  const progress = cronograma.length > 0 ? Math.round((concluded / cronograma.length) * 100) : 0;

  const runAction = async (action) => {
    if (!selectedCourseId) return;
    setSavingAction(action);
    try {
      await updateCourseSchedule(selectedCourseId, { action, cronograma });
      await refreshData();
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <BookOpenCheck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">Cronograma dos treinamentos</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">Controle rápido das aulas do curso</h2>
            <p className="text-sm text-gray-500 mt-1">
              O instrutor inicia e conclui cada aula; o andamento fica salvo no curso para todos os alunos.
            </p>
          </div>

          <div className="w-full xl:w-[32rem] grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso ativo</label>
              <select
                className="input-field"
                value={selectedCourseId}
                onChange={event => setSelectedCourseId(event.target.value)}
              >
                {activeCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.nomeCurso}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={refreshData} className="btn-secondary text-sm">
              <RotateCcw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {selectedCourse && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <CalendarDays className="w-4 h-4" />
                Data
              </div>
              <p className="font-bold text-gray-900 mt-1">{formatDate(selectedCourse.data)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Clock3 className="w-4 h-4" />
                Horário
              </div>
              <p className="font-bold text-gray-900 mt-1">{selectedCourse.horarioInicio || '-'} • {selectedCourse.duracao || '-'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <MapPin className="w-4 h-4" />
                Local
              </div>
              <p className="font-bold text-gray-900 mt-1">{selectedCourse.local || '-'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[24rem_minmax(0,1fr)] gap-5">
        <div className="card space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Progresso</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-4xl font-black text-gray-900">{progress}%</span>
              <span className="text-sm text-gray-500">{concluded}/{cronograma.length} aulas</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase text-blue-700">Aula atual</p>
            <p className="font-bold text-gray-900 mt-1">{currentClass?.titulo || 'Nenhuma aula em andamento'}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => runAction('start-next')}
              disabled={!nextClass || Boolean(currentClass) || savingAction !== null}
              className="btn-primary min-h-12 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAction === 'start-next' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Começar próxima aula
            </button>
            <button
              type="button"
              onClick={() => runAction('finish-current')}
              disabled={!currentClass || savingAction !== null}
              className="btn-success min-h-12 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAction === 'finish-current' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Concluir aula atual
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Aulas e conteúdos</h3>
            <p className="text-xs text-gray-500">Modelo automático por NR, salvo individualmente em cada curso.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
            {cronograma.map(item => (
              <div
                key={item.id}
                className={`rounded-2xl border p-3 sm:p-4 ${
                  item.status === 'em_andamento'
                    ? 'border-blue-200 bg-blue-50'
                    : item.status === 'concluida'
                      ? 'border-green-100 bg-green-50'
                      : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      item.status === 'concluida' ? 'bg-green-600 text-white' :
                      item.status === 'em_andamento' ? 'bg-blue-600 text-white' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.ordem}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 break-words">{item.titulo}</p>
                      {item.instrutor && <p className="text-xs text-gray-500 mt-1">Instrutor: {item.instrutor}</p>}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
