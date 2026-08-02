import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, Check, CheckCircle2, ChevronDown, Circle, CircleHelp, Clock3, Download,
  ExternalLink, FileText, Headphones, ListChecks, Mail, MessageSquare, Play, Video, XCircle,
} from 'lucide-react';
import Modal from '../components/Modal';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

const SECTION_META = {
  '/aluno/dashboard': { title: 'Dashboard', subtitle: 'Acompanhe seu curso, progresso e próximos passos.' },
  '/aluno/meus-cursos': { title: 'Meus Cursos', subtitle: 'Veja os treinamentos disponíveis e o andamento de cada um.' },
  '/aluno/recursos-didaticos': { title: 'Recursos Didáticos', subtitle: 'Acesse slides, vídeos, atividades, materiais de apoio e avaliações do seu curso.' },
  '/aluno/atividades': { title: 'Atividades', subtitle: 'Gerencie quizzes, estudos de caso e exercícios práticos do curso.' },
  '/aluno/avaliacoes': { title: 'Avaliações', subtitle: 'Acompanhe nota mínima, critérios e pendências para aprovação final.' },
  '/aluno/certificados': { title: 'Certificados', subtitle: 'Consulte o status de liberação e os requisitos para emissão.' },
  '/aluno/mensagens': { title: 'Mensagens', subtitle: 'Centralize recados do curso e avisos importantes da DRM.' },
  '/aluno/forum-suporte': { title: 'Fórum / Suporte', subtitle: 'Encontre ajuda, canais de contato e apoio do treinamento.' },
  '/aluno/faq': { title: 'FAQ', subtitle: 'Consulte respostas rápidas sobre acesso, aulas e conclusão do curso.' },
};

function formatDateLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

