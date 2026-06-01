import React, { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Loader2, RefreshCcw, Download, Archive
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { MOTIVOS_RECUSA } from '../data/mockData';
import { api } from '../services/api';

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

function formatDateBR(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('pt-BR');
}

function buildCertificatePreviewText({ nome, cpf, nomeCurso, duracao, local, periodoInicio, periodoFim }) {
  const inicio = formatDateBR(periodoInicio);
  const fim = formatDateBR(periodoFim);
  const periodo = inicio && fim ? (inicio === fim ? inicio : `${inicio} a ${fim}`) : (fim || inicio || 'data pendente');
  return `Certificamos que ${safeText(nome, 'ALUNO')}, portador(a) do CPF ${safeText(cpf, '000.000.000-00')}, concluiu com aproveitamento satisfatório o treinamento ${safeText(nomeCurso, 'CURSO')}, com carga horária de ${safeText(duracao, 'carga horária pendente')}, realizado em ${safeText(local, 'local pendente')}, no período de ${periodo}, em conformidade com os requisitos aplicáveis.`;
}

function RecusaModal({ isOpen, onClose, onConfirm, nome, tipo, loading }) {
  const [motivo, setMotivo] = useState('');
  const [custom, setCustom] = useState('');
  const tipoLabel = safeText(tipo, 'item');
  const tipoLower = tipoLabel.toLowerCase();
  const nomeLabel = safeText(nome, 'registro');

  const handleConfirm = () => {
    const finalMotivo = motivo === 'Outro motivo' ? custom : motivo;
    if (!finalMotivo) return;
    onConfirm(finalMotivo);
    setMotivo('');
    setCustom('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Recusar ${tipoLabel}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Você está recusando o <strong>{tipoLower}</strong> de <strong>{nomeLabel}</strong>.
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

function SelecionarCertificadoPdfModal({ isOpen, onClose, aluno, allStudents, onConfirm }) {
  const options = (Array.isArray(allStudents) ? allStudents : [])
    .filter((s) => s.cpf === aluno?.cpf && s.statusCertificado === 'aprovado');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(String(aluno?.id || options[0]?.id || ''));
  }, [isOpen, aluno, allStudents]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecionar certificado para PDF" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Escolha qual certificado aprovado você quer baixar em PDF para <strong>{safeText(aluno?.nome)}</strong>.
        </p>
        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
          {options.map((item) => (
            <label key={`pdf-opt-${item.id}`} className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="pdf-cert-option"
                checked={String(selectedId) === String(item.id)}
                onChange={() => setSelectedId(String(item.id))}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">{safeText(item.nomeCurso, 'Curso')}</p>
                <p className="text-xs text-gray-500">
                  Local: {safeText(item.local, 'A definir')} • Data: {safeText(item.data, 'A definir')} • Carga: {safeText(item.duracao, 'A definir')}
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={() => {
              const selected = options.find((s) => String(s.id) === String(selectedId));
              if (selected) onConfirm(selected);
            }}
            disabled={!selectedId}
            className="btn-primary text-sm disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AutorizaCadastroModal({
  isOpen,
  onClose,
  onConfirm,
  aluno,
  courses,
  loading,
  rememberedFilial,
}) {
  const [filial, setFilial] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);

  useEffect(() => {
    if (!isOpen || !aluno) return;
    const currentCourseId = String(aluno.cursoId || '');
    const existingIds = Array.isArray(aluno.cursosConcluidosIds)
      ? aluno.cursosConcluidosIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    setFilial(String(aluno.filial || rememberedFilial || ''));
    if (existingIds.length > 0) {
      setSelectedCourses(existingIds);
    } else {
      setSelectedCourses(currentCourseId ? [currentCourseId] : []);
    }
  }, [isOpen, aluno, rememberedFilial]);

  const toggleCourse = (courseId) => {
    const id = String(courseId || '');
    setSelectedCourses((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };

  const canConfirm = filial.trim().length >= 2 && selectedCourses.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Autorizar aluno com filial e cursos" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 border border-green-100 p-3">
          <p className="text-sm text-green-800">
            Defina a filial e marque os cursos concluídos por <strong>{safeText(aluno?.nome)}</strong>.
            Cada curso aprovado gera certificado separado.
          </p>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Filial da empresa *</label>
          <input
            type="text"
            value={filial}
            onChange={(e) => setFilial(e.target.value)}
            placeholder="Ex: Mix Mateus JK, Loja 15, Armazém São Luís"
            className="input-field mt-1"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Cursos concluídos *</p>
          <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
            {(Array.isArray(courses) ? courses : []).map((course) => {
              const id = String(course.id || '');
              const checked = selectedCourses.includes(id);
              return (
                <label key={`course-check-${id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCourse(id)}
                  />
                  <span className="text-sm text-gray-800">{safeText(course.nomeCurso, 'Curso sem nome')}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={() => onConfirm({ filial: filial.trim(), cursosConcluidos: selectedCourses })}
            disabled={!canConfirm || loading}
            className="btn-success text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar autorização
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditarAlunoCursoModal({ isOpen, onClose, onConfirm, aluno, courses, loading }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [filial, setFilial] = useState('');
  const [local, setLocal] = useState('');
  const [data, setData] = useState('');
  const [duracao, setDuracao] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);

  useEffect(() => {
    if (!isOpen || !aluno) return;
    const existingIds = Array.isArray(aluno.cursosConcluidosIds)
      ? aluno.cursosConcluidosIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const currentCourseId = String(aluno.cursoId || '').trim();
    setNome(String(aluno.nome || '').trim());
    setCpf(String(aluno.cpf || '').trim());
    setEmpresa(String(aluno.empresa || '').trim());
    setFilial(String(aluno.filial || '').trim());
    setLocal(String(aluno.local || '').trim());
    setData(String(aluno.data || '').trim());
    setDuracao(String(aluno.duracao || '').trim());
    setHorarioInicio(String(aluno.horarioInicio || '').trim());
    setSelectedCourses(existingIds.length > 0 ? existingIds : (currentCourseId ? [currentCourseId] : []));
  }, [isOpen, aluno]);

  const toggleCourse = (courseId) => {
    const id = String(courseId || '');
    setSelectedCourses((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };

  const canConfirm = nome.trim() && cpf.trim() && empresa.trim() && filial.trim() && selectedCourses.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar aluno e cursos" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
          Você pode editar os dados antes da emissão. Após emitir certificado, a edição deste curso fica bloqueada.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-gray-700">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">CPF *</label>
            <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Empresa *</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Filial *</label>
            <input value={filial} onChange={(e) => setFilial(e.target.value)} className="input-field mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Local</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Carga horária</label>
            <input value={duracao} onChange={(e) => setDuracao(e.target.value)} className="input-field mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Hora início</label>
            <input value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="input-field mt-1" placeholder="08:00" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Cursos do aluno *</p>
          <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
            {(Array.isArray(courses) ? courses : []).map((course) => {
              const id = String(course.id || '');
              const checked = selectedCourses.includes(id);
              return (
                <label key={`edit-course-${id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleCourse(id)} />
                  <span className="text-sm text-gray-800">{safeText(course.nomeCurso, 'Curso sem nome')}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={() => onConfirm({
              nome: nome.trim(),
              cpf: cpf.trim(),
              empresa: empresa.trim(),
              filial: filial.trim(),
              local: local.trim(),
              data: data.trim(),
              duracao: duracao.trim(),
              horarioInicio: horarioInicio.trim(),
              cursosConcluidos: selectedCourses,
            })}
            disabled={!canConfirm || loading}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AutorizaCertificadoModal({ isOpen, onClose, onConfirm, aluno, loading }) {
  const [local, setLocal] = useState('');
  const [data, setData] = useState('');
  const [duracao, setDuracao] = useState('');
  const [instrutorNome, setInstrutorNome] = useState('');
  const [instrutorCargo, setInstrutorCargo] = useState('');
  const [instrutorRegistro, setInstrutorRegistro] = useState('');
  const [temInstrutor, setTemInstrutor] = useState(true);
  const [cursoOk, setCursoOk] = useState(false);
  const INSTRUTOR_CACHE_KEY = 'drmLastInstructor';

  useEffect(() => {
    if (!isOpen || !aluno) return;
    let cached = {};
    try {
      cached = JSON.parse(localStorage.getItem(INSTRUTOR_CACHE_KEY) || '{}');
    } catch {
      cached = {};
    }
    setLocal(String(aluno.local || '').trim());
    setData(String(aluno.data || '').trim());
    setDuracao(String(aluno.duracao || '').trim());
    const hasInstructor = aluno.temInstrutor !== false;
    setTemInstrutor(hasInstructor);
    setInstrutorNome(String(aluno.instrutorNome || aluno.instrutor || cached.nome || '').trim());
    setInstrutorCargo(String(aluno.instrutorCargo || aluno.cargoInstrutor || cached.cargo || '').trim());
    setInstrutorRegistro(String(aluno.instrutorRegistro || aluno.registroInstrutor || cached.registro || '').trim());
    setCursoOk(false);
  }, [isOpen, aluno]);

  const canConfirm = cursoOk && local.trim() && data.trim() && duracao.trim()
    && (!temInstrutor || (instrutorNome.trim() && instrutorCargo.trim() && instrutorRegistro.trim()));
  const pendencias = [
    !cursoOk ? 'Confirmar o curso selecionado' : null,
    !local.trim() ? 'Local do curso' : null,
    !data.trim() ? 'Data do curso' : null,
    !duracao.trim() ? 'Carga horária' : null,
    temInstrutor && !instrutorNome.trim() ? 'Nome do instrutor' : null,
    temInstrutor && !instrutorCargo.trim() ? 'Função do instrutor' : null,
    temInstrutor && !instrutorRegistro.trim() ? 'Registro CREA/CFT do instrutor' : null,
  ].filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar dados para autorizar certificado" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
          Revise os dados. O certificado será assinado com essas informações.
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-sm">
          <p><strong>Aluno:</strong> {safeText(aluno?.nome)}</p>
          <p><strong>Curso:</strong> {safeText(aluno?.nomeCurso)}</p>
        </div>
        {pendencias.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 uppercase">Faltando para liberar validação</p>
            <ul className="mt-1 space-y-1">
              {pendencias.map((item) => (
                <li key={item} className="text-sm text-red-700">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={cursoOk} onChange={(e) => setCursoOk(e.target.checked)} className="mt-1" />
          Confirmo que o curso acima está correto para este certificado.
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Local *</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} className="input-field mt-1" placeholder="Ex: Unidade da empresa" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Data do curso *</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Carga horária *</label>
            <input value={duracao} onChange={(e) => setDuracao(e.target.value)} className="input-field mt-1" placeholder="Ex: 8 horas" />
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-1">Tem instrutor no certificado? *</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTemInstrutor(true)} className={temInstrutor ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Sim</button>
              <button type="button" onClick={() => setTemInstrutor(false)} className={!temInstrutor ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Não (usar só responsável)</button>
            </div>
          </div>
          {temInstrutor && (
          <>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Instrutor responsável *</label>
            <input value={instrutorNome} onChange={(e) => setInstrutorNome(e.target.value)} className="input-field mt-1" placeholder="Nome completo do instrutor" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Função do instrutor *</label>
            <input value={instrutorCargo} onChange={(e) => setInstrutorCargo(e.target.value)} className="input-field mt-1" placeholder="Ex: Técnico em Segurança do Trabalho" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Registro CREA/CFT *</label>
            <input value={instrutorRegistro} onChange={(e) => setInstrutorRegistro(e.target.value)} className="input-field mt-1" placeholder="Ex: CREA/CFT 0000000000" />
          </div>
          </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={() => {
              const payload = {
                local: local.trim(),
                data: data.trim(),
                duracao: duracao.trim(),
                cursoId: String(aluno?.cursoId || ''),
                cursoNome: safeText(aluno?.nomeCurso),
                temInstrutor,
                instrutorNome: instrutorNome.trim(),
                instrutorCargo: instrutorCargo.trim(),
                instrutorRegistro: instrutorRegistro.trim(),
              };
              if (temInstrutor) {
                try {
                  localStorage.setItem(INSTRUTOR_CACHE_KEY, JSON.stringify({
                    nome: payload.instrutorNome,
                    cargo: payload.instrutorCargo,
                    registro: payload.instrutorRegistro,
                  }));
                } catch {
                  // noop
                }
              }
              onConfirm(payload);
            }}
            disabled={!canConfirm || loading}
            className="btn-success text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar e autorizar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EmissaoCertificadoModal({ isOpen, onClose, onConfirm, aluno, loading, actionType, allStudents, courses }) {
  const [temInstrutor, setTemInstrutor] = useState(true);
  const [instrutorNome, setInstrutorNome] = useState('');
  const [instrutorCargo, setInstrutorCargo] = useState('');
  const [instrutorRegistro, setInstrutorRegistro] = useState('');
  const [signatureType, setSignatureType] = useState('digital');
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseForms, setCourseForms] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [courseToAdd, setCourseToAdd] = useState('');
  const [confirmChecklistDone, setConfirmChecklistDone] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const cacheKey = 'drmLastInstructor';
  const [draftBusy, setDraftBusy] = useState(false);
  const resolveCourseProgramContent = (courseId, fallback = '') => {
    const course = (Array.isArray(courses) ? courses : []).find((item) => String(item?.id || '') === String(courseId || ''));
    if (typeof course?.conteudoProgramatico === 'string' && course.conteudoProgramatico.trim()) {
      return course.conteudoProgramatico.trim();
    }
    if (Array.isArray(course?.cronograma) && course.cronograma.length > 0) {
      const lines = course.cronograma
        .map((item, index) => {
          const label = String(item?.titulo || item?.descricao || item?.nome || '').trim();
          return label ? `${index + 1}. ${label}` : '';
        })
        .filter(Boolean);
      return lines.join(';\n');
    }
    return String(fallback || '').trim();
  };

  useEffect(() => {
    if (!isOpen || !aluno) return;
    let cached = {};
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch { cached = {}; }
    const hasInstructor = aluno.temInstrutor !== false;
    setTemInstrutor(hasInstructor);
    setInstrutorNome(String(aluno.instrutorNome || aluno.instrutor || cached.nome || '').trim());
    setInstrutorCargo(String(aluno.instrutorCargo || cached.cargo || '').trim());
    setInstrutorRegistro(String(aluno.instrutorRegistro || cached.registro || '').trim());
    setSignatureType('manual');
    setSaveAsDefault(true);
    const source = actionType === 'zip'
      ? (Array.isArray(allStudents) ? allStudents.filter((s) => s.cpf === aluno.cpf && s.statusCertificado === 'aprovado') : [aluno])
      : [aluno];
    const unique = [];
    const seen = new Set();
    source.forEach((item) => {
      const id = String(item.cursoId || '');
      if (!id || seen.has(id)) return;
      seen.add(id);
      unique.push(item);
    });
    setSelectedCourseIds(unique.map((item) => String(item.cursoId || '')));
    setCourseForms(unique.map((item) => ({
      cursoId: String(item.cursoId || ''),
      cursoNome: safeText(item.nomeCurso),
      local: String(item.certificadoChecklistLocal || item.local || '').trim(),
      data: String(item.certificadoChecklistData || item.data || '').trim(),
      duracao: String(item.certificadoChecklistDuracao || item.duracao || '').trim(),
      horarioInicio: String(item.certificadoChecklistHorarioInicio || item.horarioInicio || '').trim(),
      periodoInicio: String(item.certificadoChecklistPeriodoInicio || item.periodoInicio || item.data || '').trim(),
      periodoFim: String(item.certificadoChecklistPeriodoFim || item.periodoFim || item.data || '').trim(),
      textoCertificado: buildCertificatePreviewText({
        nome: item.nome,
        cpf: item.cpf,
        nomeCurso: item.nomeCurso,
        duracao: item.certificadoChecklistDuracao || item.duracao,
        local: item.certificadoChecklistLocal || item.local,
        periodoInicio: item.certificadoChecklistPeriodoInicio || item.periodoInicio || item.data,
        periodoFim: item.certificadoChecklistPeriodoFim || item.periodoFim || item.data,
      }),
      conteudoProgramatico: String(
        item.certificadoChecklistConteudoProgramatico
          || resolveCourseProgramContent(item.cursoId, '')
      ).trim(),
      locked: false,
      confirmed: false,
      needsReconfirm: false,
    })));
    setStepIndex(0);
    setCourseToAdd('');
    setConfirmChecklistDone(false);
    setDraftStatus('');
  }, [isOpen, aluno, actionType, allStudents]);

  const activeForms = courseForms.filter((item) => selectedCourseIds.includes(item.cursoId));
  const current = activeForms[Math.min(stepIndex, Math.max(0, activeForms.length - 1))];
  const confirmedCount = activeForms.filter((item) => item.confirmed).length;
  const progressPercent = activeForms.length > 0 ? Math.round((confirmedCount / activeForms.length) * 100) : 0;
  const isCurrentValid = current
    && String(current.local).trim()
    && String(current.data).trim()
    && String(current.duracao).trim()
    && String(current.textoCertificado || '').trim()
    && String(current.conteudoProgramatico || '').trim();
  const canAdvance = Boolean(isCurrentValid);
  const allCoursesConfirmed = activeForms.length > 0 && activeForms.every((item) => item.confirmed);
  const instructorOk = !temInstrutor || (instrutorNome.trim() && instrutorCargo.trim() && instrutorRegistro.trim());
  const canConfirm = allCoursesConfirmed && instructorOk && confirmChecklistDone;
  const missingItems = [
    activeForms.length === 0 ? 'Selecione ao menos 1 curso para emissão.' : null,
    !allCoursesConfirmed ? 'Confirme o checklist de todos os cursos selecionados.' : null,
    temInstrutor && !instrutorNome.trim() ? 'Preencha o nome do instrutor.' : null,
    temInstrutor && !instrutorCargo.trim() ? 'Preencha a função do instrutor.' : null,
    temInstrutor && !instrutorRegistro.trim() ? 'Preencha o CREA/CFT do instrutor.' : null,
    !confirmChecklistDone ? 'Marque a confirmação final do checklist.' : null,
  ].filter(Boolean);

  const updateCurrentField = (field, value) => {
    if (!current) return;
    if (current.locked) return;
    setCourseForms((prev) => prev.map((item) => (
      item.cursoId === current.cursoId
        ? (() => {
            const prevValue = String(item[field] ?? '');
            const nextValue = String(value ?? '');
            if (prevValue === nextValue) return item;
            const wasConfirmed = item.confirmed === true;
            return {
              ...item,
              [field]: value,
              confirmed: false,
              needsReconfirm: wasConfirmed ? true : item.needsReconfirm,
            };
          })()
        : item
    )));
  };

  const confirmCurrent = () => {
    if (!current || !canAdvance) return;
    setCourseForms((prev) => prev.map((item) => (
      item.cursoId === current.cursoId ? { ...item, confirmed: true, needsReconfirm: false } : item
    )));
    if (stepIndex < activeForms.length - 1) setStepIndex(stepIndex + 1);
  };

  const addCourseToChecklist = () => {
    const selectedId = String(courseToAdd || '').trim();
    if (!selectedId) return;
    const alreadyExists = courseForms.some((item) => item.cursoId === selectedId);
    if (!alreadyExists) {
      const course = (Array.isArray(courses) ? courses : []).find((item) => String(item.id) === selectedId);
          setCourseForms((prev) => [
        ...prev,
        {
          cursoId: selectedId,
          cursoNome: safeText(course?.nomeCurso, 'Curso'),
          local: String(aluno?.local || '').trim(),
          data: String(aluno?.data || '').trim(),
          duracao: String(course?.duracao || aluno?.duracao || '').trim(),
          horarioInicio: String(course?.horarioInicio || aluno?.horarioInicio || '').trim(),
          periodoInicio: String(aluno?.periodoInicio || aluno?.data || '').trim(),
          periodoFim: String(aluno?.periodoFim || aluno?.data || '').trim(),
          textoCertificado: buildCertificatePreviewText({
            nome: aluno?.nome,
            cpf: aluno?.cpf,
            nomeCurso: safeText(course?.nomeCurso, 'Curso'),
            duracao: String(course?.duracao || aluno?.duracao || '').trim(),
            local: String(aluno?.local || '').trim(),
            periodoInicio: String(aluno?.periodoInicio || aluno?.data || '').trim(),
            periodoFim: String(aluno?.periodoFim || aluno?.data || '').trim(),
          }),
          conteudoProgramatico: resolveCourseProgramContent(selectedId, ''),
          locked: false,
          confirmed: false,
          needsReconfirm: false,
        },
      ]);
    }
    setSelectedCourseIds((prev) => (prev.includes(selectedId) ? prev : [...prev, selectedId]));
    setCourseToAdd('');
    setStepIndex(Math.max(0, activeForms.length));
  };

  const saveDraftFromCurrent = async () => {
    if (!current) return;
    if (!String(current.local || '').trim() || !String(current.data || '').trim() || !String(current.duracao || '').trim() || !String(current.textoCertificado || '').trim() || !String(current.conteudoProgramatico || '').trim()) {
      setDraftStatus('Preencha local, data, carga horária, texto e cronograma antes de salvar o rascunho.');
      return;
    }
    const courseIdKey = String(current.cursoId || '').trim();
    const payload = {
      cursoId: courseIdKey,
      cursoNome: current.cursoNome,
      selectedCourseIds: [...selectedCourseIds],
      signatureType,
      saveAsDefault,
      temInstrutor,
      instrutorNome: String(instrutorNome || '').trim(),
      instrutorCargo: String(instrutorCargo || '').trim(),
      instrutorRegistro: String(instrutorRegistro || '').trim(),
      confirmChecklistDone: Boolean(confirmChecklistDone),
      local: String(current.local || '').trim(),
      data: String(current.data || '').trim(),
      duracao: String(current.duracao || '').trim(),
      horarioInicio: String(current.horarioInicio || '').trim(),
      periodoInicio: String(current.periodoInicio || current.data || '').trim(),
      periodoFim: String(current.periodoFim || current.data || '').trim(),
      textoCertificado: String(current.textoCertificado || '').trim(),
      conteudoProgramatico: String(current.conteudoProgramatico || '').trim(),
      // Guarda o estado do checklist do modal para agilizar próximos alunos do mesmo curso
      courseFormsSnapshot: courseForms.map((item) => ({
        cursoId: String(item.cursoId || '').trim(),
        cursoNome: String(item.cursoNome || '').trim(),
        local: String(item.local || '').trim(),
        data: String(item.data || '').trim(),
        duracao: String(item.duracao || '').trim(),
        horarioInicio: String(item.horarioInicio || '').trim(),
        periodoInicio: String(item.periodoInicio || item.data || '').trim(),
        periodoFim: String(item.periodoFim || item.data || '').trim(),
        textoCertificado: String(item.textoCertificado || '').trim(),
        conteudoProgramatico: String(item.conteudoProgramatico || '').trim(),
      })),
      savedAt: new Date().toISOString(),
    };
    try {
      setDraftBusy(true);
      await api.saveCertificateDraft(payload);
      setDraftStatus(`Rascunho salvo para ${current.cursoNome}.`);
    } catch (error) {
      setDraftStatus(error?.message || 'Não foi possível salvar o rascunho no servidor.');
    } finally {
      setDraftBusy(false);
    }
  };

  const applyDraftToCurrent = async () => {
    if (!current) return;
    try {
      setDraftBusy(true);
      const result = await api.getCertificateDraft(current.cursoId, current.cursoNome);
      const draft = result?.draft?.payload || null;
      if (!draft) {
        setDraftStatus('Nenhum rascunho encontrado para este curso.');
        return;
      }
      setCourseForms((prev) => prev.map((item) => {
        if (item.cursoId !== current.cursoId) return item;
        return {
          ...item,
          local: String(draft.local || '').trim(),
          data: String(draft.data || '').trim(),
          duracao: String(draft.duracao || '').trim(),
          horarioInicio: String(draft.horarioInicio || '').trim(),
          periodoInicio: String(draft.periodoInicio || draft.data || '').trim(),
          periodoFim: String(draft.periodoFim || draft.data || '').trim(),
          textoCertificado: String(draft.textoCertificado || '').trim(),
          conteudoProgramatico: String(draft.conteudoProgramatico || '').trim(),
          confirmed: false,
          needsReconfirm: true,
        };
      }));
      if (Array.isArray(draft.selectedCourseIds) && draft.selectedCourseIds.length > 0) {
        setSelectedCourseIds(draft.selectedCourseIds.map((item) => String(item || '').trim()).filter(Boolean));
      }
      if (draft.signatureType === 'manual' || draft.signatureType === 'digital') {
        setSignatureType(draft.signatureType);
      }
      setSaveAsDefault(Boolean(draft.saveAsDefault));
      setTemInstrutor(!(draft.temInstrutor === false));
      setInstrutorNome(String(draft.instrutorNome || '').trim());
      setInstrutorCargo(String(draft.instrutorCargo || '').trim());
      setInstrutorRegistro(String(draft.instrutorRegistro || '').trim());
      setConfirmChecklistDone(Boolean(draft.confirmChecklistDone));
      setDraftStatus('Rascunho do servidor aplicado. Revise e confirme os dados deste curso.');
    } catch (error) {
      setDraftStatus(error?.message || 'Não foi possível carregar o rascunho do servidor.');
    } finally {
      setDraftBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar emissão do certificado" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
          Selecione/confirme cursos e preencha o checklist de cada curso (um por vez).
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p><strong>Aluno:</strong> {safeText(aluno?.nome)}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Cursos para emissão</p>
          <div className="mb-2 flex gap-2">
            <select
              value={courseToAdd}
              onChange={(e) => setCourseToAdd(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Selecionar curso para adicionar...</option>
              {(Array.isArray(courses) ? courses : []).map((course) => (
                <option key={`add-course-${course.id}`} value={String(course.id)}>
                  {safeText(course.nomeCurso, 'Curso')}
                </option>
              ))}
            </select>
            <button type="button" onClick={addCourseToChecklist} disabled={!courseToAdd} className="btn-secondary text-xs whitespace-nowrap disabled:opacity-60">
              Adicionar curso
            </button>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progresso do checklist</span>
              <span>{confirmedCount}/{activeForms.length} confirmado(s)</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
            {courseForms.map((item) => (
              <label key={`emit-course-${item.cursoId}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCourseIds.includes(item.cursoId)}
                  onChange={(e) => {
                    if (item.confirmed) return;
                    const checked = e.target.checked;
                    setSelectedCourseIds((prev) => checked ? [...prev, item.cursoId] : prev.filter((id) => id !== item.cursoId));
                  }}
                  disabled={item.confirmed}
                />
                <span>{item.cursoNome}</span>
                {item.confirmed && <span className="badge-green ml-auto">confirmado</span>}
                {!item.confirmed && item.needsReconfirm && (
                  <span className="ml-auto text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    alterado, precisa reconfirmar
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
        {current && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">
            <p className="text-sm font-semibold text-amber-800">
              Checklist do curso {stepIndex + 1} de {activeForms.length}: {current.cursoNome}
            </p>
            {!current.locked && !current.confirmed && current.needsReconfirm && (
              <div className="rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                Texto/dados alterados. Reconfirme este curso para liberar a emissão.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Local do curso *</label>
                <input value={current.local} onChange={(e) => updateCurrentField('local', e.target.value)} className="input-field mt-1" disabled={current.locked} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Data do curso *</label>
                <input type="date" value={current.data} onChange={(e) => updateCurrentField('data', e.target.value)} className="input-field mt-1" disabled={current.locked} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Carga horária *</label>
                <input value={current.duracao} onChange={(e) => updateCurrentField('duracao', e.target.value)} className="input-field mt-1" disabled={current.locked} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Hora (opcional)</label>
                <input value={current.horarioInicio} onChange={(e) => updateCurrentField('horarioInicio', e.target.value)} className="input-field mt-1" disabled={current.locked} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Texto do certificado *</label>
                <textarea
                  value={current.textoCertificado || ''}
                  onChange={(e) => updateCurrentField('textoCertificado', e.target.value)}
                  rows={5}
                  className="input-field mt-1 resize-y"
                  disabled={current.locked}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Você pode ajustar o texto quando a empresa pedir uma variação.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Cronograma / conteúdo programático *</label>
                <textarea
                  value={current.conteudoProgramatico || ''}
                  onChange={(e) => updateCurrentField('conteudoProgramatico', e.target.value)}
                  rows={6}
                  className="input-field mt-1 resize-y"
                  disabled={current.locked}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este campo define a segunda página do certificado (conteúdo programático).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} className="btn-secondary text-xs" disabled={stepIndex === 0}>Curso anterior</button>
              <button type="button" onClick={confirmCurrent} className="btn-primary text-xs" disabled={!canAdvance || current.confirmed}>
                {current.confirmed ? 'Curso confirmado' : 'Confirmar este curso'}
              </button>
              <button type="button" onClick={() => setStepIndex(Math.min(activeForms.length - 1, stepIndex + 1))} className="btn-secondary text-xs" disabled={stepIndex >= activeForms.length - 1}>Próximo curso</button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border border-amber-100 bg-amber-50 rounded-lg px-3 py-2">
          <button
            type="button"
            onClick={saveDraftFromCurrent}
            className="btn-secondary text-xs"
            disabled={!current || current.locked || draftBusy}
          >
            {draftBusy ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            onClick={applyDraftToCurrent}
            className="btn-secondary text-xs"
            disabled={!current || current.locked || draftBusy}
          >
            {draftBusy ? 'Carregando...' : 'Usar rascunho'}
          </button>
          {draftStatus ? <span className="text-xs text-amber-800">{draftStatus}</span> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-1">Assinatura do certificado *</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSignatureType('digital')} className={signatureType === 'digital' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Com assinatura digital</button>
              <button type="button" onClick={() => setSignatureType('manual')} className={signatureType === 'manual' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Versão assinatura manual</button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-1">Tem instrutor no certificado? *</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTemInstrutor(true)} className={temInstrutor ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Sim</button>
              <button type="button" onClick={() => setTemInstrutor(false)} className={!temInstrutor ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Não (só responsável)</button>
            </div>
          </div>
          {temInstrutor && (
            <>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Instrutor responsável *</label>
                <input value={instrutorNome} onChange={(e) => setInstrutorNome(e.target.value)} className="input-field mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Função *</label>
                <input value={instrutorCargo} onChange={(e) => setInstrutorCargo(e.target.value)} className="input-field mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">CREA/CFT *</label>
                <input value={instrutorRegistro} onChange={(e) => setInstrutorRegistro(e.target.value)} className="input-field mt-1" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            className="btn-success text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                if (temInstrutor) {
                try {
                  localStorage.setItem(cacheKey, JSON.stringify({
                    nome: instrutorNome.trim(),
                    cargo: instrutorCargo.trim(),
                    registro: instrutorRegistro.trim(),
                  }));
                } catch {}
              }
              const selectedAndConfirmed = activeForms.filter((item) => item.confirmed);
              onConfirm({
                signatureType,
                saveAsDefault,
                courseConfirmations: selectedAndConfirmed.map((item) => ({
                  cursoId: item.cursoId,
                  local: String(item.local || '').trim(),
                  data: String(item.data || '').trim(),
                  duracao: String(item.duracao || '').trim(),
                  horarioInicio: String(item.horarioInicio || '').trim(),
                  periodoInicio: String(item.periodoInicio || item.data || '').trim(),
                  periodoFim: String(item.periodoFim || item.data || '').trim(),
                  textoCertificado: String(item.textoCertificado || '').trim(),
                  conteudoProgramatico: String(item.conteudoProgramatico || '').trim(),
                  lockChecklist: false,
                  temInstrutor,
                  instrutorNome: instrutorNome.trim(),
                  instrutorCargo: instrutorCargo.trim(),
                  instrutorRegistro: instrutorRegistro.trim(),
                })),
              });
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar emissão
          </button>
        </div>
        {!canConfirm && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 uppercase">Falta para liberar emissão</p>
            <ul className="mt-1 space-y-1">
              {missingItems.map((item) => (
                <li key={item} className="text-sm text-red-700">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        <label className="flex items-start gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={confirmChecklistDone}
            onChange={(e) => setConfirmChecklistDone(e.target.checked)}
            className="mt-0.5"
          />
          Confirmo que revisei o checklist completo do aluno e os dados obrigatórios de todos os cursos.
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} />
          Usar estes dados nas próximas emissões (sem perguntar novamente)
        </label>
      </div>
    </Modal>
  );
}

function AlunoCard({ aluno, onAprovar, onAprovarCadastro, onRecusar, onDownloadPdf, onDownloadZip, processing }) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = processing?.startsWith(`${aluno.id}:`);
  const isPresent = aluno.presente === true || Number(aluno.presenca || 0) >= 75;
  const nome = safeText(aluno.nome, 'Aluno sem nome');
  const curso = safeText(aluno.nomeCurso, 'Curso não informado');
  const cpf = safeText(aluno.cpf);
  const empresa = safeText(aluno.empresa);
  const presenca = Number(aluno.presenca || 0);
  const nota = Number(aluno.notaProva || 0);
  const hasCadastroCompleto = String(aluno.filial || '').trim().length >= 2
    && Array.isArray(aluno.cursosConcluidos)
    && aluno.cursosConcluidos.length > 0;

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
          {(aluno.filial || (Array.isArray(aluno.cursosConcluidos) && aluno.cursosConcluidos.length > 0)) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              {aluno.filial && (
                <p className="text-xs text-blue-700">
                  <strong>Filial:</strong> {aluno.filial}
                </p>
              )}
              {Array.isArray(aluno.cursosConcluidos) && aluno.cursosConcluidos.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  <strong>Cursos concluídos:</strong> {aluno.cursosConcluidos.join(', ')}
                </p>
              )}
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
                onClick={() => onAprovarCadastro(aluno)}
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
          {aluno.statusCadastro === 'aprovado' && !hasCadastroCompleto && (
            <button
              onClick={() => onAprovarCadastro(aluno)}
              disabled={isProcessing}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Definir filial/cursos
            </button>
          )}
        </div>

        {/* Certificado */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Certificado</p>
            <StatusBadge status={aluno.statusCertificado} />
          </div>
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && isPresent && hasCadastroCompleto && (
            <div className="flex gap-2">
              <button
                onClick={() => onAprovar(aluno)}
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
          {aluno.statusCertificado === 'aprovado' && (
            <div className="flex gap-2">
              <button onClick={() => onDownloadPdf(aluno)} className="btn-secondary text-xs py-1.5 px-3">
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
              <button onClick={() => onDownloadZip(aluno)} className="btn-secondary text-xs py-1.5 px-3">
                <Archive className="w-3.5 h-3.5" />
                ZIP (todos)
              </button>
            </div>
          )}
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && !isPresent && (
            <span className="text-xs text-amber-600 italic">Aguardando presença na chamada</span>
          )}
          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && isPresent && !hasCadastroCompleto && (
            <span className="text-xs text-amber-600 italic">Defina filial e cursos para liberar certificado</span>
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
  const { user, students, classes, courses, updateStudentStatus, updateClassStudentsStatus, updateClassRequestStatus, refreshData, loadingData, apiError } = useApp();
  const [filter, setFilter] = useState('pendente');
  const [recusaModal, setRecusaModal] = useState(null); // { aluno, tipo }
  const [processing, setProcessing] = useState(null);
  const [recusaLoading, setRecusaLoading] = useState(false);
  const [companyRequests, setCompanyRequests] = useState([]);
  const [companyRequestProcessing, setCompanyRequestProcessing] = useState('');
  const hasCompanyRequestsApi = typeof api?.getCompanyChangeRequests === 'function'
    && typeof api?.updateCompanyChangeRequestStatus === 'function';
  const [companyRequestRecusa, setCompanyRequestRecusa] = useState(null);
  const [companyRequestMotivo, setCompanyRequestMotivo] = useState('');
  const [autorizaCadastroAluno, setAutorizaCadastroAluno] = useState(null);
  const [downloadModalAluno, setDownloadModalAluno] = useState(null);
  const [pdfSelectAluno, setPdfSelectAluno] = useState(null);
  const [downloadActionType, setDownloadActionType] = useState('pdf');
  const [editaAlunoModal, setEditaAlunoModal] = useState(null);
  const [quickEmissionConfig, setQuickEmissionConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('drmQuickEmissionConfig') || 'null');
    } catch {
      return null;
    }
  });
  const [filialByEmpresa, setFilialByEmpresa] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('drmFilialByEmpresa') || '{}');
    } catch {
      return {};
    }
  });
  const safeStudents = Array.isArray(students) ? students : [];
  const safeClasses = Array.isArray(classes) ? classes : [];
  const groupedAll = Object.values(
    safeStudents.reduce((acc, student) => {
      const cpfKey = String(student.cpf || '').trim() || String(student.id);
      if (!acc[cpfKey]) {
        acc[cpfKey] = {
          cpfKey,
          nome: student.nome,
          cpf: student.cpf,
          empresa: student.empresa,
          students: [],
        };
      }
      acc[cpfKey].students.push(student);
      return acc;
    }, {}),
  );
  const uniqueCpfs = groupedAll.map((g) => g.cpfKey);
  const groupMatchesFilter = (group, val) => {
    const items = Array.isArray(group?.students) ? group.students : [];
    const hasRecusado = items.some((s) => s.statusCadastro === 'recusado' || s.statusCertificado === 'recusado');
    const allCadastroAprovado = items.length > 0 && items.every((s) => s.statusCadastro === 'aprovado');
    const allCertAprovado = items.length > 0 && items.every((s) => s.statusCertificado === 'aprovado');
    const hasPendente = items.some((s) => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente');
    if (val === 'todos') return true;
    if (val === 'pendente') return hasPendente && !hasRecusado;
    if (val === 'aprovado') return allCadastroAprovado && allCertAprovado;
    return hasRecusado;
  };
  const studentMatchesFilter = (student, val) => {
    if (val === 'todos') return true;
    if (val === 'pendente') return student.statusCadastro === 'pendente' || student.statusCertificado === 'pendente';
    if (val === 'aprovado') return student.statusCadastro === 'aprovado' && student.statusCertificado === 'aprovado';
    return student.statusCadastro === 'recusado' || student.statusCertificado === 'recusado';
  };
  const uniqueCountByFilter = (val) => groupedAll.filter((group) => groupMatchesFilter(group, val)).length;

  useEffect(() => {
    if (!hasCompanyRequestsApi) {
      setCompanyRequests([]);
      return undefined;
    }
    let ignore = false;
    async function loadCompanyRequests() {
      try {
        const list = await api.getCompanyChangeRequests();
        if (!ignore) setCompanyRequests(Array.isArray(list) ? list : []);
      } catch {
        if (!ignore) setCompanyRequests([]);
      }
    }
    loadCompanyRequests();
    return () => { ignore = true; };
  }, [loadingData, hasCompanyRequestsApi]);

  const groupedFiltered = groupedAll.filter((group) => groupMatchesFilter(group, filter));

  const downloadBlob = ({ blob, filename }) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'certificado';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async (aluno) => {
    setPdfSelectAluno(aluno);
  };

  const handleDownloadZip = async (aluno) => {
    setDownloadActionType('zip');
    setDownloadModalAluno(aluno);
  };

  const handleConfirmDownload = async ({ signatureType, courseConfirmations, saveAsDefault }) => {
    if (!downloadModalAluno?.id) return;
    const op = `${downloadModalAluno.id}:download:${downloadActionType}`;
    setProcessing(op);
    try {
      const result = await api.exportCertificates({
        studentIds: [String(downloadModalAluno.id)],
        action: downloadActionType,
        signatureType,
        courseConfirmations,
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      downloadBlob(result);
      if (saveAsDefault) {
        const nextConfig = { signatureType, courseConfirmations };
        setQuickEmissionConfig(nextConfig);
        try {
          localStorage.setItem('drmQuickEmissionConfig', JSON.stringify(nextConfig));
        } catch {
          // noop
        }
      }
      setDownloadModalAluno(null);
    } finally {
      setProcessing(null);
    }
  };

  const handleAprovarCadastro = async (aluno) => {
    const existingCourses = Array.isArray(aluno?.cursosConcluidosIds)
      ? aluno.cursosConcluidosIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const rememberedFilial = filialByEmpresa[String(aluno?.empresa || '').trim().toLowerCase()] || '';
    const existingFilial = String(aluno?.filial || rememberedFilial || '').trim();

    // Se já temos os dados definidos no aluno, aprova direto e pula o modal.
    if (existingFilial.length >= 2 && existingCourses.length > 0) {
      const id = aluno.id;
      setProcessing(`${id}:statusCadastro`);
      try {
        await updateStudentStatus(id, 'statusCadastro', 'aprovado', null, {
          filial: existingFilial,
          cursosConcluidos: existingCourses,
        });
      } finally {
        setProcessing(null);
      }
      return;
    }

    setAutorizaCadastroAluno(aluno);
  };

  const handleSalvarEdicaoAluno = async (payload) => {
    if (!editaAlunoModal?.id) return;
    setProcessing(`${editaAlunoModal.id}:edit`);
    try {
      await api.updateStudentProfile(editaAlunoModal.id, payload);
      await refreshData();
      setEditaAlunoModal(null);
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmAutorizaCadastro = async (payload) => {
    if (!autorizaCadastroAluno?.id) return;
    const id = autorizaCadastroAluno.id;
    setProcessing(`${id}:statusCadastro`);
    try {
      await updateStudentStatus(id, 'statusCadastro', 'aprovado', null, payload);
      const empresaKey = String(autorizaCadastroAluno?.empresa || '').trim().toLowerCase();
      if (empresaKey && payload?.filial) {
        const next = { ...filialByEmpresa, [empresaKey]: payload.filial };
        setFilialByEmpresa(next);
        try {
          localStorage.setItem('drmFilialByEmpresa', JSON.stringify(next));
        } catch {
          // noop
        }
      }
      setAutorizaCadastroAluno(null);
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

  const pendentes = safeStudents.filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente').length;
  const pendingCompanyRequests = companyRequests.filter(item => String(item.status || '') === 'pendente');
  const turmaPendentes = safeClasses
    .map(turma => ({
      ...turma,
      students: safeStudents.filter(student => String(student.turmaId) === String(turma.id)),
    }))
    .filter((turma) => turma.students.length > 0 || String(turma.origem || '') === 'pre-cadastro-empresarial');

  const handleCompanyRequestApprove = async (requestId) => {
    if (!hasCompanyRequestsApi) return;
    setCompanyRequestProcessing(`approve:${requestId}`);
    try {
      await api.updateCompanyChangeRequestStatus(requestId, { status: 'aprovado' });
      const list = await api.getCompanyChangeRequests();
      setCompanyRequests(Array.isArray(list) ? list : []);
    } finally {
      setCompanyRequestProcessing('');
    }
  };

  const handleCompanyRequestRecusa = async () => {
    if (!hasCompanyRequestsApi) return;
    if (!companyRequestRecusa?.id) return;
    if (!companyRequestMotivo.trim()) return;
    setCompanyRequestProcessing(`reject:${companyRequestRecusa.id}`);
    try {
      await api.updateCompanyChangeRequestStatus(companyRequestRecusa.id, {
        status: 'recusado',
        motivoRecusa: companyRequestMotivo.trim(),
      });
      const list = await api.getCompanyChangeRequests();
      setCompanyRequests(Array.isArray(list) ? list : []);
      setCompanyRequestRecusa(null);
      setCompanyRequestMotivo('');
    } finally {
      setCompanyRequestProcessing('');
    }
  };

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

      {pendingCompanyRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Solicitações de alteração de empresa</h3>
            <span className="badge-yellow">{pendingCompanyRequests.length} pendente(s)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingCompanyRequests.map((item) => (
              <div key={`company-request-${item.id}`} className="card space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Empresa</p>
                  <p className="font-bold text-gray-900">{safeText(item.empresa)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Tipo:</span> <strong>{item.tipo === 'senha' ? 'Troca de senha' : 'Alteração de dados'}</strong></div>
                  <div><span className="text-gray-500">Solicitado por:</span> <strong>{safeText(item.criadoPor)}</strong></div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                  <p className="text-xs text-gray-500">Motivo</p>
                  <p className="text-sm text-gray-700">{safeText(item.motivo)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCompanyRequestApprove(item.id)}
                    disabled={companyRequestProcessing !== ''}
                    className="btn-success text-xs disabled:opacity-60"
                  >
                    {companyRequestProcessing === `approve:${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCompanyRequestRecusa(item); setCompanyRequestMotivo(''); }}
                    disabled={companyRequestProcessing !== ''}
                    className="btn-danger text-xs disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                    {String(turma.origem || '') === 'pre-cadastro-empresarial' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={turma.solicitacaoCursoStatus === 'aprovado' ? 'badge-green' : turma.solicitacaoCursoStatus === 'recusado' ? 'badge-red' : 'badge-yellow'}>
                          Solicitação do curso: {turma.solicitacaoCursoStatus || 'pendente'}
                        </span>
                        {turma.motivoSolicitacao && (
                          <span className="text-xs text-red-600">Obs: {turma.motivoSolicitacao}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-gray-50 p-2"><p className="font-bold">{turma.students.length}</p><p className="text-[10px] text-gray-500">Alunos</p></div>
                    <div className="rounded-lg bg-amber-50 p-2"><p className="font-bold text-amber-700">{certPendentes.length}</p><p className="text-[10px] text-amber-600">Pendentes</p></div>
                    <div className="rounded-lg bg-green-50 p-2"><p className="font-bold text-green-700">{certAprovados.length}</p><p className="text-[10px] text-green-600">Aprovados</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {String(turma.origem || '') === 'pre-cadastro-empresarial' && turma.solicitacaoCursoStatus !== 'aprovado' && (
                      <button
                        type="button"
                        onClick={() => updateClassRequestStatus(turma.id, { value: 'aprovado' })}
                        className="btn-success text-xs"
                      >
                        Aprovar solicitação do curso
                      </button>
                    )}
                    {String(turma.origem || '') === 'pre-cadastro-empresarial' && turma.solicitacaoCursoStatus !== 'recusado' && (
                      <button
                        type="button"
                        onClick={() => updateClassRequestStatus(turma.id, { value: 'recusado', motivo: 'Solicitação recusada na análise DRM.' })}
                        className="btn-danger text-xs"
                      >
                        Recusar solicitação
                      </button>
                    )}
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
      {quickEmissionConfig && (
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">
            Emissão rápida ativa. Os próximos downloads usam dados salvos automaticamente.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuickEmissionConfig(null);
              try {
                localStorage.removeItem('drmQuickEmissionConfig');
              } catch {
                // noop
              }
            }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Limpar padrão de emissão
          </button>
        </div>
      )}

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
              {uniqueCountByFilter(val)}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 -mt-1">
        {uniqueCpfs.length} aluno(s) único(s) por CPF • {safeStudents.length} registro(s) aluno+curso
      </p>

      {/* List */}
      {loadingData ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-gray-500 font-medium">Carregando análise...</p>
        </div>
      ) : groupedFiltered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-green-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum item para exibir</p>
          <p className="text-gray-400 text-sm">Mude o filtro ou aguarde novos cadastros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedFiltered.map((group) => {
            const visibleStudents = group.students.filter((s) => studentMatchesFilter(s, filter));
            if (visibleStudents.length === 0) return null;
            return (
            <div key={`group-${group.cpfKey}`} className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-black text-gray-900">{safeText(group.nome, 'Aluno')}</p>
                  <p className="text-sm text-gray-600">{safeText(group.cpf)} • {safeText(group.empresa)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {visibleStudents.length} curso(s)
                </span>
              </div>
              <div className="space-y-3">
                {visibleStudents.map((aluno) => {
                  const isProcessing = processing?.startsWith(`${aluno.id}:`);
                  const isPresent = aluno.presente === true || Number(aluno.presenca || 0) >= 75;
                  const hasCadastroCompleto = String(aluno.filial || '').trim().length >= 2
                    && Array.isArray(aluno.cursosConcluidos)
                    && aluno.cursosConcluidos.length > 0;
                  const isFullyApproved = aluno.statusCadastro === 'aprovado' && aluno.statusCertificado === 'aprovado';
                  const isLockedAfterEmission = Boolean(aluno.certificadoChecklistConfirmadoEm || aluno.certificadoEnviado);
                  return (
                    <div key={aluno.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-800">{safeText(aluno.nomeCurso, 'Curso')}</p>
                          <p className="text-xs text-gray-500">Cadastro: <StatusBadge status={aluno.statusCadastro} /> • Certificado: <StatusBadge status={aluno.statusCertificado} /></p>
                          <p className="text-xs text-gray-600 mt-1">
                            Local: <strong>{safeText(aluno.local, 'A definir')}</strong> • Data: <strong>{safeText(aluno.data, 'A definir')}</strong> • Carga horária: <strong>{safeText(aluno.duracao, 'A definir')}</strong>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isLockedAfterEmission && (
                            <button
                              onClick={() => setEditaAlunoModal(aluno)}
                              disabled={isProcessing}
                              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
                            >
                              Editar dados/curso
                            </button>
                          )}
                          {aluno.statusCadastro === 'pendente' && (
                            <button
                              onClick={() => handleAprovarCadastro(aluno)}
                              disabled={isProcessing}
                              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
                            >
                              Autorizar cadastro
                            </button>
                          )}
                          {aluno.statusCertificado === 'pendente' && aluno.statusCadastro === 'aprovado' && isPresent && hasCadastroCompleto && (
                            <button
                              onClick={() => {
                                setDownloadActionType('pdf');
                                setDownloadModalAluno(aluno);
                              }}
                              disabled={isProcessing}
                              className="btn-success text-xs py-1.5 px-3 disabled:opacity-60"
                            >
                              Checklist e emitir
                            </button>
                          )}
                          {aluno.statusCertificado === 'aprovado' && (
                            <>
                              <button onClick={() => handleDownloadPdf(aluno)} className="btn-secondary text-xs py-1.5 px-3">
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </button>
                              <button onClick={() => handleDownloadZip(aluno)} className="btn-secondary text-xs py-1.5 px-3">
                                <Archive className="w-3.5 h-3.5" />
                                ZIP
                              </button>
                            </>
                          )}
                          {!isFullyApproved && (
                            <button
                              onClick={() => handleRecusar(aluno, aluno.statusCadastro === 'pendente' ? 'Cadastro' : 'Certificado')}
                              disabled={isProcessing}
                              className="btn-danger text-xs py-1.5 px-3 disabled:opacity-60"
                            >
                              Recusar
                            </button>
                          )}
                          {isFullyApproved && (
                            <span className="badge-green">Emitido: edição bloqueada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )})}
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

      <Modal isOpen={!!companyRequestRecusa} onClose={() => setCompanyRequestRecusa(null)} title="Recusar solicitação da empresa" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Informe o motivo da recusa para a empresa <strong>{companyRequestRecusa?.empresa || '-'}</strong>.
          </p>
          <textarea
            value={companyRequestMotivo}
            onChange={(event) => setCompanyRequestMotivo(event.target.value)}
            className="input-field min-h-24"
            placeholder="Ex: dados inconsistentes, envie documentação complementar."
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCompanyRequestRecusa(null)} className="btn-secondary text-sm">Cancelar</button>
            <button
              type="button"
              onClick={handleCompanyRequestRecusa}
              disabled={!companyRequestMotivo.trim() || companyRequestProcessing !== ''}
              className="btn-danger text-sm disabled:opacity-60"
            >
              {companyRequestProcessing === `reject:${companyRequestRecusa?.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Confirmar recusa
            </button>
          </div>
        </div>
      </Modal>

      <AutorizaCadastroModal
        isOpen={!!autorizaCadastroAluno}
        onClose={() => setAutorizaCadastroAluno(null)}
        onConfirm={handleConfirmAutorizaCadastro}
        aluno={autorizaCadastroAluno}
        courses={courses}
        loading={processing === `${autorizaCadastroAluno?.id}:statusCadastro`}
        rememberedFilial={filialByEmpresa[String(autorizaCadastroAluno?.empresa || '').trim().toLowerCase()] || ''}
      />
      <EditarAlunoCursoModal
        isOpen={Boolean(editaAlunoModal)}
        onClose={() => setEditaAlunoModal(null)}
        onConfirm={handleSalvarEdicaoAluno}
        aluno={editaAlunoModal}
        courses={courses}
        loading={processing === `${editaAlunoModal?.id}:edit`}
      />

      <EmissaoCertificadoModal
        isOpen={!!downloadModalAluno}
        onClose={() => setDownloadModalAluno(null)}
        onConfirm={handleConfirmDownload}
        aluno={downloadModalAluno}
        loading={processing === `${downloadModalAluno?.id}:download:${downloadActionType}`}
        actionType={downloadActionType}
        allStudents={safeStudents}
        courses={courses}
      />

      <SelecionarCertificadoPdfModal
        isOpen={!!pdfSelectAluno}
        onClose={() => setPdfSelectAluno(null)}
        aluno={pdfSelectAluno}
        allStudents={safeStudents}
        onConfirm={(selectedCourseStudent) => {
          setPdfSelectAluno(null);
          setDownloadActionType('pdf');
          setDownloadModalAluno(selectedCourseStudent);
        }}
      />
    </div>
  );
}
