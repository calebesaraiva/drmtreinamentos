import React, { useMemo, useState } from 'react';
import { Building2, Award, Users, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatDate(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00`).toLocaleDateString('pt-BR');
}

export default function EmpresasClientesPage() {
  const { students, courses, classes } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

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
          cursos: new Set(),
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
      if (student.statusCertificado === 'aprovado') {
        entry.certificados += 1;
        entry.funcionariosComCertificado.push({
          id: student.id,
          nome: student.nome,
          cpf: student.cpf,
          curso: student.nomeCurso,
          data: student.data,
          codigo: student.certificadoAssinaturaCodigo,
        });
      }
    });

    return [...map.values()]
      .map(item => ({
        ...item,
        totalAlunos: item.alunos.size,
        totalCursos: item.cursos.size,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [students, courses, classes]);

  const filteredCompanies = companies.filter(company => (
    !search || company.nome.toLowerCase().includes(search.toLowerCase())
  ));

  const activeCompany = companies.find(company => company.nome === selectedCompany) || filteredCompanies[0] || null;

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
                  {activeCompany.totalAlunos} funcionário(s) cadastrados · {activeCompany.certificados} certificado(s) aprovados
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeCompany.funcionariosComCertificado.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-sm text-gray-400 text-center">Nenhum certificado aprovado para esta empresa.</td>
                      </tr>
                    ) : activeCompany.funcionariosComCertificado.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm text-gray-800">
                          <p className="font-medium">{item.nome}</p>
                          <p className="text-xs text-gray-500">{item.cpf || '-'}</p>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">{item.curso || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{formatDate(item.data)}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-600">{item.codigo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

