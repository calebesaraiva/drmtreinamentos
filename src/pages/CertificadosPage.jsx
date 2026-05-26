import React, { useState } from 'react';
import {
  Send, CheckCircle, Mail, Users,
  Eye, AlertTriangle
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { CertificatePreview, getStoredCertificateLayout } from '../components/CertificateDesigner';
import { defaultCertificateConfig, mergeCertificateConfig } from '../data/certificateDefaults';
import BrandLogo from '../components/BrandLogo';

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

function PreviewModal({ aluno, courses, config, isOpen, onClose }) {
  if (!aluno) return null;
  const layout = getStoredCertificateLayout();
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
  const { students, courses, markCertificadoSent, markAllCertificadosSent } = useApp();
  const [preview, setPreview] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [filter, setFilter] = useState('todos');

  // Load cert config from localStorage
  const config = (() => {
    try { return mergeCertificateConfig(JSON.parse(localStorage.getItem('drmCertConfig') || '{}')); }
    catch { return defaultCertificateConfig; }
  })();

  const aprovados = students.filter(s => s.statusCertificado === 'aprovado');
  const enviados = aprovados.filter(s => s.certificadoEnviado);
  const pendentes = aprovados.filter(s => !s.certificadoEnviado);

  const display = filter === 'todos' ? aprovados : filter === 'enviado' ? enviados : pendentes;

  const handleSendOne = (aluno) => {
    markCertificadoSent(aluno.id);
  };

  const handleSendAll = () => {
    markAllCertificadosSent();
    setConfirmAll(false);
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
      {pendentes.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5 text-blue-500" />
            <p className="text-sm font-medium">{pendentes.length} certificado(s) aprovado(s) aguardando envio</p>
          </div>
          <button
            onClick={() => setConfirmAll(true)}
            className="btn-primary text-sm whitespace-nowrap w-full sm:w-auto"
          >
            <Users className="w-4 h-4" />
            Enviar Todos
          </button>
        </div>
      )}

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
                  {!aluno.certificadoEnviado && (
                    <button
                      onClick={() => handleSendOne(aluno)}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm all modal */}
      <Modal
        isOpen={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Confirmar Envio em Massa"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-semibold text-gray-800">{pendentes.length} certificados serão enviados</p>
              <p className="text-xs text-gray-500">Os certificados aprovados serão enviados por e-mail para cada aluno.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Deseja confirmar o envio de todos os certificados aprovados e pendentes de envio?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmAll(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSendAll} className="btn-primary flex-1">
              <Send className="w-4 h-4" />
              Confirmar Envio
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <PreviewModal
        aluno={preview}
        courses={courses}
        config={config}
        isOpen={!!preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
