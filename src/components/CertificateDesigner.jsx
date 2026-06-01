import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Download, Eye, EyeOff, Image as ImageIcon, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import {
  certificateFieldLabels,
  defaultCertificateConfig,
  defaultCertificateLayout,
  mergeCertificateConfig,
  sampleCertificateStudent,
} from '../data/certificateDefaults';

const STORAGE_KEY = 'drmCertificateLayout';
const CONFIG_STORAGE_KEY = 'drmCertConfig';
const PAGE_WIDTH = 1123;
const PAGE_HEIGHT = 794;
const MIN_READABLE_FONT_SIZE = 9.2;
const INSTRUCTOR_FIELD_IDS = new Set(['instrutorNome', 'instrutorCargo', 'instrutorRegistro', 'instrutorTipo']);

const fieldTextConfig = {
  nomeEmpresa: { key: 'nomeEmpresa', multiline: false },
  cnpjEmpresaTopo: { key: 'cnpjModelo', multiline: false },
  titulo: { key: 'tituloCertificado', multiline: false },
  textoCertificado: { key: 'textoCertificadoModelo', multiline: true },
  dataLocal: { key: 'detalhesCursoModelo', multiline: false },
  assinaturaResponsavel: { key: 'nomeResponsavel', multiline: false },
  assinaturaValidade: { key: 'assinaturaValidacaoModelo', multiline: true },
  cargoResponsavel: { key: 'cargoResponsavel', multiline: false },
  creaResponsavel: { key: 'creaResponsavel', multiline: false },
  participanteTipo: { key: 'registroParticipante', multiline: false },
  conteudoTitulo: { key: 'conteudoTitulo', multiline: false },
  conteudoSubtitulo: { key: 'conteudoSubtitulo', multiline: false },
  conteudoProgramatico: { key: 'conteudoProgramatico', multiline: true },
  rodape: { key: 'textoRodape', multiline: true },
};

export function getStoredCertificateLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored.version !== defaultCertificateLayout.version) return defaultCertificateLayout;
    return mergeCertificateLayout(stored);
  } catch {
    return defaultCertificateLayout;
  }
}

export function getStoredCertificateConfig() {
  try {
    return mergeCertificateConfig(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '{}'));
  } catch {
    return defaultCertificateConfig;
  }
}

export function saveCertificateLayout(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeCertificateLayout(layout)));
}

function saveCertificateConfig(config) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(mergeCertificateConfig(config)));
}

export function mergeCertificateLayout(layout = {}) {
  const mergedFields = {
    ...defaultCertificateLayout.fields,
    ...(layout.fields || {}),
  };

  mergedFields.localCursoTopo = {
    ...defaultCertificateLayout.fields.localCursoTopo,
    visible: false,
  };

  const highestFieldPage = Object.values(mergedFields).reduce(
    (highest, field) => Math.max(highest, Number(field.page) || 1),
    1,
  );

  return {
    ...defaultCertificateLayout,
    ...layout,
    pages: Math.max(defaultCertificateLayout.pages, Number(layout.pages) || 0, highestFieldPage),
    fields: mergedFields,
  };
}

function buildSafeDetailsLine({ cidade = '', dataExtenso = '', hora = '' }) {
  const city = String(cidade || '').trim();
  const dateText = String(dataExtenso || '').trim();
  const hourText = String(hora || '').trim();
  if (!city && !dateText) return '';
  if (!city) return `${dateText}${hourText}`;
  if (!dateText) return `${city}${hourText}`;
  const cityNorm = city.toLowerCase();
  const dateNorm = dateText.toLowerCase();
  if (cityNorm.includes(dateNorm)) return `${city}${hourText}`;
  return `${city}, ${dateText}${hourText}`;
}

function formatDate(date) {
  if (!date) return '--/--/----';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR');
}

function formatLongDate(date) {
  if (!date) return '';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateTime) {
  if (!dateTime) return 'data e hora não autorizadas';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value ?? ''),
    template || ''
  );
}

function extractNorma(curso = '') {
  const match = String(curso).match(/\bNR[-\s]?(\d{1,2})\b/i);
  return match ? `NR\n${match[1]}` : 'NR';
}

