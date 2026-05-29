import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, LockKeyhole, MapPin, ShieldCheck, UserPlus, Users } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { api } from '../services/api';

const emptyForm = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  empresa: '',
  cargo: '',
};

function formatDate(date) {
  return date ? new Date(`${date}T12:00`).toLocaleDateString('pt-BR') : '-';
}

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadCourses() {
      try {
        const data = await api.getPublicCourses();
        if (!ignore) setCourses(data);
      } catch {
        if (!ignore) setStatus({ type: 'error', text: 'Não foi possível carregar os cursos ativos.' });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadCourses();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!courses.length || selected) return;
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');
    const qrCode = params.get('qrCode');
    if (!courseId && !qrCode) return;
    const matched = courses.find((course) => (
      (courseId && String(course.id) === courseId) ||
      (qrCode && String(course.qrCode || '').toLowerCase() === qrCode.toLowerCase())
    ));
    if (matched) {
      setSelected(matched);
    }
  }, [courses, selected]);

  const chooseCourse = (course) => {
    setSelected(course);
    setVerified(null);
    setCode('');
    setForm(emptyForm);
    setStatus(null);
  };

  const verifyCode = async () => {
    if (!selected || !code.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const course = await api.verifyCourseCode(selected.id, code.trim());
      setVerified(course);
      setStatus({ type: 'success', text: 'Código confirmado. Preencha seu pré-cadastro.' });
    } catch (error) {
      setVerified(null);
      setStatus({ type: 'error', text: error.message || 'Código inválido.' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitEnrollment = async () => {
    if (!verified) return;
    setSubmitting(true);
    setStatus(null);
    try {
      await api.enrollStudent(verified.id, { ...form, codigo: code.trim() });
      setStatus({ type: 'success', text: 'Pré-cadastro enviado. Aguarde a chamada do responsável no dia do curso.' });
      setForm(emptyForm);
      setVerified(null);
      setCode('');
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Não foi possível enviar o pré-cadastro.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-24 h-12 rounded-xl border border-gray-100 shadow-sm" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Cursos ativos</h1>
              <p className="text-xs text-gray-500">Pré-cadastro DRM Treinamentos</p>
            </div>
          </div>
          <a href="/validar-certificado" className="btn-secondary text-sm">
            <ShieldCheck className="w-4 h-4" />
            Validar certificado
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <section className="space-y-4">
          {loading ? (
            <div className="card text-gray-500">Carregando cursos...</div>
          ) : courses.length === 0 ? (
            <div className="card text-center py-12">
              <p className="font-semibold text-gray-700">Nenhum curso ativo no momento</p>
              <p className="text-sm text-gray-500 mt-1">Quando houver turmas abertas, elas aparecerão aqui.</p>
            </div>
          ) : courses.map(course => (
            <button
              type="button"
              key={course.id}
              onClick={() => chooseCourse(course)}
              className={`card w-full text-left transition-all hover:shadow-md ${
                selected?.id === course.id ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">{course.nomeCurso}</h2>
                  <p className="text-sm text-gray-500 mt-1">{course.descricao}</p>
                </div>
                <span className="badge-green self-start">Ativo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <span className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-blue-500" />{course.local}</span>
                <span className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-blue-500" />{formatDate(course.data)} às {course.horarioInicio}</span>
                <span className="flex items-center gap-2 text-gray-600"><Users className="w-4 h-4 text-blue-500" />{course.vagasDisponiveis} vaga(s)</span>
              </div>
            </button>
          ))}
        </section>

        <aside className="card h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <LockKeyhole className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Pré-cadastro</h2>
          </div>

          {!selected ? (
            <p className="text-sm text-gray-500">Selecione um curso ativo para informar o código de verificação.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-sm font-semibold text-blue-950">{selected.nomeCurso}</p>
                <p className="text-xs text-blue-700 mt-1">{formatDate(selected.data)} - {selected.local}</p>
              </div>

              {!verified && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Código de verificação</label>
                  <input
                    className="input-field uppercase"
                    value={code}
                    onChange={event => setCode(event.target.value.toUpperCase())}
                    placeholder="Ex: DRM-12345"
                  />
                  <button onClick={verifyCode} disabled={submitting || !code.trim()} className="btn-primary w-full disabled:opacity-50">
                    Confirmar código
                  </button>
                </div>
              )}

              {verified && (
                <div className="space-y-3">
                  {[
                    ['nome', 'Nome completo'],
                    ['cpf', 'CPF'],
                    ['email', 'E-mail'],
                    ['telefone', 'Telefone'],
                    ['empresa', 'Empresa'],
                    ['cargo', 'Cargo/Função'],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        className="input-field"
                        value={form[field]}
                        onChange={event => updateField(field, event.target.value)}
                      />
                    </div>
                  ))}
                  <button onClick={submitEnrollment} disabled={submitting} className="btn-primary w-full">
                    <UserPlus className="w-4 h-4" />
                    Enviar pré-cadastro
                  </button>
                </div>
              )}

              {status && (
                <div className={`rounded-xl border p-3 text-sm ${
                  status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  <div className="flex gap-2">
                    {status.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5" />}
                    <p>{status.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
