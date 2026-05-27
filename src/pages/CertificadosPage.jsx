import React, { useEffect, useState } from 'react';
import {
  Send, CheckCircle, Mail,
  Eye, Download, Archive, Calendar, CheckSquare, Square
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { CertificatePreview, getStoredCertificateLayout } from '../components/CertificateDesigner';
import { defaultCertificateConfig, mergeCertificateConfig } from '../data/certificateDefaults';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

function CertBadge({ enviado }) {
  return enviado
    ? <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />Enviado</span>
    : <span className="badge-blue">Pronto para envio</span>;
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

function PreviewModal({ aluno, courses, config, layout, isOpen, onClose }) {
  if (!aluno) return null;
  const course = courses.find(item => String(item.id) === String(aluno.cursoId));
  const temInstrutor = aluno.temInstrutor !== undefined
    ? aluno.temInstrutor !== false
    : course?.temInstrutor !== false;
  const certificateData = {
    ...aluno,
    nomeCurso: aluno.nomeCurso || course?.nomeCurso,
    local: aluno.local || course?.local,
    data: aluno.data || course?.data,
    horarioInicio: aluno.horarioInicio || course?.horarioInicio,
    duracao: aluno.duracao || course?.duracao,
    temInstrutor,
    instrutor: temInstrutor ? aluno.instrutorNome || aluno.instrutor || course?.instrutorNome || course?.instrutor : '',
    instrutorNome: temInstrutor ? aluno.instrutorNome || aluno.instrutor || course?.instrutorNome || course?.instrutor : '',
    instrutorCargo: temInstrutor ? aluno.instrutorCargo || aluno.cargoInstrutor || course?.instrutorCargo || course?.cargoInstrutor || course?.instrutorFuncao : '',
    instrutorRegistro: temInstrutor ? aluno.instrutorRegistro || aluno.registroInstrutor || aluno.creaInstrutor || aluno.cftInstrutor || course?.instrutorRegistro || course?.registroInstrutor || course?.creaInstrutor || course?.cftInstrutor : '',
    periodoInicio: aluno.periodoInicio || course?.data,
    periodoFim: aluno.periodoFim || course?.data,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pré-visualização do Certificado" size="xl">
      <div className="certificate-print-area">
        <CertificatePreview
          config={config}
          aluno={certificateData}
          layout={layout}
        />
      </div>
      <div className="flex justify-end gap-3 mt-4 no-print">
        <button onClick={() => window.print()} className="btn-primary">
          <Send className="w-4 h-4" />
          Gerar PDF
        </button>
      </div>
    </Modal>
  );
}

export default function CertificadosPage() {
  const { students, courses, refreshData } = useApp();
  const [preview, setPreview] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todas');
  const [selectedIds, setSelectedIds] = useState([]);
  const [action, setAction] = useState('both');
  const [signatureType, setSignatureType] = useState('digital');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [layout, setLayout] = useState(() => getStoredCertificateLayout());
  const [config, setConfig] = useState(() => {
    try { return mergeCertificateConfig(JSON.parse(localStorage.getItem('drmCertConfig') || '{}')); }
    catch { return defaultCertificateConfig; }
  });

  useEffect(() => {
    let ignore = false;
    async function loadCertificateSettings() {
      try {
        const settings = await api.getCertificateSettings();
        if (ignore) return;
        if (settings?.config) {
          const nextConfig = mergeCertificateConfig(settings.config);
          setConfig(nextConfig);
          localStorage.setItem('drmCertConfig', JSON.stringify(nextConfig));
        }
        if (settings?.layout) setLayout(settings.layout);
      } catch {
        // Usa a configuração local caso o servidor esteja indisponível.
      }
    }
    loadCertificateSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const aprovados = students.filter(s => s.statusCertificado === 'aprovado');
  const enviados = aprovados.filter(s => s.certificadoEnviado);
  const pendentes = aprovados.filter(s => !s.certificadoEnviado);
  const dateOptions = [...new Set(aprovados.map(s => s.periodoFim || s.data).filter(Boolean))]
    .sort((a, b) => String(b).localeCompare(String(a)));

  const display = (filter === 'todos' ? aprovados : filter === 'enviado' ? enviados : pendentes)
    .filter(student => dateFilter === 'todas' || (student.periodoFim || student.data) === dateFilter);
  const selectedStudents = aprovados.filter(student => selectedIds.includes(String(student.id)));

  const toggleStudent = (studentId) => {
    const id = String(studentId);
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
  };

  const selectVisible = () => {
    const visibleIds = display.map(student => String(student.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => (
      allSelected
        ? prev.filter(id => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    ));
  };

  const downloadBlob = ({ blob, filename }) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'certificados.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleBatchAction = async () => {
    if (selectedIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Selecione ao menos um aluno.' });
      return;
    }
    setProcessing(true);
    setStatusMessage(null);
    try {
      const result = await api.exportCertificates({
        studentIds: selectedIds,
        action,
        signatureType,
        date: dateFilter === 'todas' ? null : dateFilter,
      });
      if (action === 'email') {
        setStatusMessage({ type: 'success', text: 'Envio por e-mail processado.' });
      } else {
        downloadBlob(result);
        setStatusMessage({
          type: 'success',
          text: selectedIds.length > 1 ? 'Arquivo ZIP gerado com os certificados.' : 'PDF do certificado gerado.',
        });
      }
      await refreshData();
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.message || 'Não foi possível processar os certificados.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gray-950 p-4 text-white border border-gray-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-300">Central de emissão</p>
            <h2 className="text-xl font-bold mt-1">Certificados DRM</h2>
          </div>
          <BrandLogo className="w-40 h-20 rounded-2xl border border-white/10 shadow-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <BrandLogo className="w-14 h-10 rounded-lg mx-auto mb-2 border border-gray-100" />
          <p className="text-2xl font-bold text-gray-800">{aprovados.length}</p>
          <p className="text-xs text-gray-500">Certificados Aprovados</p>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700">{enviados.length}</p>
          <p className="text-xs text-gray-500">Enviados</p>
        </div>
        <div className="card text-center">
          <Mail className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700">{pendentes.length}</p>
          <p className="text-xs text-gray-500">Aguardando Envio</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por data do curso</label>
            <select value={dateFilter} onChange={event => setDateFilter(event.target.value)} className="input-field">
              <option value="todas">Todas as datas</option>
              {dateOptions.map(date => (
                <option key={date} value={date}>
                  {new Date(`${date}T12:00`).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={selectVisible}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <CheckSquare className="w-4 h-4" />
            Selecionar alunos exibidos
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'both', label: 'E-mail + PDF/ZIP', icon: Archive },
                { value: 'email', label: 'Somente e-mail', icon: Mail },
                { value: 'pdf', label: 'Somente PDF/ZIP', icon: Download },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAction(value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 ${
                    action === value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipo de assinatura na emissão</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { value: 'digital', label: 'Assinatura digital', description: 'Inclui código de validação e registro de autorização.' },
                  { value: 'manual', label: 'Assinatura manual', description: 'Usa assinatura gráfica/manual sem texto de validação digital.' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSignatureType(option.value)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      signatureType === option.value
                        ? 'bg-green-50 border-green-500 ring-2 ring-green-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-bold text-gray-900">{option.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatchAction}
            disabled={processing || selectedIds.length === 0}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processing ? 'Processando...' : `Processar ${selectedIds.length} selecionado(s)`}
          </button>
        </div>

        {statusMessage && (
          <div className={`rounded-xl border p-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: 'todos', label: 'Todos' },
          { val: 'pendente', label: 'Aguardando Envio' },
          { val: 'enviado', label: 'Enviados' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === val ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {display.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <BrandLogo className="w-32 h-16 rounded-xl mb-3 border border-gray-100" />
          <p className="text-gray-500 font-medium">Nenhum certificado aqui</p>
          <p className="text-gray-400 text-sm mt-1">
            Aprove certificados na aba <strong>Análise</strong> para que apareçam aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {display.map(aluno => (
            <div key={aluno.id} className="card hover:shadow-md transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStudent(aluno.id)}
                    className="text-blue-700"
                    aria-label="Selecionar aluno"
                  >
                    {selectedIds.includes(String(aluno.id)) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  <BrandLogo className="w-12 h-10 rounded-xl border border-gray-100 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800">{aluno.nome}</p>
                    <p className="text-xs text-gray-500">{aluno.nomeCurso}</p>
                    <p className="text-xs text-gray-400">{aluno.email}</p>
                    {aluno.dataEnvio && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Enviado em {new Date(aluno.dataEnvio + 'T12:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {aluno.certificadoAutorizadoEm && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Assinado em {formatDateTime(aluno.certificadoAutorizadoEm)}
                      </p>
                    )}
                    {(aluno.periodoFim || aluno.data) && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(`${aluno.periodoFim || aluno.data}T12:00`).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CertBadge enviado={aluno.certificadoEnviado} />
                  <button
                    onClick={() => setPreview(aluno)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <PreviewModal
        aluno={preview}
        courses={courses}
        config={config}
        layout={layout}
        isOpen={!!preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
