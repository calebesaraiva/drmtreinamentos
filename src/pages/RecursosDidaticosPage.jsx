import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Check, CheckCircle2, ChevronDown, Circle, CircleHelp, Clock3, Download,
  ExternalLink, FileText, Headphones, ListChecks, MessageSquare, Play, Trophy, Video, XCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

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
          body { font-family: Manrope, Arial, sans-serif; margin: 40px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 28px; }
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

function statusTone(status) {
  if (status === 'concluido' || status === 'concluida') return 'success';
  if (status === 'em_andamento' || status === 'atual') return 'warning';
  if (status === 'atencao') return 'outline';
  return 'muted';
}

function StatusBadge({ status }) {
  const tone = statusTone(status);
  const classes = {
    success: 'bg-[#e8f7ee] text-[#1f9d57]',
    warning: 'bg-[#fff1e3] text-[#ff7a00]',
    outline: 'bg-white border border-[#ffb26b] text-[#ff7a00]',
    muted: 'bg-[#f3f4f6] text-[#6b7280]',
  };
  const labels = {
    concluido: 'Concluído',
    concluida: 'Concluída',
    em_andamento: 'Em andamento',
    atual: 'Atual',
    atencao: 'Atenção',
    pendente: 'Pendente',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${classes[tone]}`}>
      {labels[status] || status}
    </span>
  );
}

function SummaryStat({ icon: Icon, value, label, accent, children }) {
  return (
    <div className="flex items-center gap-4 min-w-[160px]">
      <div className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border-[4px] ${accent}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-[30px] font-extrabold leading-none text-[#111827]">{value}</p>
        <p className="mt-1 text-sm font-medium text-[#6b7280]">{label}</p>
        {children}
      </div>
    </div>
  );
}

function ResourceCard({ number, title, children, className = '' }) {
  return (
    <section className={`rounded-[26px] border border-[#ece5da] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)] ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-white">{number}</div>
        <h2 className="text-[17px] font-extrabold text-[#1f2937]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ValidationIcon({ status }) {
  if (status === 'concluido') return <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />;
  if (status === 'atencao') return <Circle className="h-5 w-5 text-[#ff7a00]" />;
  return <Circle className="h-5 w-5 text-[#c3c8d2]" />;
}

export default function RecursosDidaticosPage() {
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [modal, setModal] = useState({ type: '', payload: null });

  const loadPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getStudentPortal();
      setPortal(result);
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar os recursos didáticos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const visibleLessons = useMemo(() => {
    if (!portal?.lessons) return [];
    return showAllLessons ? portal.lessons : portal.lessons.slice(0, 5);
  }, [portal, showAllLessons]);

  const activeLesson = useMemo(() => portal?.lessons?.find((lesson) => lesson.status === 'atual') || portal?.lessons?.[0], [portal]);
  const videoProgress = portal?.summary?.completionPercent || 0;

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

  const openSlides = () => {
    setModal({ type: 'slides', payload: portal?.slides });
  };

  const openVideo = () => {
    setModal({ type: 'video', payload: portal?.video });
  };

  const openMaterial = async (material) => {
    await patchPortal({ action: 'open-material', materialId: material.id });
    setModal({ type: 'material', payload: material });
  };

  const printSlides = () => {
    if (!portal?.slides) return;
    createPrintableDocument(
      `Slides - Aula ${portal.slides.lessonOrder}`,
      `${portal?.courses?.find((course) => course.id === portal.activeCourseId)?.title || 'Curso DRM'}`,
      portal.slides.bullets || [],
    );
  };

  const printMaterial = (material) => {
    createPrintableDocument(
      material.title,
      `${portal?.courses?.find((course) => course.id === portal.activeCourseId)?.title || 'Curso DRM'} • ${material.format}`,
      [
        'Documento preparado para consulta e registro pedagógico.',
        'Use este conteúdo como apoio durante a aula e na revisão final.',
        'Mantenha este material salvo junto às evidências do treinamento.',
      ],
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f6f1ea] p-8">
        <div className="rounded-[28px] border border-[#ece5da] bg-white px-8 py-6 text-center shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
          <p className="text-lg font-bold text-[#1f2937]">Carregando recursos didáticos...</p>
          <p className="mt-2 text-sm text-[#6b7280]">Preparando sua trilha de aprendizagem.</p>
        </div>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f6f1ea] p-8">
        <div className="max-w-md rounded-[28px] border border-[#f3d1d1] bg-white px-8 py-6 text-center shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 text-lg font-bold text-[#1f2937]">Não foi possível abrir a área do aluno</p>
          <p className="mt-2 text-sm text-[#6b7280]">{error || 'Tente novamente em instantes.'}</p>
          <button
            type="button"
            onClick={loadPortal}
            className="mt-5 rounded-xl bg-[#ff7a00] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(255,122,0,0.08),_transparent_28%),linear-gradient(180deg,#faf7f2_0%,#f6f1ea_100%)] px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3">
        <div className="rounded-[28px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)] md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-[74px] w-[90px] items-center justify-center rounded-[18px] border border-[#efe7dc] bg-[#fffdfb] shadow-sm">
                <BrandLogo className="h-10 w-14" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[22px] font-extrabold text-[#111827] md:text-[34px]">Recursos Didáticos</h1>
                <p className="mt-1 max-w-[700px] text-sm text-[#6b7280] md:text-[20px] md:leading-7">
                  Acesse slides, vídeos, atividades, materiais de apoio e avaliações do seu curso.
                </p>
              </div>
            </div>

            <div className="w-full max-w-[360px] xl:w-[360px]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Curso ativo</p>
              <div className="relative">
                <select
                  value={portal.activeCourseId}
                  onChange={(event) => patchPortal({ action: 'select-course', courseId: event.target.value })}
                  disabled={saving}
                  className="h-[58px] w-full appearance-none rounded-[16px] border border-[#ece5da] bg-white px-4 pr-11 text-[15px] font-semibold text-[#1f2937] shadow-sm outline-none transition focus:border-[#ff7a00]"
                >
                  {portal.courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)] md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-extrabold text-[#1f2937]">Resumo do seu progresso</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryStat
                  icon={() => <span className="text-[24px] font-extrabold text-[#111827]">{portal.summary.completionPercent}%</span>}
                  value=""
                  label="Concluído"
                  accent="border-[#ff7a00] bg-white text-[#ff7a00]"
                />
                <div className="flex items-center gap-4">
                  <BookOpen className="h-10 w-10 text-[#111827]" />
                  <div>
                    <p className="text-[28px] font-extrabold leading-none text-[#111827]">{portal.summary.completedLessonsLabel}</p>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">Aulas concluídas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Clock3 className="h-10 w-10 text-[#111827]" />
                  <div>
                    <p className="text-[28px] font-extrabold leading-none text-[#111827]">{portal.summary.totalDurationLabel}</p>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">Carga horária total</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="h-10 w-10 text-[#16a34a]" />
                  <div>
                    <p className="text-[24px] font-extrabold leading-none text-[#16a34a]">{portal.summary.statusLabel}</p>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">{portal.summary.encouragement}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:pl-6">
              <button
                type="button"
                onClick={() => document.getElementById('painel-validacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex h-[56px] items-center gap-3 rounded-[14px] border border-[#ffb26b] px-5 text-sm font-bold text-[#ff7a00] transition hover:bg-[#fff7ef]"
              >
                <ListChecks className="h-4 w-4" />
                Ver meu progresso
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[1.08fr_1.12fr_1.12fr]">
          <div className="grid gap-3">
            <ResourceCard number={1} title="Trilha de Aprendizagem">
              <div className="space-y-2">
                {visibleLessons.map((lesson, index) => {
                  const isCurrent = lesson.status === 'atual';
                  const isDone = lesson.status === 'concluida';
                  return (
                    <div key={lesson.id} className="relative flex gap-3 rounded-[18px] border border-[#ece7df] bg-[#fffdfa] px-4 py-3">
                      {index < visibleLessons.length - 1 ? (
                        <div className="absolute left-[25px] top-12 h-[calc(100%-20px)] w-px bg-[#d8ddd6]" />
                      ) : null}
                      <div className={`relative z-[1] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        isDone ? 'bg-[#16a34a] text-white' : isCurrent ? 'bg-[#ff7a00] text-white' : 'bg-[#efefef] text-[#666]'
                      }`}>
                        {isDone ? <Check className="h-4 w-4" /> : lesson.order}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-extrabold ${isCurrent ? 'text-[#ff7a00]' : 'text-[#1f2937]'}`}>Aula {lesson.order}</p>
                        <p className={`text-[14px] font-semibold leading-5 ${isCurrent ? 'text-[#ff7a00]' : 'text-[#1f2937]'}`}>{lesson.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAllLessons((value) => !value)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#ece7df] px-4 py-3 text-sm font-semibold text-[#4b5563] transition hover:bg-[#faf7f3]"
              >
                {showAllLessons ? 'Mostrar menos' : 'Ver todas as aulas'}
                <ChevronDown className={`h-4 w-4 transition ${showAllLessons ? 'rotate-180' : ''}`} />
              </button>
            </ResourceCard>

            <ResourceCard number=" " title="Materiais de apoio">
              <div className="space-y-3">
                {portal.materials.map((material) => (
                  <div key={material.id} className="flex items-center gap-3 rounded-[18px] border border-[#f0ebe2] bg-[#fffdfa] px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${material.color}16`, color: material.color }}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#1f2937]">{material.title}</p>
                      <p className="text-xs text-[#6b7280]">{material.format} · {material.sizeLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMaterial(material)}
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#ece7df] text-[#4b5563] transition hover:bg-[#faf7f3]"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ResourceCard>
          </div>

          <div className="grid gap-3">
            <ResourceCard number={2} title="Slides da Aula">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <button
                  type="button"
                  onClick={openSlides}
                  className="group overflow-hidden rounded-[20px] bg-[#0d1420] text-left shadow-[0_18px_42px_rgba(15,23,42,0.25)]"
                >
                  <div className="relative h-[214px] overflow-hidden px-6 py-5">
                    <div className="absolute inset-y-0 right-0 w-[42%] bg-[linear-gradient(155deg,transparent_0%,transparent_20%,rgba(255,122,0,0.12)_20%,rgba(255,122,0,0.75)_100%)]" />
                    <div className="relative z-[1] flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff7a00]">DRM</span>
                        <ExternalLink className="h-4 w-4 text-white/60 transition group-hover:text-white" />
                      </div>
                      <div>
                        <p className="text-[34px] font-black leading-none text-[#ff9d3f]">
                          {portal.courses.find((course) => course.id === portal.activeCourseId)?.title?.match(/NR[-\s]?\d+/i)?.[0] || 'NR'}
                        </p>
                        <p className="mt-2 max-w-[250px] text-[28px] font-black leading-[1.08] text-white">{portal.slides.title}</p>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-[#ff7a00]">Aula {portal.slides.lessonOrder}</p>
                    <h3 className="mt-1 text-[27px] font-extrabold leading-[1.08] text-[#1f2937]">{portal.slides.title}</h3>
                    <p className="mt-3 text-sm text-[#6b7280]">Slides atualizados em {formatDateLabel(portal.slides.updatedAt)}</p>
                  </div>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={openSlides}
                      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#ff7a00] text-sm font-bold text-white transition hover:bg-[#e86f00]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir slides
                    </button>
                    <button
                      type="button"
                      onClick={printSlides}
                      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#ece7df] text-sm font-bold text-[#374151] transition hover:bg-[#faf7f3]"
                    >
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </button>
                  </div>
                </div>
              </div>
            </ResourceCard>

            <ResourceCard number={5} title="Atividades">
              <div className="space-y-3">
                {portal.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 rounded-[18px] border border-[#f0ebe2] bg-[#fffdfa] px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
                      <CircleHelp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#1f2937]">{activity.title}</p>
                      <p className="text-xs text-[#6b7280]">{activity.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => patchPortal({ action: activity.status === 'em_andamento' ? 'advance-activity' : 'start-activity', activityId: activity.id })}
                      disabled={saving}
                      className={`rounded-[12px] px-3 py-2 text-xs font-bold transition ${
                        activity.status === 'em_andamento'
                          ? 'bg-[#fff1e3] text-[#ff7a00]'
                          : activity.status === 'concluida'
                            ? 'bg-[#e8f7ee] text-[#1f9d57]'
                            : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#eceef1]'
                      }`}
                    >
                      {activity.status === 'em_andamento' ? 'Concluir' : activity.status === 'concluida' ? 'Concluída' : 'Pendente'}
                    </button>
                  </div>
                ))}
              </div>
            </ResourceCard>
          </div>

          <div className="grid gap-3">
            <ResourceCard number={3} title="Vídeo da Aula">
              <button
                type="button"
                onClick={openVideo}
                className="group overflow-hidden rounded-[20px] border border-[#e8dfd3] bg-[#0f172a] text-left shadow-[0_18px_42px_rgba(15,23,42,0.22)]"
              >
                <div className="relative h-[214px] bg-[linear-gradient(125deg,rgba(15,23,42,0.96),rgba(51,65,85,0.72)),radial-gradient(circle_at_top_right,rgba(255,122,0,0.24),transparent_35%)]">
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(17,24,39,0.6),transparent_40%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#111827] shadow-2xl transition group-hover:scale-105">
                      <Play className="ml-1 h-7 w-7" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
                    <div className="h-1.5 rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-[#ff7a00]" style={{ width: `${Math.max(16, videoProgress)}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-white/85">
                      <span>00:00</span>
                      <span>{portal.video.duration}</span>
                    </div>
                  </div>
                </div>
              </button>

              <div className="mt-4">
                <h3 className="text-[27px] font-extrabold leading-[1.1] text-[#1f2937]">{portal.video.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b7280]">{portal.video.description}</p>
              </div>
            </ResourceCard>

            <ResourceCard number={6} title="Validação do Aprendizado" className="min-h-[250px]" >
              <div id="painel-validacao" className="grid gap-3 md:grid-cols-2">
                {portal.validation.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-[18px] border border-[#f0ebe2] bg-[#fffdfa] px-4 py-3">
                    <div className="mt-0.5">
                      <ValidationIcon status={item.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-[#1f2937]">{item.title}</p>
                      <p className="text-xs text-[#6b7280]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ResourceCard>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <section className="rounded-[24px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
            <p className="text-[15px] font-extrabold text-[#1f2937]">Próxima aula</p>
            <h3 className="mt-2 text-[18px] font-extrabold leading-6 text-[#1f2937]">{portal.nextLesson.title}</h3>
            <div className="mt-4 flex items-center gap-5 text-xs font-medium text-[#6b7280]">
              <span>{portal.nextLesson.type}</span>
              <span>{portal.nextLesson.duration}</span>
            </div>
            <button
              type="button"
              onClick={() => patchPortal({ action: 'complete-lesson', lessonOrder: activeLesson?.order || 1 })}
              className="mt-4 flex h-[46px] items-center gap-2 rounded-[14px] border border-[#ffb26b] px-4 text-sm font-bold text-[#ff7a00] transition hover:bg-[#fff7ef]"
            >
              Continuar
              <Play className="h-4 w-4" fill="currentColor" />
            </button>
          </section>

          <section className="rounded-[24px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-2 text-[#1f2937]">
              <CircleHelp className="h-5 w-5" />
              <p className="text-[15px] font-extrabold">{portal.support.faqTitle}</p>
            </div>
            <p className="mt-3 text-sm text-[#6b7280]">{portal.support.faqDescription}</p>
            <button type="button" className="mt-5 flex h-[46px] items-center gap-2 rounded-[14px] border border-[#ece7df] px-4 text-sm font-bold text-[#1f2937] transition hover:bg-[#faf7f3]">Ver perguntas</button>
          </section>

          <section className="rounded-[24px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-2 text-[#1f2937]">
              <MessageSquare className="h-5 w-5" />
              <p className="text-[15px] font-extrabold">{portal.support.forumTitle}</p>
            </div>
            <p className="mt-3 text-sm text-[#6b7280]">{portal.support.forumDescription}</p>
            <button type="button" className="mt-5 flex h-[46px] items-center gap-2 rounded-[14px] border border-[#ece7df] px-4 text-sm font-bold text-[#1f2937] transition hover:bg-[#faf7f3]">Acessar fórum</button>
          </section>

          <section className="rounded-[24px] border border-[#ece5da] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-2 text-[#1f2937]">
              <Headphones className="h-5 w-5" />
              <p className="text-[15px] font-extrabold">{portal.support.helpTitle}</p>
            </div>
            <p className="mt-3 text-sm text-[#6b7280]">{portal.support.helpDescription}</p>
            <button type="button" className="mt-5 flex h-[46px] items-center gap-2 rounded-[14px] border border-[#ece7df] px-4 text-sm font-bold text-[#1f2937] transition hover:bg-[#faf7f3]">Abrir chamado</button>
          </section>
        </div>
      </div>

      <Modal
        isOpen={Boolean(modal.type)}
        onClose={() => setModal({ type: '', payload: null })}
        title={
          modal.type === 'slides'
            ? 'Slides da aula'
            : modal.type === 'video'
              ? 'Vídeo da aula'
              : modal.type === 'material'
                ? modal.payload?.title || 'Material'
                : 'Recurso'
        }
        size="lg"
      >
        {modal.type === 'slides' && modal.payload ? (
          <div className="space-y-5">
            <div className="rounded-[20px] bg-[#0f172a] px-6 py-6 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ff9d3f]">Aula {modal.payload.lessonOrder}</p>
              <h3 className="mt-2 text-2xl font-extrabold">{modal.payload.title}</h3>
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
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={printSlides} className="rounded-[14px] bg-[#ff7a00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]">Imprimir / salvar em PDF</button>
            </div>
          </div>
        ) : null}

        {modal.type === 'video' && modal.payload ? (
          <div className="space-y-5">
            <div className="rounded-[22px] bg-[linear-gradient(125deg,#111827,#334155)] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <Video className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold">{modal.payload.title}</h3>
                  <p className="mt-1 text-sm text-white/70">Duração estimada: {modal.payload.duration}</p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#ff7a00]" style={{ width: `${Math.max(18, videoProgress)}%` }} />
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
              <p className="mt-4 text-sm leading-7 text-[#4b5563]">
                Este material fica disponível como apoio à execução segura da aula, revisão de pontos críticos e registro pedagógico do treinamento.
              </p>
            </div>
            <button type="button" onClick={() => printMaterial(modal.payload)} className="rounded-[14px] bg-[#ff7a00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e86f00]">Abrir versão para impressão</button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