function certificateValues(config = {}, aluno = {}) {
  const cfg = mergeCertificateConfig(config);
  const data = { ...sampleCertificateStudent, ...aluno };
  const temInstrutor = data.temInstrutor !== false;
  const instrutorNome = temInstrutor ? data.instrutorNome || data.nomeInstrutor || data.instrutor || 'Instrutor não informado' : '';
  const instrutorCargo = temInstrutor ? data.instrutorCargo || data.cargoInstrutor || data.instrutorFuncao || 'Técnico/Engenheiro responsável' : '';
  const instrutorRegistro = temInstrutor ? data.instrutorRegistro || data.registroInstrutor || data.creaInstrutor || data.cftInstrutor || 'CREA/CFT não informado' : '';
  const periodoInicio = formatDate(data.periodoInicio || data.data);
  const periodoFim = formatDate(data.periodoFim || data.data);
  const templateValues = {
    nome: data.nome,
    cpf: data.cpf || '000.000.000-00',
    curso: data.nomeCurso,
    instrutor: instrutorNome,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    duracao: data.duracao || '8 horas',
    local: data.local || 'local definido',
    cidade: data.local || cfg.endereco,
    data: formatDate(data.data),
    dataExtenso: formatLongDate(data.data),
    hora: data.horarioInicio ? `, às ${data.horarioInicio}` : '',
    periodo: periodoInicio === periodoFim ? periodoFim : `${periodoInicio} a ${periodoFim}`,
    norma: extractNorma(data.nomeCurso),
    validadeAnos: cfg.validadeAnos || '2',
    cnpj: cfg.cnpj,
    responsavel: data.certificadoAutorizadoPor || cfg.nomeResponsavel,
    localAssinatura: data.certificadoAssinaturaLocal || cfg.assinaturaDigitalLocal || cfg.endereco,
    assinaturaDataHora: formatDateTime(data.certificadoAutorizadoEm || cfg.assinaturaDigitalAutorizadaEm),
    assinaturaCodigo: data.certificadoAssinaturaCodigo || cfg.assinaturaDigitalCodigo || 'DRM-AUTH-000000',
  };

  return {
    marca: 'DRM',
    nomeEmpresa: cfg.nomeEmpresa,
    cnpjEmpresaTopo: renderTemplate(cfg.cnpjModelo, templateValues),
    localCursoTopo: data.local || cfg.endereco,
    nrBadge: renderTemplate(cfg.normaBadge, templateValues),
    nrBadgeConteudo: renderTemplate(cfg.normaBadge, templateValues),
    titulo: cfg.tituloCertificado,
    textoCertificado: renderTemplate(cfg.textoCertificadoModelo, templateValues),
    dataLocal: buildSafeDetailsLine({
      cidade: templateValues.cidade,
      dataExtenso: templateValues.dataExtenso,
      hora: templateValues.hora,
    }),
    assinaturaResponsavel: cfg.nomeResponsavel,
    assinaturaValidade: renderTemplate(cfg.assinaturaValidacaoModelo, templateValues),
    cargoResponsavel: cfg.cargoResponsavel,
    creaResponsavel: cfg.creaResponsavel,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    instrutorTipo: cfg.instrutorRotulo,
    participanteNome: data.nome,
    participanteCpf: `CPF ${data.cpf || '000.000.000-00'}`,
    participanteTipo: cfg.registroParticipante,
    marcaCentral: cfg.assinaturaEmpresaTexto,
    conteudoTitulo: cfg.conteudoTitulo,
    conteudoSubtitulo: renderTemplate(cfg.conteudoSubtitulo, templateValues),
    conteudoProgramatico: cfg.conteudoProgramatico,
    rodape: cfg.textoRodape,
  };
}

function fieldColor(field, config) {
  if (field.color === 'primary') return config.corPrimaria;
  if (field.color === 'secondary') return config.corSecundaria;
  if (field.color === 'accent') return config.corAcento || config.corSecundaria;
  if (field.color === 'muted') return config.corAcento || '#64748B';
  return '#1E1E24';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rangeControl(label, value, min, max, onChange, suffix = '%') {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full"
      />
      <p className="text-xs text-gray-400">{value}{suffix}</p>
    </div>
  );
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(249, 115, 22, ${alpha})`;

  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pageBackground(page, cfg) {
  const primarySoft = hexToRgba(cfg.corPrimaria, page === 2 ? 0.16 : 0.18);
  const secondarySoft = hexToRgba(cfg.corSecundaria, page === 2 ? 0.07 : 0.09);
  const warmPaper = '#FFF7ED';

  if (page === 2) {
    return {
      background: `linear-gradient(135deg, #ffffff 0%, #ffffff 18%, ${primarySoft} 18%, ${warmPaper} 38%, #ffffff 64%, ${secondarySoft} 100%)`,
    };
  }

  return {
    background: `linear-gradient(135deg, #ffffff 0%, #ffffff 14%, ${primarySoft} 14%, ${warmPaper} 34%, #ffffff 62%, ${secondarySoft} 100%)`,
  };
}

