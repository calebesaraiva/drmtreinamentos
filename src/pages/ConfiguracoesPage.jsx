import React, { useState, useEffect } from 'react';
import {
  Save, Eye, Award, Building2, User,
  FileText, Palette, CheckCircle, Download
} from 'lucide-react';
import Modal from '../components/Modal';
import BrandLogo from '../components/BrandLogo';
import CertificateDesigner, {
  CertificatePreview,
  getStoredCertificateLayout,
  saveCertificateLayout,
} from '../components/CertificateDesigner';
import { defaultCertificateConfig, mergeCertificateConfig, sampleCertificateStudent } from '../data/certificateDefaults';
import { api } from '../services/api';

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState(() => {
    try { return mergeCertificateConfig(JSON.parse(localStorage.getItem('drmCertConfig') || '{}')); }
    catch { return defaultCertificateConfig; }
  });
  const [certificateLayout, setCertificateLayout] = useState(() => getStoredCertificateLayout());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tab, setTab] = useState('empresa');

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
        if (settings?.layout) {
          setCertificateLayout(settings.layout);
          saveCertificateLayout(settings.layout);
        }
      } catch {
        // Mantém a configuração local se o servidor estiver indisponível.
      }
    }
    loadCertificateSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (key, val) => {
    setConfig(p => ({ ...p, [key]: val }));
    setSaved(false);
  };

  const handleSave = async (nextConfig = config, nextLayout = certificateLayout) => {
    const configToSave = mergeCertificateConfig(nextConfig);
    setSaving(true);
    localStorage.setItem('drmCertConfig', JSON.stringify(configToSave));
    saveCertificateLayout(nextLayout);
    setConfig(configToSave);
    setCertificateLayout(nextLayout);
    try {
      await api.updateCertificateSettings({ config: configToSave, layout: nextLayout });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={config[key]}
        onChange={e => handleChange(key, e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'responsavel', label: 'Responsável', icon: User },
    { id: 'certificado', label: 'Certificado', icon: Award },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'layout', label: 'Layout', icon: FileText },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card space-y-4">
        {tab === 'empresa' && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Dados da Empresa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('nomeEmpresa', 'Nome da Empresa')}
              {field('subtitulo', 'Subtítulo / Slogan')}
              {field('cnpj', 'CNPJ')}
              {field('telefone', 'Telefone')}
              {field('email', 'E-mail')}
              {field('site', 'Site')}
            </div>
            {field('endereco', 'Endereço Completo')}
          </>
        )}

        {tab === 'responsavel' && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Responsável Técnico
            </h3>
            <p className="text-sm text-gray-500">Estas informações aparecem na assinatura do certificado.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('nomeResponsavel', 'Nome do Responsável')}
              {field('cargoResponsavel', 'Cargo / Função')}
            </div>
          </>
        )}

        {tab === 'certificado' && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Configurações do Certificado
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('validadeAnos', 'Validade (anos)', 'number')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Rodapé</label>
              <textarea
                value={config.textoRodape}
                onChange={e => handleChange('textoRodape', e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Texto que aparece no rodapé do certificado..."
              />
            </div>
          </>
        )}

        {tab === 'aparencia' && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600" /> Aparência do Certificado
            </h3>
            <p className="text-sm text-gray-500">Personalize as cores e o visual do certificado gerado.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.corPrimaria}
                    onChange={e => handleChange('corPrimaria', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.corPrimaria}
                    onChange={e => handleChange('corPrimaria', e.target.value)}
                    className="input-field flex-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor de Destaque</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.corSecundaria}
                    onChange={e => handleChange('corSecundaria', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.corSecundaria}
                    onChange={e => handleChange('corSecundaria', e.target.value)}
                    className="input-field flex-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Técnica</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.corAcento}
                    onChange={e => handleChange('corAcento', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.corAcento}
                    onChange={e => handleChange('corAcento', e.target.value)}
                    className="input-field flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
            {/* Preview swatch */}
            <div
              className="rounded-xl p-4 text-white text-center font-bold text-sm mt-2 flex flex-col items-center gap-3"
              style={{ background: `linear-gradient(90deg, ${config.corPrimaria}, ${config.corSecundaria})` }}
            >
              <BrandLogo className="w-36 h-16 rounded-xl border border-white/10 shadow-lg" />
              <span>{config.nomeEmpresa}</span>
              <p className="text-xs text-white opacity-70 font-normal mt-1">Prévia de cor do certificado</p>
            </div>
          </>
        )}

        {tab === 'layout' && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Layout do Certificado
            </h3>
            <CertificateDesigner
              config={config}
              layout={certificateLayout}
              onChange={setCertificateLayout}
              onSave={handleSave}
              onConfigChange={setConfig}
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPreviewOpen(true)}
          className="btn-secondary"
        >
          <Eye className="w-4 h-4" />
          Pré-visualizar Certificado
        </button>
        <button onClick={() => handleSave()} disabled={saving} className="btn-primary disabled:opacity-60">
          {saved ? (
            <><CheckCircle className="w-4 h-4" />Salvo!</>
          ) : (
            <><Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar Configurações'}</>
          )}
        </button>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Pré-visualização do Certificado" size="xl">
        <div className="certificate-print-area">
          <CertificatePreview
            config={config}
            aluno={sampleCertificateStudent}
            layout={certificateLayout}
          />
        </div>
        <div className="flex justify-end mt-4 no-print">
          <button onClick={() => window.print()} className="btn-primary">
            <Download className="w-4 h-4" />
            Gerar PDF
          </button>
        </div>
      </Modal>
    </div>
  );
}
