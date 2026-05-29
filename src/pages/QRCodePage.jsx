import React, { useEffect, useState } from 'react';
import { QrCode, Plus, Download, Copy, Check, MapPin, Clock, Timer, Users, Calendar, Building2, Edit3, Award, UserCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import CertificateDesigner, { getStoredCertificateLayout, saveCertificateLayout } from '../components/CertificateDesigner';
import { defaultCertificateConfig, mergeCertificateConfig } from '../data/certificateDefaults';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

const initialForm = {
  nomeCurso: '',
  descricao: '',
  empresaContratante: '',
  local: '',
  data: '',
  horarioInicio: '',
  duracao: '',
  maxAlunos: '',
  codigoVerificacao: '',
  status: 'ativo',
  temInstrutor: true,
  instrutor: '',
  instrutorNome: '',
  instrutorCargo: '',
  instrutorRegistro: '',
};

function QRCard({ course, onOpen, onDownload, onCopy, copied }) {
  const instrutorNome = course.instrutorNome || course.instrutor;
  const instrutorCargo = course.instrutorCargo || course.cargoInstrutor || course.instrutorFuncao;
  const instrutorRegistro = course.instrutorRegistro || course.registroInstrutor || course.creaInstrutor || course.cftInstrutor;
  const temInstrutor = course.temInstrutor !== false && Boolean(instrutorNome || instrutorCargo || instrutorRegistro);
  const publicCourseUrl = `${window.location.origin}/cursos?courseId=${encodeURIComponent(course.id)}`;

  return (
    <div
      onClick={() => onOpen(course)}
      className="card hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* QR */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="bg-white p-3 rounded-xl border-2 border-gray-200 shadow-sm">
            <QRCodeCanvas
              data-id={course.id}
              value={publicCourseUrl}
              size={110}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="H"
            />
          </div>
          <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
            {course.qrCode}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-base mb-2">{course.nomeCurso}</h3>
          {course.descricao && (
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{course.descricao}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
            {course.empresaContratante && (
              <div className="flex items-start gap-1.5 text-gray-600">
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs leading-tight">{course.empresaContratante}</span>
              </div>
            )}
            <div className="flex items-start gap-1.5 text-gray-600">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs leading-tight">{course.local}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs">{course.data ? new Date(course.data + 'T12:00').toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Início: {course.horarioInicio}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Timer className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Duração: {course.duracao}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Máx. {course.maxAlunos} alunos</span>
            </div>
            {temInstrutor ? (
              <div className="flex items-start gap-1.5 text-gray-600 sm:col-span-2">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span className="text-xs leading-tight">
                  Instrutor: {instrutorNome}
                  {instrutorCargo && <span className="block text-gray-500">{instrutorCargo}</span>}
                  {instrutorRegistro && <span className="block text-gray-500">{instrutorRegistro}</span>}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-500 sm:col-span-2">
                <UserCheck className="w-4 h-4 text-gray-400" />
                <span className="text-xs">Sem instrutor no certificado</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={(event) => { event.stopPropagation(); onDownload(course); }}
              className="flex items-center gap-1.5 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar QR
            </button>
            <button
              onClick={(event) => { event.stopPropagation(); onCopy(course.qrCode); }}
              className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {copied === course.qrCode ? (
                <><Check className="w-3.5 h-3.5 text-green-600" />Copiado!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copiar código</>
              )}
            </button>
            <button
              onClick={(event) => { event.stopPropagation(); onCopy(publicCourseUrl); }}
              className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {copied === publicCourseUrl ? (
                <><Check className="w-3.5 h-3.5 text-green-600" />Link copiado</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Link aluno</>
              )}
            </button>
            <button
              onClick={(event) => { event.stopPropagation(); onOpen(course); }}
              className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
            <p className="text-xs font-semibold text-orange-900">Código de verificação</p>
            <p className="font-mono text-sm font-bold text-orange-700">{course.codigoVerificacao || 'Gerado ao salvar'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRCodePage() {
  const { courses, addCourse, updateCourse } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [modalTab, setModalTab] = useState('curso');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [certificateLayout, setCertificateLayout] = useState(() => getStoredCertificateLayout());
  const [certificateConfig, setCertificateConfig] = useState(() => {
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
          setCertificateConfig(nextConfig);
          localStorage.setItem('drmCertConfig', JSON.stringify(nextConfig));
        }
        if (settings?.layout) {
          setCertificateLayout(settings.layout);
          saveCertificateLayout(settings.layout);
        }
      } catch {
        // Usa a configuração local caso o servidor esteja indisponível.
      }
    }
    loadCertificateSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreate = () => {
    setEditingCourse(null);
    setForm({ ...initialForm });
    setErrors({});
    setModalTab('curso');
    setModalOpen(true);
  };

  const openEdit = (course) => {
    const hasInstrutorData = Boolean(
      course.instrutorNome ||
      course.instrutor ||
      course.instrutorCargo ||
      course.cargoInstrutor ||
      course.instrutorFuncao ||
      course.instrutorRegistro ||
      course.registroInstrutor ||
      course.creaInstrutor ||
      course.cftInstrutor
    );
    const temInstrutor = course.temInstrutor !== undefined
      ? course.temInstrutor !== false
      : hasInstrutorData;

    setEditingCourse(course);
    setForm({
      ...initialForm,
      ...course,
      temInstrutor,
      instrutorNome: course.instrutorNome || course.instrutor || '',
      instrutorCargo: course.instrutorCargo || course.cargoInstrutor || course.instrutorFuncao || '',
      instrutorRegistro: course.instrutorRegistro || course.registroInstrutor || course.creaInstrutor || course.cftInstrutor || '',
      maxAlunos: String(course.maxAlunos || ''),
    });
    setErrors({});
    setModalTab('curso');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCourse(null);
    setForm({ ...initialForm });
    setErrors({});
    setLayoutSaved(false);
  };

  const validate = () => {
    const e = {};
    if (!form.nomeCurso) e.nomeCurso = 'Obrigatório';
    if (!form.empresaContratante) e.empresaContratante = 'Obrigatório';
    if (!form.local) e.local = 'Obrigatório';
    if (!form.data) e.data = 'Obrigatório';
    if (!form.horarioInicio) e.horarioInicio = 'Obrigatório';
    if (!form.duracao) e.duracao = 'Obrigatório';
    if (form.temInstrutor) {
      if (!form.instrutorNome) e.instrutorNome = 'Obrigatório';
      if (!form.instrutorCargo) e.instrutorCargo = 'Obrigatório';
      if (!form.instrutorRegistro) e.instrutorRegistro = 'Obrigatório';
    }
    if (!form.maxAlunos || isNaN(form.maxAlunos) || Number(form.maxAlunos) <= 0) e.maxAlunos = 'Número válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveCourse = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const temInstrutor = Boolean(form.temInstrutor);
      const instrutorNome = temInstrutor ? form.instrutorNome.trim() : '';
      const payload = {
        ...form,
        codigoVerificacao: form.codigoVerificacao.trim().toUpperCase(),
        status: form.status || 'ativo',
        temInstrutor,
        instrutor: instrutorNome,
        instrutorNome,
        instrutorCargo: temInstrutor ? form.instrutorCargo.trim() : '',
        instrutorRegistro: temInstrutor ? form.instrutorRegistro.trim() : '',
        maxAlunos: Number(form.maxAlunos),
      };
      const savedCourse = editingCourse
        ? await updateCourse(editingCourse.id, payload)
        : await addCourse(payload);

      if (savedCourse) {
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCertificateLayout = async (nextConfig = certificateConfig, nextLayout = certificateLayout) => {
    localStorage.setItem('drmCertConfig', JSON.stringify(mergeCertificateConfig(nextConfig)));
    saveCertificateLayout(nextLayout);
    setCertificateConfig(mergeCertificateConfig(nextConfig));
    setCertificateLayout(nextLayout);
    await api.updateCertificateSettings({ config: mergeCertificateConfig(nextConfig), layout: nextLayout });
    setLayoutSaved(true);
    setTimeout(() => setLayoutSaved(false), 2500);
  };

  const handleDownload = (course) => {
    const canvas = document.querySelector(`canvas[data-id="${course.id}"]`) ||
      document.querySelectorAll('canvas')[0];
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${course.qrCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredCourses = courses.filter(c =>
    c.nomeCurso?.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    c.empresaContratante?.toLowerCase().includes(search.toLowerCase()) ||
    c.local?.toLowerCase().includes(search.toLowerCase()) ||
    c.instrutorNome?.toLowerCase().includes(search.toLowerCase()) ||
    c.instrutorCargo?.toLowerCase().includes(search.toLowerCase()) ||
    c.instrutorRegistro?.toLowerCase().includes(search.toLowerCase()) ||
    c.instrutor?.toLowerCase().includes(search.toLowerCase()) ||
    c.qrCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.data?.includes(search)
  );

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => { setForm(p => ({ ...p, [name]: e.target.value })); setErrors(p => ({ ...p, [name]: '' })); }}
        placeholder={placeholder}
        className={`input-field ${errors[name] ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-24 h-12 rounded-xl border border-gray-100 shadow-sm" />
          <div>
            <p className="text-gray-500 text-sm">{courses.length} curso(s) com QR Code</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      {/* Search */}
      {courses.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por curso, empresa, local, data ou código..."
            className="input-field pl-4"
          />
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <BrandLogo className="w-36 h-20 rounded-2xl mb-4 border border-gray-100 shadow-sm" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Nenhum curso criado</h3>
          <p className="text-gray-400 text-sm mb-6">Crie um curso para gerar o QR Code de cadastro dos alunos.</p>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Criar Primeiro Curso
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map(course => (
            <QRCard
              key={course.id}
              course={course}
              onOpen={openEdit}
              onDownload={handleDownload}
              onCopy={handleCopy}
              copied={copied}
            />
          ))}
          {filteredCourses.length === 0 && (
            <p className="text-center text-gray-400 py-8">Nenhum resultado para "{search}"</p>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCourse ? 'Editar Curso' : 'Novo Curso'}
        size={modalTab === 'certificado' ? 'xl' : 'lg'}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModalTab('curso')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modalTab === 'curso' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Curso
            </button>
            <button
              type="button"
              onClick={() => setModalTab('certificado')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modalTab === 'certificado' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Award className="w-4 h-4" />
              Certificado
            </button>
          </div>

          {modalTab === 'curso' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('nomeCurso', 'Nome do Curso *', 'text', 'Ex: NR35 Trabalho em Altura')}
                {field('empresaContratante', 'Empresa Contratante *', 'text', 'Ex: Construtora ABC Ltda')}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.temInstrutor)}
                    onChange={e => {
                      setForm(p => ({ ...p, temInstrutor: e.target.checked }));
                      if (!e.target.checked) {
                        setErrors(p => ({
                          ...p,
                          instrutorNome: '',
                          instrutorCargo: '',
                          instrutorRegistro: '',
                        }));
                      }
                    }}
                    className="h-4 w-4 rounded border-blue-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span className="flex items-center gap-2 text-sm font-semibold text-blue-950">
                    <UserCheck className="w-4 h-4 text-blue-700" />
                    Este curso terá instrutor no certificado
                  </span>
                </label>
                {form.temInstrutor ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {field('instrutorNome', 'Nome do instrutor *', 'text', 'Fulano Ciclano')}
                    {field('instrutorCargo', 'Função / formação *', 'text', 'Técnico/Engenheiro em xxxxxx')}
                    {field('instrutorRegistro', 'CREA ou CFT *', 'text', 'CREA/CFT xxxxx')}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700">O certificado deste curso será emitido sem assinatura de instrutor.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Curso</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Resumo curto do curso para aparecer no card"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              {field('local', 'Local do Curso *', 'text', 'Ex: Centro de Treinamento SP, Av. Paulista 1000')}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {field('data', 'Data *', 'date')}
                {field('horarioInicio', 'Horário de Início *', 'time')}
                {field('duracao', 'Duração *', 'text', 'Ex: 8 horas')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {field('maxAlunos', 'Quantidade Máxima de Alunos *', 'number', 'Ex: 30')}
                {field('codigoVerificacao', 'Código de verificação', 'text', 'Gerado automaticamente')}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}
                    className="input-field"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button onClick={handleSaveCourse} disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                  <QrCode className="w-4 h-4" />
                  {saving ? 'Salvando...' : editingCourse ? 'Salvar Curso' : 'Criar Curso'}
                </button>
              </div>
            </>
          ) : (
            <CertificateDesigner
              config={certificateConfig}
              layout={certificateLayout}
              onChange={setCertificateLayout}
              onSave={handleSaveCertificateLayout}
              onConfigChange={setCertificateConfig}
            />
          )}

          {modalTab === 'certificado' && layoutSaved && (
            <div className="flex items-center justify-end text-sm text-green-700">
              <Check className="w-4 h-4 mr-1" />
              Padrão de certificado salvo
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