function CertificateDecor({ page, cfg }) {
  const primary = cfg.corPrimaria || '#F97316';
  const secondary = cfg.corSecundaria || '#DC2626';
  const accent = cfg.corAcento || '#3F3F46';
  const headerTop = page === 2 ? '23.2%' : '20.2%';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-[2%]"
        style={{
          border: `2px solid ${hexToRgba(primary, 0.68)}`,
          boxShadow: `inset 0 0 0 3px #ffffff, inset 0 0 0 5px ${hexToRgba(primary, 0.22)}`,
        }}
      />
      <div
        className="absolute left-[2%] top-[2%] h-[1%] w-[46%]"
        style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
      />
      <div
        className="absolute right-[2%] top-[2%] h-[1%] w-[21%]"
        style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0.25)}, ${primary})` }}
      />
      <div
        className="absolute left-[2%] right-[2%] border-t border-dashed"
        style={{ top: headerTop, borderColor: hexToRgba(primary, 0.62) }}
      />
      <div
        className="absolute left-[2%] right-[2%] h-[11.2%]"
        style={{
          top: page === 2 ? '24%' : '21%',
          background: `linear-gradient(90deg, ${hexToRgba(primary, 0.25)}, ${hexToRgba(secondary, 0.08)}, rgba(255,255,255,0))`,
          borderTop: `1px solid ${hexToRgba(primary, 0.22)}`,
          borderBottom: `1px solid ${hexToRgba(primary, 0.22)}`,
        }}
      />
      <div
        className="absolute right-[-6%] top-[-10%] h-[35%] w-[28%]"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primary, 0.28)}, ${hexToRgba(secondary, 0.14)})`,
          clipPath: 'polygon(34% 0, 100% 0, 100% 100%, 0 64%)',
        }}
      />
      <div
        className="absolute left-[-7%] bottom-[2%] h-[18%] w-[28%]"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primary, 0.28)}, rgba(255,255,255,0))`,
          clipPath: 'polygon(0 0, 75% 54%, 55% 100%, 0 100%)',
        }}
      />
      <div
        className="absolute left-[3%] bottom-[4.6%] h-[2%] w-[34%]"
        style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0.86)}, ${hexToRgba(primary, 0)})` }}
      />
      <div
        className="absolute right-[3%] bottom-[4.6%] h-[2%] w-[34%]"
        style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0)}, ${hexToRgba(primary, 0.84)})` }}
      />
      <div
        className="absolute left-[41%] bottom-[3.4%] h-[1%] w-[18%]"
        style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
      />
    </div>
  );
}

function LogoImage({ src, alt, className, fallback }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return fallback;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function SpecialField({ id, field, cfg, values, scale }) {
  const logoSrc = cfg.logoAssetPath || cfg.logoUrl;

  if (field.kind === 'brand') {
    return (
      <div className="w-full h-full relative">
        <LogoImage
          src={logoSrc}
          alt="Logo DRM"
          className="w-full h-full object-contain object-left"
          fallback={(
          <>
            <div
              className="absolute font-black italic leading-none"
              style={{ left: '4%', top: '5%', color: cfg.corPrimaria, fontSize: `${field.fontSize * 2.3 * scale}px` }}
            >
              D
            </div>
            <div
              className="absolute font-black italic leading-none"
              style={{ left: '14%', top: '16%', color: cfg.corSecundaria, fontSize: `${field.fontSize * 2.3 * scale}px` }}
            >
              R
            </div>
          </>
          )}
        />
      </div>
    );
  }

  if (field.kind === 'centerBrand') {
    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0)',
        }}
      >
        <LogoImage
          src={logoSrc}
          alt="Marca central"
          className="w-full h-full object-contain opacity-95"
          fallback={(
          <span className="font-black italic" style={{ color: cfg.corPrimaria, fontSize: `${field.fontSize * scale}px` }}>
            DRM
          </span>
          )}
        />
      </div>
    );
  }

  if (field.kind === 'digitalSignature') {
    const signatureSrc = cfg.assinaturaDigitalUrl;

    return (
      <div className="w-full h-full flex items-center justify-center">
        <LogoImage
          src={signatureSrc}
          alt="Assinatura digital DRM"
          className="w-full h-full object-contain"
          fallback={(
            <div
              className="w-full h-full flex flex-col items-center justify-center rounded-md border border-dashed"
              style={{
                borderColor: hexToRgba(cfg.corPrimaria, 0.35),
                color: cfg.corPrimaria,
                background: hexToRgba(cfg.corPrimaria, 0.04),
              }}
            >
              <span className="font-black" style={{ fontSize: `${field.fontSize * scale}px` }}>DRM</span>
              <span className="font-bold" style={{ fontSize: `${Math.max(8, field.fontSize * 0.55) * scale}px` }}>
                assinatura digital
              </span>
            </div>
          )}
        />
      </div>
    );
  }

  if (field.kind === 'nrBadge') {
    return (
      <div
        className="w-full h-full flex items-center justify-center text-center leading-none"
        style={{
          background: `linear-gradient(135deg, #ffffff 0%, ${hexToRgba(cfg.corPrimaria, 0.08)} 100%)`,
          border: `${Math.max(1, 2 * scale)}px solid ${cfg.corPrimaria}`,
          borderRadius: '18%',
          transform: 'rotate(45deg)',
          boxShadow: `0 0 0 ${Math.max(1, 1 * scale)}px ${hexToRgba(cfg.corSecundaria, 0.72)} inset, 0 ${4 * scale}px ${12 * scale}px ${hexToRgba(cfg.corPrimaria, 0.18)}`,
        }}
      >
        <span
          className="font-black whitespace-pre-line"
          style={{ transform: 'rotate(-45deg)', fontSize: `${field.fontSize * scale}px`, color: cfg.corPrimaria }}
        >
          {values[id]}
        </span>
      </div>
    );
  }

  if (field.kind === 'locationText') {
    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          border: `${Math.max(1, 2 * scale)}px solid ${cfg.corPrimaria}`,
          background: 'rgba(255,255,255,0.34)',
        }}
      >
        <span
          className="font-black uppercase whitespace-nowrap"
          style={{
            color: cfg.corPrimaria,
            fontSize: `${field.fontSize * scale}px`,
            letterSpacing: `${0.45 * scale}px`,
          }}
        >
          LOCAL DO CURSO - {values[id]}
        </span>
      </div>
    );
  }

  if (field.kind === 'seal') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span
          className="block rounded-full bg-white"
          style={{
            width: '72%',
            height: '72%',
            border: `${Math.max(1, 3 * scale)}px solid ${cfg.corAcento || '#64748B'}`,
            boxShadow: `0 0 0 ${Math.max(1, 2 * scale)}px #fff inset, 0 0 0 ${Math.max(1, 1 * scale)}px ${hexToRgba(cfg.corSecundaria, 0.65)}`,
          }}
        />
      </div>
    );
  }

  if (field.kind === 'signature') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span
          className="font-black"
          style={{
            color: cfg.corPrimaria,
            fontSize: `${field.fontSize * scale}px`,
            textShadow: `0 ${1 * scale}px ${2 * scale}px ${hexToRgba(cfg.corPrimaria, 0.16)}`,
          }}
        >
          DRM
        </span>
      </div>
    );
  }

  return null;
}

