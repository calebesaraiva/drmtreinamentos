import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BuscaGlobalPage() {
  const { students, courses, classes } = useApp();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  const foundStudents = useMemo(() => {
    if (!term) return [];
    return students.filter(item => (
      String(item.nome || '').toLowerCase().includes(term)
      || String(item.cpf || '').toLowerCase().includes(term)
      || String(item.certificadoAssinaturaCodigo || '').toLowerCase().includes(term)
      || String(item.nomeCurso || '').toLowerCase().includes(term)
    )).slice(0, 40);
  }, [students, term]);

  const foundClasses = useMemo(() => {
    if (!term) return [];
    return classes.filter(item => (
      String(item.nome || '').toLowerCase().includes(term)
      || String(item.nomeCurso || '').toLowerCase().includes(term)
      || String(item.empresa?.nome || '').toLowerCase().includes(term)
    )).slice(0, 20);
  }, [classes, term]);

  const foundCourses = useMemo(() => {
    if (!term) return [];
    return courses.filter(item => (
      String(item.nomeCurso || '').toLowerCase().includes(term)
      || String(item.codigoCatalogo || '').toLowerCase().includes(term)
      || String(item.qrCode || '').toLowerCase().includes(term)
    )).slice(0, 20);
  }, [courses, term]);

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-xl font-black text-gray-900">Busca global</h2>
        <p className="text-sm text-gray-500 mt-1">Encontre aluno, turma, curso ou código de certificado em uma única busca.</p>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Digite nome, CPF, curso, empresa, QR ou código do certificado..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {term && (
        <>
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-2">Alunos ({foundStudents.length})</h3>
            <div className="space-y-2 text-sm">
              {foundStudents.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-100 p-2">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-xs text-gray-500">{item.cpf} • {item.nomeCurso} • {item.empresa}</p>
                  {item.certificadoAssinaturaCodigo && <p className="text-xs font-mono text-gray-600 mt-1">{item.certificadoAssinaturaCodigo}</p>}
                </div>
              ))}
              {foundStudents.length === 0 && <p className="text-gray-500">Nenhum aluno encontrado.</p>}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-2">Turmas ({foundClasses.length})</h3>
            <div className="space-y-2 text-sm">
              {foundClasses.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-100 p-2">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-xs text-gray-500">{item.nomeCurso} • {item.empresa?.nome || '-'} • {item.data || 'sem data'}</p>
                </div>
              ))}
              {foundClasses.length === 0 && <p className="text-gray-500">Nenhuma turma encontrada.</p>}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-2">Cursos ({foundCourses.length})</h3>
            <div className="space-y-2 text-sm">
              {foundCourses.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-100 p-2">
                  <p className="font-semibold">{item.nomeCurso}</p>
                  <p className="text-xs text-gray-500">{item.codigoCatalogo || '-'} • QR: {item.qrCode || '-'} • {item.status || '-'}</p>
                </div>
              ))}
              {foundCourses.length === 0 && <p className="text-gray-500">Nenhum curso encontrado.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

