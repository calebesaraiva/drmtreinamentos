import React, { useMemo, useState } from 'react';
import { Building2, Award, Users, Search, Eye, Download, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { api } from '../services/api';

function formatDate(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR');
}

export default function EmpresasClientesPage() {
  const { students, courses, classes, refreshData, user } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certActionLoading, setCertActionLoading] = useState('');
  const [certStatus, setCertStatus] = useState(null);

  const companies = useMemo(() => {
    const map = new Map();
    const ensure = (name) => {
      const company = String(name || '').trim();
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

    courses.forEach(course => {
      const entry = ensure(course.empresaContratante);
      if (entry && course.nomeCurso) entry.cursos.add(course.nomeCurso);
    });
    classes.forEach(turma => {
      const entry = ensure(turma?.empresa?.nome);
      if (entry && turma?.cursoNome) entry.cursos.add(turma.cursoNome);
    });

    students.forEach(student => {
      const entry = ensure(student.empresa);
      if (!entry) return;
      entry.alunos.add(student.cpf || student.nome || String(student.id));
      if (student.nomeCurso) entry.cursos.add(student.nomeCurso);
      const cadastroPendente = student.statusCadastro === 'pendente';
      const certificadoPendente = student.statusCertificado === 'pendente';
      const recusado = student.statusCadastro === 'recusado' || student.statusCertificado === 'recusado';
      if (cadastroPendente || certificadoPendente) entry.pendentes += 1;
      if (recusado) entry.recusados += 1;
      entry.funcionarios.push({
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
      });
      if (student.statusCertificado === 'aprovado') {
        entry.certificados += 1;
        entry.funcionariosComCertificado.push({
          id: student.id,
          nome: student.nome,
          cpf: student.cpf,
          curso: student.nomeCurso,
          data: student.data,
          codigo: student.certificadoAssinaturaCodigo,
          certificadoAutorizadoEm: student.certificadoAutorizadoEm,
          certificadoEnviado: Boolean(student.certificadoEnviado),
        });
      }
    });

    return [...map.values()]
      .map(item => ({
        ...item,
        totalAlunos: item.alunos.size,
        totalCursos: item.cursos.size,
        funcionarios: item.funcionarios.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [students, courses, classes]);

  const filteredCompanies = companies.filter(company => (
    !search || company.nome.toLowerCase().includes(search.toLowerCase())
  ));

  const activeCompany = companies.find(company => company.nome === selectedCompany) || filteredCompanies[0] || null;

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

  const handleOpenCertificate = async () => {
    if (!selectedCertificate?.id) return;
    setCertActionLoading('open');
    setCertStatus(null);
    try {
      const result = await api.downloadCertificatePdf(selectedCertificate.id);
      openBlobInNewTab(result.blob);
      setCertStatus({ type: 'success', text: 'Certificado aberto em nova aba.' });
    } catch (error) {
      setCertStatus({ type: 'error', text: error?.message || 'Não foi possível abrir o certificado.' });
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
      setCertStatus({ type: 'error', text: error?.message || 'Não foi possível baixar o certificado.' });
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
      setCertStatus({ type: 'error', text: error?.message || 'Não foi possível enviar por e-mail.' });
    } finally {
      setCertActionLoading('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900">Empresas clientes</h2>
            <p className="text-sm text-gray-500 mt-1">Visualize todos os clientes, certificados emitidos e funcionários certificados.</p>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar empresa..."
              className="input-field pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card text-center">
          <Building2 className="w-7 h-7 text-blue-700 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
          <p className="text-xs text-gray-500">Empresas clientes</p>
        </div>
        <div className="card text-center">
          <Users className="w-7 h-7 text-green-700 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-500">Funcionários cadastrados</p>
        </div>
        <div className="card text-center">
          <Award className="w-7 h-7 text-amber-700 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{students.filter(student => student.statusCertificado === 'aprovado').length}</p>
          <p className="text-xs text-gray-500">Certificados aprovados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Clientes ({filteredCompanies.length})</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
            {filteredCompanies.map(company => (
              <button
                key={company.nome}
                type="button"
                onClick={() => setSelectedCompany(company.nome)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                  activeCompany?.nome === company.nome ? 'bg-blue-50' : ''
                }`}
              >
                <p className="font-semibold text-gray-900">{company.nome}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {company.totalAlunos} funcionário(s) · {company.certificados} certificado(s)
                </p>
              </button>
            ))}
            {filteredCompanies.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-8 text-center">Nenhuma empresa encontrada.</p>
            )}
          </div>
        </div>

        <div className="card">
          {!activeCompany ? (
            <p className="text-sm text-gray-500">Selecione uma empresa para ver os certificados.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-lg font-bold text-gray-900">{activeCompany.nome}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {activeCompany.totalAlunos} funcionário(s) cadastrados · {activeCompany.certificados} certificado(s) aprovados · {activeCompany.pendentes} pendência(s)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Cursos vinculados: {[...activeCompany.cursos].slice(0, 6).join(', ') || 'Sem cursos vinculados'}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Funcionário</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Curso</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Data</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Código</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Obs.</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Certificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeCompany.funcionarios.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-sm text-gray-400 text-center">Nenhum funcionário encontrado para esta empresa.</td>
                      </tr>
                    ) : activeCompany.funcionarios.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm text-gray-800">
                          <p className="font-medium">{item.nome}</p>
                          <p className="text-xs text-gray-500">{item.cpf || '-'}</p>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">{item.curso || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{formatDate(item.data)}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-600">{item.codigo || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.statusCadastro === 'aprovado' ? 'bg-green-100 text-green-700' : item.statusCadastro === 'recusado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              Cadastro: {item.statusCadastro || 'pendente'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.statusCertificado === 'aprovado' ? 'bg-green-100 text-green-700' : item.statusCertificado === 'recusado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              Cert: {item.statusCertificado || 'pendente'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.certificadoAutorizadoEm ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {item.certificadoAutorizadoEm ? 'Autorizado' : 'Sem autorização'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Emitido
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.certificadoEnviado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.certificadoEnviado ? 'Enviado' : 'Não enviado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{item.motivoRecusa || '-'}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertificate(item);
                              setCertStatus(null);
                            }}
                            disabled={item.statusCertificado !== 'aprovado'}
                            className="btn-secondary text-xs py-1.5 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Abrir opções
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <p className="text-xs font-mono text-gray-500 mt-2">{selectedCertificate.codigo || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" onClick={handleOpenCertificate} disabled={certActionLoading !== ''} className="btn-secondary text-sm disabled:opacity-60">
                {certActionLoading === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Abrir
              </button>
              <button type="button" onClick={handleDownloadCertificate} disabled={certActionLoading !== ''} className="btn-secondary text-sm disabled:opacity-60">
                {certActionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Baixar
              </button>
              <button type="button" onClick={handleSendCertificateEmail} disabled={certActionLoading !== ''} className="btn-primary text-sm disabled:opacity-60">
                {certActionLoading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar e-mail
              </button>
            </div>

            {certStatus && (
              <div className={`rounded-xl border p-3 text-sm ${
                certStatus.type === 'success'
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-red-50 border-red-100 text-red-700'
              }`}>
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