function createPrintableDocument(title, subtitle, bodyLines = []) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=800');
  if (!popup) return;
  popup.document.write(`
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Manrope, Arial, sans-serif; margin: 32px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 12px; color: #4b5563; }
          li { margin: 0 0 8px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <ul>${bodyLines.map((line) => `<li>${line}</li>`).join('')}</ul>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function formatActivityStatus(status) {
  if (status === 'em_andamento') return 'Em andamento';
  if (status === 'concluida' || status === 'concluido') return 'Concluída';
  return 'Pendente';
}

function ValidationIcon({ status }) {
  if (status === 'concluido') return <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />;
  if (status === 'atencao') return <Circle className="h-4 w-4 text-[#ff7a00]" />;
  return <Circle className="h-4 w-4 text-[#c3c8d2]" />;
}

function StudentCard({ title, children, action, className = '' }) {
  return (
    <section className={`rounded-[22px] border border-[#ece5da] bg-white p-4 shadow-[0_10px_30px_rgba(16,24,40,0.05)] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-[#172033]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DashboardMetric({ label, value, hint, accent = 'text-[#172033]' }) {
  return (
    <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{label}</p>
      <p className={`mt-2 text-[28px] font-extrabold leading-none ${accent}`}>{value}</p>
      {hint ? <p className="mt-2 text-[13px] text-[#6b7280]">{hint}</p> : null}
    </div>
  );
}

export default function RecursosDidaticosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = SECTION_META[location.pathname] || SECTION_META['/aluno/recursos-didaticos'];
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [modal, setModal] = useState({ type: '', payload: null });

  useEffect(() => {
    let ignore = false;
    async function loadPortal() {
      setLoading(true);
      setError('');
      try {
        const result = await api.getStudentPortal();
        if (!ignore) setPortal(result);
      } catch (err) {
        if (!ignore) setError(err?.message || 'Não foi possível carregar a área do aluno.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadPortal();
    return () => { ignore = true; };
  }, []);

  const patchPortal = async (payload) => {
    if (!portal?.activeCourseId) return;
    setSaving(true);
    try {
      const result = await api.updateStudentPortal({ courseId: portal.activeCourseId, ...payload });
      setPortal(result);
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar o progresso.');
    } finally {
      setSaving(false);
    }
  };

  const visibleLessons = useMemo(() => {
    if (!portal?.lessons) return [];
    return showAllLessons ? portal.lessons : portal.lessons.slice(0, 4);
  }, [portal, showAllLessons]);

  const activeLesson = useMemo(() => portal?.lessons?.find((lesson) => lesson.status === 'atual') || portal?.lessons?.[0], [portal]);
  const activeCourse = useMemo(() => portal?.courses?.find((course) => course.id === portal.activeCourseId), [portal]);
  const faqs = useMemo(() => ([
    { q: 'Como avanço para a próxima aula?', a: 'Conclua a aula atual, registre as atividades obrigatórias e mantenha seu progresso em dia.' },
    { q: 'Quando o certificado é liberado?', a: 'Quando todos os critérios do curso forem atendidos, incluindo presença, progresso e avaliação final.' },
    { q: 'Onde encontro meus materiais?', a: 'Na aba Recursos Didáticos você pode abrir slides, vídeos e anexos de apoio do curso ativo.' },
  ]), []);

  const messageItems = [
    { title: 'Atualização do curso', text: 'Seu curso ativo foi sincronizado e os materiais mais recentes já estão disponíveis.', tone: 'bg-[#fff7ef] text-[#ff7a00]' },
    { title: 'Acompanhamento DRM', text: 'Continue registrando suas aulas para manter a validação do aprendizado completa.', tone: 'bg-[#eef4ff] text-[#1d4ed8]' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f6f1ea] p-6">
        <div className="rounded-[22px] border border-[#ece5da] bg-white px-7 py-6 text-center shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
          <p className="text-base font-bold text-[#1f2937]">Carregando área do aluno...</p>
          <p className="mt-2 text-sm text-[#6b7280]">Preparando seu ambiente de aprendizagem.</p>
        </div>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f6f1ea] p-6">
        <div className="max-w-md rounded-[22px] border border-[#f3d1d1] bg-white px-7 py-6 text-center shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
          <XCircle className="mx-auto h-9 w-9 text-red-500" />
          <p className="mt-4 text-base font-bold text-[#1f2937]">Não foi possível abrir a área do aluno</p>
          <p className="mt-2 text-sm text-[#6b7280]">{error || 'Tente novamente em instantes.'}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#ff7a00] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e86f00]">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
      <StudentCard title="Visão geral do curso">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric label="Progresso" value={`${portal.summary.completionPercent}%`} hint="Concluído até agora" accent="text-[#ff7a00]" />
          <DashboardMetric label="Aulas" value={portal.summary.completedLessonsLabel} hint="Concluídas" />
          <DashboardMetric label="Carga horária" value={portal.summary.totalDurationLabel} hint="Total do curso" />
          <DashboardMetric label="Status" value={portal.summary.statusLabel} hint={portal.summary.encouragement} accent="text-[#16a34a]" />
        </div>
      </StudentCard>

      <StudentCard title="Próximo passo">
        <div className="space-y-3">
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Próxima aula</p>
            <p className="mt-2 text-[18px] font-extrabold leading-6 text-[#172033]">{portal.nextLesson.title}</p>
            <p className="mt-2 text-[13px] text-[#6b7280]">{portal.nextLesson.type} • {portal.nextLesson.duration}</p>
          </div>
          <button type="button" onClick={() => patchPortal({ action: 'complete-lesson', lessonOrder: activeLesson?.order || 1 })} className="flex h-[42px] items-center gap-2 rounded-[14px] bg-[#ff7a00] px-4 text-sm font-bold text-white transition hover:bg-[#e86f00]">
            Continuar trilha
            <Play className="h-4 w-4" fill="currentColor" />
          </button>
        </div>
      </StudentCard>

      <StudentCard title="Trilha atual">
        <div className="space-y-2.5">
          {visibleLessons.map((lesson) => {
            const isDone = lesson.status === 'concluida';
            const isCurrent = lesson.status === 'atual';
            return (
              <div key={lesson.id} className="flex items-start gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-3.5 py-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${isDone ? 'bg-[#16a34a] text-white' : isCurrent ? 'bg-[#ff7a00] text-white' : 'bg-[#eceff4] text-[#6b7280]'}`}>
                  {isDone ? <Check className="h-4 w-4" /> : lesson.order}
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-bold ${isCurrent ? 'text-[#ff7a00]' : 'text-[#172033]'}`}>Aula {lesson.order}</p>
                  <p className={`text-[14px] font-semibold leading-5 ${isCurrent ? 'text-[#ff7a00]' : 'text-[#172033]'}`}>{lesson.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </StudentCard>

      <StudentCard title="Validação do aprendizado">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {portal.validation.slice(0, 6).map((item) => (
            <div key={item.id} className="flex gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-3.5 py-3">
              <ValidationIcon status={item.status} />
              <div>
                <p className="text-[13px] font-extrabold text-[#172033]">{item.title}</p>
                <p className="text-[12px] text-[#6b7280]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </StudentCard>
    </div>
  );

  const renderCourses = () => (
    <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
      <StudentCard title="Cursos disponíveis">
        <div className="space-y-3">
          {portal.courses.map((course) => {
            const active = course.id === portal.activeCourseId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => patchPortal({ action: 'select-course', courseId: course.id })}
                className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${active ? 'border-[#ffb26b] bg-[#fff7ef] shadow-sm' : 'border-[#eee6dd] bg-[#fffdfa] hover:bg-white'}`}
              >
                <p className="text-[14px] font-extrabold text-[#172033]">{course.title}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">{course.subtitle}</p>
              </button>
            );
          })}
        </div>
      </StudentCard>
      <StudentCard title="Resumo do curso ativo">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Curso</p>
            <p className="mt-2 text-[18px] font-extrabold text-[#172033]">{activeCourse?.title}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Status</p>
            <p className="mt-2 text-[18px] font-extrabold text-[#16a34a]">{portal.summary.statusLabel}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Andamento</p>
            <p className="mt-2 text-[18px] font-extrabold text-[#ff7a00]">{portal.summary.completionPercent}%</p>
          </div>
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Próxima aula</p>
            <p className="mt-2 text-[15px] font-extrabold text-[#172033]">{portal.nextLesson.title}</p>
          </div>
        </div>
      </StudentCard>
    </div>
  );

  const renderResources = () => (
    <div className="grid gap-3 xl:grid-cols-[0.98fr_1.02fr_1fr]">
      <StudentCard
        title="Trilha de Aprendizagem"
        action={(
          <button type="button" onClick={() => setShowAllLessons((value) => !value)} className="text-[12px] font-semibold text-[#6b7280]">
            {showAllLessons ? 'Mostrar menos' : 'Ver todas'}
          </button>
        )}
      >
        <div className="space-y-2.5">
          {visibleLessons.map((lesson) => {
            const isDone = lesson.status === 'concluida';
            const isCurrent = lesson.status === 'atual';
            return (
              <div key={lesson.id} className="flex items-start gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-3.5 py-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${isDone ? 'bg-[#16a34a] text-white' : isCurrent ? 'bg-[#ff7a00] text-white' : 'bg-[#eceff4] text-[#6b7280]'}`}>
                  {isDone ? <Check className="h-4 w-4" /> : lesson.order}
                </div>
                <div>
                  <p className={`text-[12px] font-bold ${isCurrent ? 'text-[#ff7a00]' : 'text-[#172033]'}`}>Aula {lesson.order}</p>
                  <p className={`text-[14px] font-semibold leading-5 ${isCurrent ? 'text-[#ff7a00]' : 'text-[#172033]'}`}>{lesson.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </StudentCard>

      <StudentCard title="Slides da Aula">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.92fr]">
          <button type="button" onClick={() => setModal({ type: 'slides', payload: portal.slides })} className="overflow-hidden rounded-[20px] bg-[#0d1420] text-left shadow-[0_16px_36px_rgba(15,23,42,0.22)]">
            <div className="relative h-[220px] px-5 py-4">
              <div className="absolute inset-y-0 right-0 w-[38%] bg-[linear-gradient(155deg,transparent_0%,transparent_18%,rgba(255,122,0,0.18)_18%,rgba(255,122,0,0.7)_100%)]" />
              <div className="relative z-[1] flex h-full flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff9d3f]">DRM</span>
                <div>
                  <p className="text-[18px] font-black text-[#ff9d3f]">{activeCourse?.title?.match(/NR[-\s]?\d+/i)?.[0] || 'NR'}</p>
                  <p className="mt-2 max-w-[200px] text-[18px] font-black leading-[1.08] text-white">{portal.slides.title}</p>
                </div>
              </div>
            </div>
          </button>
          <div className="space-y-3">
            <div>
              <p className="text-[12px] font-extrabold text-[#ff7a00]">Aula {portal.slides.lessonOrder}</p>
              <h3 className="mt-1 text-[20px] font-extrabold leading-tight text-[#172033]">{portal.slides.title}</h3>
              <p className="mt-2 text-[13px] text-[#6b7280]">Atualizado em {formatDateLabel(portal.slides.updatedAt)}</p>
            </div>
            <button type="button" onClick={() => setModal({ type: 'slides', payload: portal.slides })} className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#ff7a00] text-sm font-bold text-white transition hover:bg-[#e86f00]">
              <ExternalLink className="h-4 w-4" />
              Abrir slides
            </button>
            <button type="button" onClick={() => createPrintableDocument(`Slides - Aula ${portal.slides.lessonOrder}`, activeCourse?.title || 'Curso DRM', portal.slides.bullets || [])} className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#ece7df] text-sm font-bold text-[#374151] transition hover:bg-[#faf7f3]">
              <Download className="h-4 w-4" />
              Baixar PDF
            </button>
          </div>
        </div>
      </StudentCard>

      <div className="grid gap-3">
        <StudentCard title="Vídeo da Aula">
          <button type="button" onClick={() => setModal({ type: 'video', payload: portal.video })} className="w-full overflow-hidden rounded-[20px] border border-[#e8dfd3] bg-[#0f172a] text-left shadow-[0_16px_36px_rgba(15,23,42,0.22)]">
            <div className="relative h-[210px] bg-[linear-gradient(125deg,rgba(15,23,42,0.96),rgba(51,65,85,0.72)),radial-gradient(circle_at_top_right,rgba(255,122,0,0.24),transparent_35%)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#111827] shadow-2xl">
                  <Play className="ml-1 h-6 w-6" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-4 py-4 text-[11px] font-semibold text-white/85">
                <div className="h-1.5 rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#ff7a00]" style={{ width: `${Math.max(16, portal.summary.completionPercent)}%` }} />
                </div>
                <div className="mt-2 flex justify-between">
                  <span>00:00</span>
                  <span>{portal.video.duration}</span>
                </div>
              </div>
            </div>
          </button>
          <h3 className="mt-3 text-[18px] font-extrabold leading-tight text-[#172033]">{portal.video.title}</h3>
          <p className="mt-2 text-[13px] leading-6 text-[#6b7280]">{portal.video.description}</p>
        </StudentCard>

        <StudentCard title="Materiais de apoio">
          <div className="space-y-2.5">
            {portal.materials.map((material) => (
              <div key={material.id} className="flex items-center gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${material.color}16`, color: material.color }}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-[#172033]">{material.title}</p>
                  <p className="text-[11px] text-[#6b7280]">{material.format} · {material.sizeLabel}</p>
                </div>
                <button type="button" onClick={() => setModal({ type: 'material', payload: material })} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#ece7df] text-[#4b5563] transition hover:bg-[#faf7f3]">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </StudentCard>
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
      <StudentCard title="Atividades do curso">
        <div className="space-y-3">
          {portal.activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
                <CircleHelp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-[#172033]">{activity.title}</p>
                <p className="text-[12px] text-[#6b7280]">{activity.subtitle}</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => patchPortal({ action: activity.status === 'em_andamento' ? 'advance-activity' : 'start-activity', activityId: activity.id })}
                className={`rounded-[12px] px-3 py-2 text-[11px] font-bold transition ${
                  activity.status === 'em_andamento'
                    ? 'bg-[#fff1e3] text-[#ff7a00]'
                    : activity.status === 'concluida'
                      ? 'bg-[#e8f7ee] text-[#1f9d57]'
                      : 'bg-[#f3f4f6] text-[#6b7280]'
                }`}
              >
                {formatActivityStatus(activity.status)}
              </button>
            </div>
          ))}
        </div>
      </StudentCard>
      <StudentCard title="Critérios para avançar">
        <div className="space-y-2.5">
          {[
            'Concluir a aula atual dentro da trilha.',
            'Responder as atividades obrigatórias da etapa.',
            'Manter os registros de estudo e progresso atualizados.',
            'Atender aos critérios de validação do curso.',
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#ff7a00]" />
              <p className="text-[13px] text-[#4b5563]">{item}</p>
            </div>
          ))}
        </div>
      </StudentCard>
    </div>
  );

  const renderAssessments = () => (
    <StudentCard title="Painel de avaliações">
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {portal.validation.map((item) => (
          <div key={item.id} className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <div className="flex items-center gap-2">
              <ValidationIcon status={item.status} />
              <p className="text-[13px] font-extrabold text-[#172033]">{item.title}</p>
            </div>
            <p className="mt-3 text-[13px] text-[#6b7280]">{item.detail}</p>
          </div>
        ))}
      </div>
    </StudentCard>
  );

  const renderCertificates = () => (
    <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
      <StudentCard title="Status do certificado">
        <div className="space-y-3">
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Curso ativo</p>
            <p className="mt-2 text-[18px] font-extrabold text-[#172033]">{activeCourse?.title}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Liberação</p>
            <p className="mt-2 text-[18px] font-extrabold text-[#ff7a00]">Aguardando critérios finais</p>
            <p className="mt-2 text-[13px] text-[#6b7280]">Conclua as pendências abaixo para liberar a emissão.</p>
          </div>
        </div>
      </StudentCard>
      <StudentCard title="Checklist para emissão">
        <div className="space-y-2.5">
          {portal.validation.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-3">
              <ValidationIcon status={item.status} />
              <div>
                <p className="text-[13px] font-extrabold text-[#172033]">{item.title}</p>
                <p className="text-[12px] text-[#6b7280]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </StudentCard>
    </div>
  );

  const renderMessages = () => (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
      <StudentCard title="Mensagens recentes">
        <div className="space-y-3">
          {messageItems.map((item) => (
            <div key={item.title} className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-3">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${item.tone}`}>{item.title}</div>
              <p className="mt-3 text-[13px] leading-6 text-[#4b5563]">{item.text}</p>
            </div>
          ))}
        </div>
      </StudentCard>
      <StudentCard title="Caixa de entrada">
        <div className="rounded-[18px] border border-dashed border-[#e0d4c6] bg-[#fffdfa] px-4 py-8 text-center">
          <Mail className="mx-auto h-7 w-7 text-[#ff7a00]" />
          <p className="mt-3 text-[14px] font-bold text-[#172033]">Nenhuma ação urgente</p>
          <p className="mt-2 text-[13px] text-[#6b7280]">Quando houver novos avisos da DRM ou do suporte, eles aparecerão aqui.</p>
        </div>
      </StudentCard>
    </div>
  );

  const renderSupport = () => (
    <div className="grid gap-3 xl:grid-cols-3">
      <StudentCard title="Fórum">
        <p className="text-[13px] leading-6 text-[#6b7280]">{portal.support.forumDescription}</p>
        <button type="button" className="mt-4 rounded-[14px] border border-[#ece7df] px-4 py-2.5 text-sm font-bold text-[#172033] transition hover:bg-[#faf7f3]">Acessar fórum</button>
      </StudentCard>
      <StudentCard title="Suporte DRM">
        <p className="text-[13px] leading-6 text-[#6b7280]">{portal.support.helpDescription}</p>
        <button type="button" className="mt-4 rounded-[14px] border border-[#ece7df] px-4 py-2.5 text-sm font-bold text-[#172033] transition hover:bg-[#faf7f3]">Abrir chamado</button>
      </StudentCard>
      <StudentCard title="FAQ rápido">
        <p className="text-[13px] leading-6 text-[#6b7280]">{portal.support.faqDescription}</p>
        <button type="button" onClick={() => navigate('/aluno/faq')} className="mt-4 rounded-[14px] border border-[#ece7df] px-4 py-2.5 text-sm font-bold text-[#172033] transition hover:bg-[#faf7f3]">Ver perguntas</button>
      </StudentCard>
    </div>
  );

  const renderFaq = () => (
    <StudentCard title="Perguntas frequentes">
      <div className="space-y-3">
        {faqs.map((item) => (
          <div key={item.q} className="rounded-[18px] border border-[#eee6dd] bg-[#fffdfa] px-4 py-4">
            <p className="text-[14px] font-extrabold text-[#172033]">{item.q}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#6b7280]">{item.a}</p>
          </div>
        ))}
      </div>
    </StudentCard>
  );

  const contentByPath = {
    '/aluno/dashboard': renderDashboard(),
    '/aluno/meus-cursos': renderCourses(),
    '/aluno/recursos-didaticos': renderResources(),
    '/aluno/atividades': renderActivities(),
    '/aluno/avaliacoes': renderAssessments(),
    '/aluno/certificados': renderCertificates(),
    '/aluno/mensagens': renderMessages(),
    '/aluno/forum-suporte': renderSupport(),
    '/aluno/faq': renderFaq(),
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(255,122,0,0.07),_transparent_26%),linear-gradient(180deg,#faf7f2_0%,#f6f1ea_100%)] px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
        <div className="rounded-[24px] border border-[#ece5da] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(16,24,40,0.05)] md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-[62px] w-[72px] items-center justify-center rounded-[16px] border border-[#efe7dc] bg-[#fffdfb] shadow-sm">
                <BrandLogo className="h-8 w-12" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[18px] font-extrabold text-[#111827] md:text-[28px]">{section.title}</h1>
                <p className="mt-1 max-w-[690px] text-[13px] leading-6 text-[#6b7280] md:text-[15px]">{section.subtitle}</p>
              </div>
            </div>
            <div className="w-full max-w-[330px]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Curso ativo</p>
              <div className="relative">
                <select
                  value={portal.activeCourseId}
                  onChange={(event) => patchPortal({ action: 'select-course', courseId: event.target.value })}
                  disabled={saving}
                  className="h-[48px] w-full appearance-none rounded-[14px] border border-[#ece5da] bg-white px-4 pr-11 text-[14px] font-semibold text-[#1f2937] shadow-sm outline-none transition focus:border-[#ff7a00]"
                >
                  {portal.courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              </div>
            </div>
          </div>
        </div>

        {contentByPath[location.pathname] || contentByPath['/aluno/recursos-didaticos']}
      </div>

      <Modal
        isOpen={Boolean(modal.type)}
        onClose={() => setModal({ type: '', payload: null })}
        title={modal.type === 'slides' ? 'Slides da aula' : modal.type === 'video' ? 'Vídeo da aula' : modal.payload?.title || 'Material'}
        size="lg"
      >
        {modal.type === 'slides' && modal.payload ? (
          <div className="space-y-5">
            <div className="rounded-[20px] bg-[#0f172a] px-5 py-5 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ff9d3f]">Aula {modal.payload.lessonOrder}</p>
              <h3 className="mt-2 text-xl font-extrabold">{modal.payload.title}</h3>
            </div>
            <div className="rounded-[20px] border border-[#ece5da] bg-[#fffdfa] p-5">
              <p className="text-sm font-bold text-[#1f2937]">Tópicos principais</p>
              <ul className="mt-3 space-y-3">
                {modal.payload.bullets?.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-[#4b5563]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ff7a00]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" onClick={() => createPrintableDocument(`Slides - Aula ${portal.slides.lessonOrder}`, activeCourse?.title || 'Curso DRM', portal.slides.bullets || [])} className="rounded-[14px] bg-[#ff7a00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]">Imprimir / salvar em PDF</button>
          </div>
        ) : null}

        {modal.type === 'video' && modal.payload ? (
          <div className="space-y-5">
            <div className="rounded-[22px] bg-[linear-gradient(125deg,#111827,#334155)] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">{modal.payload.title}</h3>
                  <p className="mt-1 text-sm text-white/70">Duração estimada: {modal.payload.duration}</p>
                </div>
              </div>
            </div>
            <p className="text-sm leading-7 text-[#4b5563]">{modal.payload.description}</p>
            <button type="button" onClick={() => patchPortal({ action: 'complete-lesson', lessonOrder: activeLesson?.order || 1 })} className="rounded-[14px] bg-[#ff7a00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]">Registrar aula como revisada</button>
          </div>
        ) : null}

        {modal.type === 'material' && modal.payload ? (
          <div className="space-y-5">
            <div className="rounded-[20px] border border-[#ece5da] bg-[#fffdfa] p-5">
              <p className="text-lg font-extrabold text-[#1f2937]">{modal.payload.title}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{modal.payload.format} · {modal.payload.sizeLabel}</p>
              <p className="mt-4 text-sm leading-7 text-[#4b5563]">Este material fica disponível como apoio à execução segura da aula, revisão de pontos críticos e registro pedagógico do treinamento.</p>
            </div>
            <button type="button" onClick={() => createPrintableDocument(modal.payload.title, `${activeCourse?.title || 'Curso DRM'} • ${modal.payload.format}`, ['Documento preparado para consulta e registro pedagógico.', 'Use este conteúdo como apoio durante a aula e na revisão final.', 'Mantenha este material salvo junto às evidências do treinamento.'])} className="rounded-[14px] bg-[#ff7a00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]">Abrir versão para impressão</button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