export function CertificatePreview({ config, aluno, layout, editable = false, onChange, selected, onSelect }) {
  const pageRefs = useRef({});
  const [dragging, setDragging] = useState(null);
  const [pageWidth, setPageWidth] = useState(PAGE_WIDTH);
  const mergedLayout = useMemo(() => mergeCertificateLayout(layout), [layout]);
  const cfg = mergeCertificateConfig(config);
  const values = certificateValues(cfg, aluno);
  const showInstructor = aluno?.temInstrutor !== false;
  const scale = pageWidth / PAGE_WIDTH;
  const pages = Array.from({ length: mergedLayout.pages || 1 }, (_, index) => index + 1);

  useEffect(() => {
    if (!pageRefs.current[1]) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(entry.contentRect.width || PAGE_WIDTH);
    });
    observer.observe(pageRefs.current[1]);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dragging || !editable) return undefined;

    const handleMove = (event) => {
      const rect = pageRefs.current[dragging.page]?.getBoundingClientRect();
      if (!rect) return;

      const current = mergedLayout.fields[dragging.id];
      const nextX = ((event.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
      const nextY = ((event.clientY - rect.top - dragging.offsetY) / rect.height) * 100;

      onChange?.({
        ...mergedLayout,
        fields: {
          ...mergedLayout.fields,
          [dragging.id]: {
            ...current,
            x: Number(clamp(nextX, 0, 100 - current.w).toFixed(2)),
            y: Number(clamp(nextY, 0, 100 - current.h).toFixed(2)),
          },
        },
      });
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, editable, mergedLayout, onChange]);

  const startDrag = (event, id, field) => {
    if (!editable) return;
    const page = field.page || 1;
    const rect = pageRefs.current[page]?.getBoundingClientRect();
    if (!rect) return;

    onSelect?.(id);
    setDragging({
      id,
      page,
      offsetX: event.clientX - rect.left - (field.x / 100) * rect.width,
      offsetY: event.clientY - rect.top - (field.y / 100) * rect.height,
    });
  };

  return (
    <div className="space-y-5 certificate-pages">
      {pages.map(page => (
        <div
          key={page}
          ref={node => { if (node) pageRefs.current[page] = node; }}
          className="relative w-full overflow-hidden bg-white shadow-sm border border-gray-300 certificate-page"
          style={{
            aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
            ...pageBackground(page, cfg),
          }}
        >
          <CertificateDecor page={page} cfg={cfg} />

          {Object.entries(mergedLayout.fields).map(([id, field]) => {
            if (!field.visible || (field.page || 1) !== page) return null;
            if (!showInstructor && INSTRUCTOR_FIELD_IDS.has(id)) return null;
            const isSelected = editable && selected === id;
            const isSpecial = Boolean(field.kind);
            const renderedFontSize = Math.max(field.fontSize || MIN_READABLE_FONT_SIZE, MIN_READABLE_FONT_SIZE) * scale;

            return (
              <button
                key={id}
                type="button"
                onPointerDown={(event) => startDrag(event, id, field)}
                className={`absolute bg-transparent p-0 ${editable ? 'cursor-move' : 'cursor-default'} ${isSelected ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.w}%`,
                  height: `${field.h}%`,
                  minHeight: `${field.h}%`,
                  whiteSpace: 'pre-wrap',
                  textAlign: field.align,
                  color: fieldColor(field, cfg),
                  fontFamily: field.serif ? 'Georgia, Times New Roman, serif' : 'Arial, Helvetica, sans-serif',
                  fontSize: `${renderedFontSize}px`,
                  fontWeight: field.weight,
                  fontStyle: field.italic ? 'italic' : 'normal',
                  letterSpacing: field.letterSpacing ? `${field.letterSpacing * scale}px` : '0',
                  lineHeight: field.lineHeight || 1.18,
                  textShadow: field.shadow ? `1px 1px 0 #ffffff, 2px 2px 0 #11111133` : 'none',
                  border: '0',
                  overflowWrap: 'break-word',
                }}
              >
                {isSpecial ? (
                  <SpecialField id={id} field={field} cfg={cfg} values={values} scale={scale} />
                ) : (
                  <>
                    {field.line && (
                      <span
                        className="block w-full mx-auto mb-1"
                        style={{
                          height: `${Math.max(1, 1.4 * scale)}px`,
                          backgroundColor: cfg.corPrimaria,
                        }}
                      />
                    )}
                    {values[id]}
                  </>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function CertificateDesigner({ config, layout, onChange, onSave, onConfigChange }) {
  const [selected, setSelected] = useState('textoCertificado');
  const [imageSaved, setImageSaved] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [pendingTextChanges, setPendingTextChanges] = useState({});
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [previewSnapshot, setpreviewSnapshot] = useState(null);
  const fileInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const mergedLayout = useMemo(() => mergeCertificateLayout(layout), [layout]);
  const selectedField = mergedLayout.fields[selected] || mergedLayout.fields.textoCertificado || Object.values(mergedLayout.fields)[0];
  const selectedTextConfig = fieldTextConfig[selected];
  const currentConfig = mergeCertificateConfig(config);
  const activeLogoSrc = currentConfig.logoAssetPath || currentConfig.logoUrl;
  const activeSignatureSrc = currentConfig.assinaturaDigitalUrl;
  const selectedPendingText = selectedTextConfig ? pendingTextChanges[selectedTextConfig.key] : null;
  const hasUnconfirmedText = Object.values(pendingTextChanges).some(change => !change.confirmed);

  const updateSelected = (patch) => {
    onChange?.({
      ...mergedLayout,
      fields: {
        ...mergedLayout.fields,
        [selected]: {
          ...selectedField,
          ...patch,
        },
      },
    });
  };

  const resetSelected = () => {
    updateSelected(defaultCertificateLayout.fields[selected]);
    setDeleteRequested(false);
  };

  const handleSaveAll = () => {
    if (hasUnconfirmedText) return;
    saveCertificateConfig(currentConfig);
    saveCertificateLayout(mergedLayout);
    onSave?.(currentConfig, mergedLayout);
    setPendingTextChanges({});
  };

  const handleDownloadDemo = () => {
    const layoutSnapshot = mergeCertificateLayout(mergedLayout);
    const configSnapshot = mergeCertificateConfig(currentConfig);

    saveCertificateLayout(layoutSnapshot);
    saveCertificateConfig(configSnapshot);
    flushSync(() => setpreviewSnapshot({
      config: configSnapshot,
      layout: layoutSnapshot,
    }));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  useEffect(() => {
    const handleAfterPrint = () => setpreviewSnapshot(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const updateConfig = (patch) => {
    const nextConfig = { ...currentConfig, ...patch };
    saveCertificateConfig(nextConfig);
    onConfigChange?.(nextConfig);
  };

  const flashImageSaved = () => {
    setImageSaved(true);
    setTimeout(() => setImageSaved(false), 2500);
  };

  const flashSignatureSaved = () => {
    setSignatureSaved(true);
    setTimeout(() => setSignatureSaved(false), 2500);
  };

  const updateTextConfig = (key, value) => {
    const currentPending = pendingTextChanges[key];
    const before = currentPending?.before ?? currentConfig[key] ?? '';
    const nextConfig = { ...currentConfig, [key]: value };

    onConfigChange?.(nextConfig);
    setPendingTextChanges(prev => {
      if (value === before) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: {
          key,
          fieldId: selected,
          label: certificateFieldLabels[selected] || 'Campo',
          before,
          after: value,
          read: false,
          confirmed: false,
        },
      };
    });
  };

  const setPendingRead = (key, read) => {
    setPendingTextChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        read,
      },
    }));
  };

  const confirmPendingText = (key) => {
    setPendingTextChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        confirmed: true,
      },
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateConfig({
        logoUrl: reader.result,
        logoName: file.name,
      });
      flashImageSaved();
      setSelected('marca');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    updateConfig({
      logoUrl: '',
      logoName: '',
    });
    flashImageSaved();
    setSelected('marca');
  };

  const handleSignatureUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateConfig({
        assinaturaDigitalUrl: reader.result,
        assinaturaDigitalName: file.name,
      });
      flashSignatureSaved();
      setSelected('assinaturaGrafica');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    updateConfig({
      assinaturaDigitalUrl: '',
      assinaturaDigitalName: '',
    });
    flashSignatureSaved();
    setSelected('assinaturaGrafica');
  };

  const handleAuthorizeSignature = () => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    const code = `DRM-AUTH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;

    updateConfig({
      assinaturaDigitalAutorizadaEm: localDateTime,
      assinaturaDigitalCodigo: code,
      assinaturaDigitalLocal: currentConfig.assinaturaDigitalLocal || currentConfig.endereco,
    });
    flashSignatureSaved();
    setSelected('assinaturaValidade');
  };

  const handleSelectField = (fieldId) => {
    setSelected(fieldId);
    setDeleteRequested(false);
  };

  const confirmDeleteSelected = () => {
    updateSelected({ visible: false });
    setDeleteRequested(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4">
      <div>
        <CertificatePreview
          config={config}
          aluno={sampleCertificateStudent}
          layout={mergedLayout}
          editable
          selected={selected}
          onSelect={handleSelectField}
          onChange={onChange}
        />
      </div>

      {previewSnapshot && createPortal(
        <div className="certificate-print-area certificate-preview-print" aria-hidden="true">
          <CertificatePreview
            config={previewSnapshot.config}
            aluno={sampleCertificateStudent}
            layout={previewSnapshot.layout}
          />
        </div>,
        document.body,
      )}

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">Imagem</span>
            </div>
            {imageSaved && <span className="text-xs font-medium text-green-700">Salva</span>}
          </div>

          {activeLogoSrc && (
            <div className="h-20 rounded-lg border border-gray-100 bg-gray-50 p-2 mb-3">
              <img
                src={activeLogoSrc}
                alt="Logo do certificado"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <Upload className="w-4 h-4" />
              Carregar
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={!currentConfig.logoUrl}
              className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          </div>
          {currentConfig.logoName && (
            <p className="text-xs text-gray-400 truncate mt-2">{currentConfig.logoName}</p>
          )}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-950">Assinatura digital DRM</p>
              <p className="text-xs text-blue-700 mt-1">
                A imagem é fixa. Data, hora e código serão gerados quando cada certificado for autorizado.
              </p>
            </div>
            {signatureSaved && <span className="text-xs font-medium text-green-700">Salva</span>}
          </div>

          <div className="h-20 rounded-lg border border-blue-100 bg-white p-2">
            {activeSignatureSrc ? (
              <img
                src={activeSignatureSrc}
                alt="Assinatura digital configurada"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-blue-500">
                Nenhuma assinatura carregada
              </div>
            )}
          </div>

          <input
            ref={signatureInputRef}
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => signatureInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <Upload className="w-4 h-4" />
              Carregar
            </button>
            <button
              type="button"
              onClick={handleRemoveSignature}
              disabled={!currentConfig.assinaturaDigitalUrl}
              className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          </div>

          {currentConfig.assinaturaDigitalName && (
            <p className="text-xs text-blue-500 truncate">{currentConfig.assinaturaDigitalName}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Local da autorização</label>
            <input
              type="text"
              value={currentConfig.assinaturaDigitalLocal || ''}
              onChange={event => {
                updateConfig({ assinaturaDigitalLocal: event.target.value });
                flashSignatureSaved();
              }}
              className="input-field text-sm"
              placeholder="Ex: Imperatriz - MA"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Data e hora da prévia</label>
            <input
              type="datetime-local"
              value={currentConfig.assinaturaDigitalAutorizadaEm || ''}
              onChange={event => {
                updateConfig({ assinaturaDigitalAutorizadaEm: event.target.value });
                flashSignatureSaved();
              }}
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Código da prévia</label>
            <input
              type="text"
              value={currentConfig.assinaturaDigitalCodigo || ''}
              onChange={event => {
                updateConfig({ assinaturaDigitalCodigo: event.target.value });
                flashSignatureSaved();
              }}
              className="input-field text-sm font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleAuthorizeSignature}
            className="btn-primary w-full text-sm"
          >
            Preencher prévia agora
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campo</label>
          <select
            value={selected}
            onChange={event => handleSelectField(event.target.value)}
            className="input-field"
          >
            {Object.keys(certificateFieldLabels).map(id => (
              <option key={id} value={id}>{certificateFieldLabels[id]}</option>
            ))}
          </select>
        </div>

        {selectedTextConfig && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto padrão</label>
            {selectedTextConfig.multiline ? (
              <textarea
                value={currentConfig[selectedTextConfig.key] || ''}
                onChange={event => updateTextConfig(selectedTextConfig.key, event.target.value)}
                rows={4}
                className="input-field resize-none"
              />
            ) : (
              <input
                type="text"
                value={currentConfig[selectedTextConfig.key] || ''}
                onChange={event => updateTextConfig(selectedTextConfig.key, event.target.value)}
                className="input-field"
              />
            )}
          </div>
        )}

        {selectedPendingText && (
          <div className={`rounded-lg border p-3 space-y-3 ${
            selectedPendingText.confirmed
              ? 'border-green-200 bg-green-50'
              : 'border-amber-200 bg-amber-50'
          }`}>
            <div>
              <p className={`text-sm font-semibold ${selectedPendingText.confirmed ? 'text-green-800' : 'text-amber-900'}`}>
                {selectedPendingText.confirmed ? 'Alteração confirmada' : 'Confirme a alteração'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Leia o antes e depois para liberar o botão salvar.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Antes</p>
              <div className="max-h-24 overflow-y-auto rounded-md bg-white border border-gray-200 p-2 text-xs text-gray-600 whitespace-pre-wrap">
                {selectedPendingText.before || 'Sem texto'}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Depois</p>
              <div className="max-h-28 overflow-y-auto rounded-md bg-white border border-gray-200 p-2 text-xs text-gray-800 whitespace-pre-wrap">
                {selectedPendingText.after || 'Sem texto'}
              </div>
            </div>

            {!selectedPendingText.confirmed && (
              <>
                <label className="flex items-start gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedPendingText.read}
                    onChange={event => setPendingRead(selectedTextConfig.key, event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Li a alteração e confirmo que este texto deve virar padrão.</span>
                </label>
                <button
                  type="button"
                  onClick={() => confirmPendingText(selectedTextConfig.key)}
                  disabled={!selectedPendingText.read}
                  className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar mudança
                </button>
              </>
            )}
          </div>
        )}

        {hasUnconfirmedText && !selectedPendingText && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Há texto pendente de confirmação</p>
            <p className="text-xs text-gray-600 mt-1">
              Volte ao campo editado, leia a alteração e confirme para liberar o salvar.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Página</label>
          <select
            value={selectedField.page || 1}
            onChange={event => updateSelected({ page: Number(event.target.value) })}
            className="input-field"
          >
            {Array.from({ length: mergedLayout.pages || 1 }, (_, index) => index + 1).map(page => (
              <option key={page} value={page}>Página {page}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={selectedField.visible}
            onChange={event => {
              updateSelected({ visible: event.target.checked });
              setDeleteRequested(false);
            }}
          />
          {selectedField.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Visível
        </label>

        <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-800">Excluir selecionado</p>
            <p className="text-xs text-red-700 mt-1">
              Remove este item do certificado. Ele pode ser reativado marcando o campo como visível novamente.
            </p>
          </div>

          {!deleteRequested ? (
            <button
              type="button"
              onClick={() => setDeleteRequested(true)}
              disabled={!selectedField.visible}
              className="btn-danger w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Excluir campo
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-900">
                Tem certeza que deseja excluir "{certificateFieldLabels[selected] || 'campo'}" do certificado?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteRequested(false)}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSelected}
                  className="btn-danger text-sm"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentConfig.corPrimaria}
                onChange={event => updateConfig({ corPrimaria: event.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={currentConfig.corPrimaria}
                onChange={event => updateConfig({ corPrimaria: event.target.value })}
                className="input-field flex-1 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor destaque</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentConfig.corSecundaria}
                onChange={event => updateConfig({ corSecundaria: event.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={currentConfig.corSecundaria}
                onChange={event => updateConfig({ corSecundaria: event.target.value })}
                className="input-field flex-1 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor técnica</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentConfig.corAcento}
                onChange={event => updateConfig({ corAcento: event.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={currentConfig.corAcento}
                onChange={event => updateConfig({ corAcento: event.target.value })}
                className="input-field flex-1 font-mono"
              />
            </div>
          </div>
        </div>

        {rangeControl('Posição X', selectedField.x, 0, Math.max(0, 100 - selectedField.w), value => updateSelected({ x: value }))}
        {rangeControl('Posição Y', selectedField.y, 0, Math.max(0, 100 - selectedField.h), value => updateSelected({ y: value }))}
        {rangeControl('Largura', selectedField.w, 4, 96, value => updateSelected({ w: value }))}
        {rangeControl('Altura', selectedField.h, 2, 30, value => updateSelected({ h: value }))}
        {rangeControl('Tamanho da fonte', selectedField.fontSize, 9, 56, value => updateSelected({ fontSize: value }), 'px')}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso</label>
          <select
            value={selectedField.weight}
            onChange={event => updateSelected({ weight: event.target.value })}
            className="input-field"
          >
            <option value="400">Normal</option>
            <option value="500">Médio</option>
            <option value="700">Negrito</option>
            <option value="800">Extra</option>
            <option value="900">Máximo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cor do campo</label>
          <select
            value={selectedField.color}
            onChange={event => updateSelected({ color: event.target.value })}
            className="input-field"
          >
            <option value="primary">Primária</option>
            <option value="secondary">Destaque</option>
            <option value="accent">Técnica</option>
            <option value="text">Texto</option>
            <option value="muted">Cinza</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alinhamento</label>
          <div className="grid grid-cols-3 gap-2">
            {['left', 'center', 'right'].map(align => (
              <button
                key={align}
                type="button"
                onClick={() => updateSelected({ align })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  selectedField.align === align
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {align === 'left' ? 'Esq.' : align === 'center' ? 'Centro' : 'Dir.'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadDemo}
          className="btn-secondary w-full text-sm no-print"
        >
          <Download className="w-4 h-4" />
          Baixar prévia
        </button>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={resetSelected} className="btn-secondary text-sm">
            <RotateCcw className="w-4 h-4" />
            Campo
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={hasUnconfirmedText}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
