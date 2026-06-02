import React, { useMemo, useState } from 'react';
import {
  Archive,
  Award,
  Building2,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  Mail,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { api } from '../services/api';

function formatDate(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR');
}

function normalizeCompanyName(name) {
  const company = String(name || '').trim();
  if (!company) return '';
  if (company.toLowerCase() === 'grupo mateus') return 'GRUPO MATEUS';
  return company;
}

function safeFileName(value) {
  return String(value || 'certificados')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export default function EmpresasClientesPage() {
  const { students, courses, classes, refreshData, user } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certActionLoading, setCertActionLoading] = useState('');
  const [certStatus, setCertStatus] = useState(null);
  const [courseFilter, setCourseFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [bulkLoading, setBulkLoading] = useState(false);

  const companies = useMemo(() => {
    const map = new Map();
    const ensure = (name) => {
      const company = normalizeCompanyName(name);
      if (!company) return null;
      const key = company.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          nome: company,
          alunos: new Set(),
          certificados: 0,
          pendentes: 0,
          recusados: 0,
          cursos: new Set(),
          funcionarios: [],
          funcionariosComCertificado: [],
        });
      }
      return map.get(key);
    };

    courses.forEach((course) => {
      const entry = ensure(course.empresaContratante);
      if (entry && course.nomeCurso) entry.cursos.add(course.nomeCurso);
    });
    classes.forEach((turma) => {
      const entry = ensure(turma?.empresa?.nome);
      if (entry && turma?.cursoNome) entry.cursos.add(turma.cursoNome);
    });

    students.forEach((student) => {
      const entry = ensure(student.empresa);
      if (!entry) return;
      entry.alunos.add(student.cpf || student.nome || String(student.id));
      if (student.nomeCurso) entry.cursos.add(student.nomeCurso);
      const certificadoPendente = student.statusCertificado === 'pendente';
      const recusado =
        student.statusCadastro === 'recusado' || student.statusCertificado === 'recusado';
      if (certificadoPendente) entry.pendentes += 1;
      if (recusado) entry.recusados += 1;
      const item = {
        id: student.id,
        nome: student.nome,
        cpf: student.cpf,
        curso: student.nomeCurso,
        data: student.data,
        codigo: student.certificadoAssinaturaCodigo,
        statusCadastro: student.statusCadastro,
        statusCertificado: student.statusCertificado,
        motivoRecusa: student.motivoRecusa || '',
        certificadoAutorizadoEm: student.certificadoAutorizadoEm,
        certificadoEnviado: Boolean(student.certificadoEnviado),
      };
      entry.funcionarios.push(item);
      if (student.statusCertificado === 'aprovado') {
        entry.certificados += 1;
        entry.funcionariosComCertificado.push(item);
      }
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        totalAlunos: item.alunos.size,
        totalCursos: item.cursos.size,
        funcionarios: item.funcionarios.sort((a, b) =>
          String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'),
        ),
      }))
      .filter((item) => item.totalAlunos > 0 || item.certificados > 0)
      .sort((a, b) => b.certificados - a.certificados || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [students, courses, classes]);

  const filteredCompanies = companies.filter(
    (company) => !search || company.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCompany =
    companies.find((company) => company.nome === selectedCompany) || filteredCompanies[0] || null;

  const activeCourses = useMemo(
    () => (activeCompany ? [...activeCompany.cursos].sort((a, b) => a.localeCompare(b, 'pt-BR')) : []),
    [activeCompany],
  );

  const filteredEmployees = useMemo(() => {
    if (!activeCompany) return [];
    return activeCompany.funcionarios.filter((item) => {
      const matchesCourse = courseFilter === 'todos' || item.curso === courseFilter;
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'aprovado' && item.statusCertificado === 'aprovado') ||
        (statusFilter === 'pendente' && item.statusCertificado === 'pendente') ||
        (statusFilter === 'recusado' &&
          (item.statusCadastro === 'recusado' || item.statusCertificado === 'recusado')) ||
        (statusFilter === 'enviado' && item.certificadoEnviado) ||
        (statusFilter === 'nao_enviado' && !item.certificadoEnviado);
      return matchesCourse && matchesStatus;
    });
  }, [activeCompany, courseFilter, statusFilter]);

  const totals = useMemo(
    () => ({
      empresas: companies.length,
      funcionarios: companies.reduce((sum, company) => sum + company.totalAlunos, 0),
      certificados: companies.reduce((sum, company) => sum + company.certificados, 0),
    }),
    [companies],
  );

  const openBlobInNewTab = (blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const downloadBlob = (blob, filename = 'certificado.pdf') => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCompanyCertificates = async () => {
    if (!activeCompany?.funcionariosComCertificado?.length) return;
    setBulkLoading(true);
    try {
      const result = await api.exportCertificates({
        studentIds: activeCompany.funcionariosComCertificado.map((item) => String(item.id)),
        action: 'pdf',
        signatureType: 'manual',
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      downloadBlob(
        result.blob,
        result.filename || `${safeFileName(activeCompany.nome)}-certificados.zip`,
      );
      await refreshData();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleOpenCertificate = async () => {
    if (!selectedCertificate?.id) return;
    setCertActionLoading('open');
    setCertStatus(null);
    try {
      const result = await api.downloadCertificatePdf(selectedCertificate.id);
      openBlobInNewTab(result.blob);
      setCertStatus({ type: 'success', text: 'Certificado aberto em nova aba.' });
    } catch (error) {
      setCertStatus({
        type: 'error',
        text: error?.message || 'Não foi possível abrir o certificado.',
      });
    } finally {
      setCertActionLoading('');
    }
  };

  const handleDownloadCertificate = async () => {
    if (!selectedCertificate?.id) return;
    setCertActionLoading('download');
    setCertStatus(null);
    try {
      const result = await api.downloadCertificatePdf(selectedCertificate.id);
      downloadBlob(result.blob, result.filename || `certificado-${selectedCertificate.nome}.pdf`);
      setCertStatus({ type: 'success', text: 'Certificado baixado com sucesso.' });
    } catch (error) {
      setCertStatus({
        type: 'error',
        text: error?.message || 'Não foi possível baixar o certificado.',
      });
    } finally {
      setCertActionLoading('');
    }
  };

  const handleSendCertificateEmail = async () => {
    if (!selectedCertificate?.id) return;
    setCertActionLoading('email');
    setCertStatus(null);
    try {
      await api.exportCertificates({
        studentIds: [String(selectedCertificate.id)],
        action: 'email',
        signatureType: 'digital',
        actor: user?.name || 'Responsável DRM',
        actorRole: user?.role || 'responsavel',
      });
      setCertStatus({ type: 'success', text: 'Certificado enviado por e-mail.' });
      await refreshData();
    } catch (error) {
      setCertStatus({
        type: 'error',
        text: error?.message || 'Não foi possível enviar por e-mail.',
      });
    } finally {
      setCertActionLoading('');
    }
  };

  const statusBadge = (item) => {
    if (item.statusCadastro === 'recusado' || item.statusCertificado === 'recusado') {
      return 'bg-red-50 text-red-700 border-red-100';
    }
    if (item.statusCertificado === 'aprovado') {
      return 'bg-green-50 text-green-700 border-green-100';
    }
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              Painel do cliente
            </p>
            <h2 className="text-2xl font-black text-gray-900 mt-1">Empresas clientes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Consulte empresas, alunos e certificados emitidos em um só lugar.
            </p>
          </div>
          <div className="relative w-full xl:w-[420px]">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar empresa..."
              className="input-field pl-12 h-14 text-base"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Building2, label: 'Empresas com histórico', value: totals.empresas, tone: 'orange' },
          { icon: Users, label: 'Funcionários vinculados', value: totals.funcionarios, tone: 'green' },
          { icon: Award, label: 'Certificados aprovados', value: totals.certificados, tone: 'blue' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    card.tone === 'orange'
                      ? 'bg-orange-50 text-orange-600'
                      : card.tone === 'green'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">Clientes ({filteredCompanies.length})</p>
            <p className="text-xs text-gray-500 mt-1">Clique em uma empresa para abrir o histórico.</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-3 space-y-2">
            {filteredCompanies.map((company) => (
              <button
                key={company.nome}
                type="button"
                onClick={() => {
                  setSelectedCompany(company.nome);
                  setCourseFilter('todos');
                  setStatusFilter('todos');
                }}
                className={`w-full text-left rounded-2xl border p-4 transition ${
                  activeCompany?.nome === company.nome
                    ? 'border-orange-200 bg-orange-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-orange-100 hover:bg-orange-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-gray-900">{company.nome}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {company.totalAlunos} funcionário(s) · {company.certificados} certificado(s)
                    </p>
                  </div>
                  {company.pendentes + company.recusados > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
                      {company.pendentes + company.recusados} atenção
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700">
                      ok
                    </span>
                  )}
                </div>
              </button>
            ))}
            {filteredCompanies.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-8 text-center">
                Nenhuma empresa encontrada.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          {!activeCompany ? (
            <p className="text-sm text-gray-500">Selecione uma empresa para ver os certificados.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-white p-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                      Empresa selecionada
                    </p>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">{activeCompany.nome}</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="rounded-full bg-white border border-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                        {activeCompany.totalAlunos} funcionário(s)
                      </span>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {activeCompany.certificados} certificado(s) aprovado(s)
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        {activeCompany.pendentes + activeCompany.recusados} pendência(s)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Cursos: {[...activeCompany.cursos].join(', ') || 'Sem cursos vinculados'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCompanyCertificates}
                    disabled={bulkLoading || activeCompany.funcionariosComCertificado.length === 0}
                    className="btn-primary whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    Baixar todos em ZIP
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                    className="input-field bg-white"
                  >
                    <option value="todos">Todos os cursos</option>
                    {activeCourses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="input-field bg-white"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="aprovado">Aprovados</option>
                    <option value="pendente">Pendentes</option>
                    <option value="recusado">Recusados</option>
                    <option value="enviado">Enviados</option>
                    <option value="nao_enviado">Não enviados</option>
                  </select>
                  <div className="flex items-center justify-center rounded-xl bg-white border border-gray-100 px-4 text-sm font-bold text-gray-600">
                    {filteredEmployees.length} registro(s)
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredEmployees.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum aluno encontrado com esses filtros.</p>
                  </div>
                ) : (
                  filteredEmployees.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1.2fr)_minmax(220px,1.5fr)_minmax(180px,1fr)_auto] gap-4 lg:items-center">
                        <div>
                          <p className="font-black text-gray-900">{item.nome}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.cpf || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{item.curso || '-'}</p>
                          <p className="text-xs text-gray-500 mt-1">Realizado em {formatDate(item.data)}</p>
                        </div>
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(item)}`}
                          >
                            Certificado: {item.statusCertificado || 'pendente'}
                          </span>
                          <p className="text-xs font-mono text-gray-500">{item.codigo || 'Sem código'}</p>
                          <p
                            className={`text-xs font-bold ${
                              item.certificadoEnviado ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {item.certificadoEnviado ? 'Enviado por e-mail' : 'Ainda não enviado'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertificate(item);
                            setCertStatus(null);
                          }}
                          disabled={item.statusCertificado !== 'aprovado'}
                          className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-4 h-4" />
                          Ver / imprimir
                        </button>
                      </div>
                      {item.motivoRecusa && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                          Observação: {item.motivoRecusa}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedCertificate)}
        onClose={() => {
          if (certActionLoading) return;
          setSelectedCertificate(null);
          setCertStatus(null);
        }}
        title="Certificado do funcionário"
        size="md"
      >
        {selectedCertificate && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-bold text-gray-900">{selectedCertificate.nome}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedCertificate.curso}</p>
              <p className="text-xs font-mono text-gray-500 mt-2">
                {selectedCertificate.codigo || '-'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleOpenCertificate}
                disabled={certActionLoading !== ''}
                className="btn-secondary text-sm disabled:opacity-60"
              >
                {certActionLoading === 'open' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Abrir
              </button>
              <button
                type="button"
                onClick={handleDownloadCertificate}
                disabled={certActionLoading !== ''}
                className="btn-secondary text-sm disabled:opacity-60"
              >
                {certActionLoading === 'download' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Baixar
              </button>
              <button
                type="button"
                onClick={handleSendCertificateEmail}
                disabled={certActionLoading !== ''}
                className="btn-primary text-sm disabled:opacity-60"
              >
                {certActionLoading === 'email' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Enviar e-mail
              </button>
            </div>

            {certStatus && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  certStatus.type === 'success'
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {certStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  <p>{certStatus.text}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
