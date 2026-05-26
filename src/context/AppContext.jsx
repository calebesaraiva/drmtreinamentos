import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MOCK_STUDENTS, MOCK_COURSES, MOCK_USERS } from '../data/mockData';
import { api } from '../services/api';

const AppContext = createContext(null);

function safeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function buildCertificateAuthorization(actorName = 'Responsável DRM') {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return {
    certificadoAutorizadoEm: now.toISOString(),
    certificadoAutorizadoPor: actorName,
    certificadoAssinaturaCodigo: `DRM-CERT-${stamp}-${String(now.getTime()).slice(-6)}`,
  };
}

function clearCertificateAuthorization(student) {
  const updated = { ...student };
  delete updated.certificadoAutorizadoEm;
  delete updated.certificadoAutorizadoPor;
  delete updated.certificadoAssinaturaCodigo;
  return updated;
}

function applyStudentStatus(student, field, value, motivo = null, actorName = 'Responsável DRM') {
  const updated = { ...student, [field]: value };

  if (field === 'statusCadastro' && value === 'recusado') {
    updated.statusCertificado = 'recusado';
  }

  if (field === 'statusCertificado' && value === 'aprovado') {
    Object.assign(updated, buildCertificateAuthorization(actorName));
  }

  if (
    (field === 'statusCertificado' && value !== 'aprovado') ||
    (field === 'statusCadastro' && value === 'recusado')
  ) {
    Object.assign(updated, clearCertificateAuthorization(updated));
    updated.certificadoEnviado = false;
    updated.dataEnvio = null;
  }

  if (motivo !== null) {
    updated.motivoRecusa = motivo;
  } else if (value === 'aprovado') {
    updated.motivoRecusa = null;
  }

  return updated;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('drmUser') || 'null');
    } catch {
      return null;
    }
  });
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [loadingData, setLoadingData] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, msg: '3 cadastros aguardando análise', type: 'warning', read: false },
    { id: 2, msg: '2 certificados prontos para envio', type: 'info', read: false },
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoadingData(true);
      try {
        const [loadedStudents, loadedCourses] = await Promise.all([
          api.getStudents(),
          api.getCourses(),
        ]);

        if (!ignore) {
          setStudents(loadedStudents);
          setCourses(loadedCourses);
          setApiError(null);
        }
      } catch {
        if (!ignore) {
          setApiError('Backend indisponível. Usando dados locais temporariamente.');
        }
      } finally {
        if (!ignore) setLoadingData(false);
      }
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Notifications
  const addNotification = useCallback((msg, type = 'info') => {
    setNotifications(prev => [
      { id: Date.now(), msg, type, read: false },
      ...prev,
    ]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Auth
  const login = useCallback(async (username, password) => {
    try {
      const result = await api.login(username, password);
      setUser(result.user);
      localStorage.setItem('drmUser', JSON.stringify(result.user));
      return { success: true };
    } catch (error) {
      const found = MOCK_USERS.find(u => u.username === username && u.password === password);
      if (found) {
        const localUser = safeUser(found);
        setUser(localUser);
        localStorage.setItem('drmUser', JSON.stringify(localUser));
        if (!error.status) {
          setApiError('Backend indisponível. Login local usado temporariamente.');
        }
        return { success: true };
      }
      return { success: false, error: 'Usuário ou senha inválidos.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('drmUser');
  }, []);

  // Courses
  const addCourse = useCallback(async (course) => {
    try {
      const newCourse = await api.createCourse(course);
      setCourses(prev => [...prev, newCourse]);
      setApiError(null);
      return newCourse;
    } catch {
      const newCourse = {
        ...course,
        id: Date.now(),
        qrCode: `DRM-QR-${String(Date.now()).slice(-6)}`,
        status: 'ativo',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCourses(prev => [...prev, newCourse]);
      addNotification('Backend indisponível. QR Code salvo apenas nesta sessão.', 'warning');
      return newCourse;
    }
  }, [addNotification]);

  const updateCourse = useCallback(async (courseId, course) => {
    try {
      const updatedCourse = await api.updateCourse(courseId, course);
      setCourses(prev => prev.map(item => (String(item.id) === String(courseId) ? updatedCourse : item)));
      setApiError(null);
      return updatedCourse;
    } catch {
      const updatedCourse = {
        ...course,
        id: courseId,
        maxAlunos: Number(course.maxAlunos),
        updatedAt: new Date().toISOString(),
      };
      setCourses(prev => prev.map(item => (
        String(item.id) === String(courseId)
          ? { ...item, ...updatedCourse, qrCode: item.qrCode }
          : item
      )));
      addNotification('Backend indisponível. Curso editado apenas nesta sessão.', 'warning');
      return updatedCourse;
    }
  }, [addNotification]);

  const refreshData = useCallback(async () => {
    try {
      const [loadedStudents, loadedCourses] = await Promise.all([
        api.getStudents(),
        api.getCourses(),
      ]);
      setStudents(loadedStudents);
      setCourses(loadedCourses);
      setApiError(null);
      return { students: loadedStudents, courses: loadedCourses };
    } catch {
      setApiError('Backend indisponível. Usando dados locais temporariamente.');
      return null;
    }
  }, []);

  const updateAttendance = useCallback(async (courseId, attendance) => {
    const actorName = user?.name || 'Responsável DRM';
    try {
      const result = await api.updateAttendance(courseId, attendance, actorName);
      setStudents(prev => prev.map(student => {
        const updated = result.students.find(item => String(item.id) === String(student.id));
        return updated || student;
      }));
      setCourses(prev => prev.map(course => (
        String(course.id) === String(courseId) ? result.course : course
      )));
      setApiError(null);
      addNotification('Chamada salva com sucesso.', 'success');
      return result;
    } catch {
      const now = new Date().toISOString();
      setStudents(prev => prev.map(student => {
        if (String(student.cursoId) !== String(courseId) || attendance[student.id] === undefined) return student;
        const presente = Boolean(attendance[student.id]);
        return {
          ...student,
          presente,
          presenca: presente ? 100 : 0,
          chamadaRealizadaEm: now,
          chamadaPor: actorName,
          statusCadastro: presente ? 'aprovado' : 'recusado',
          statusCertificado: presente ? student.statusCertificado : 'recusado',
          motivoRecusa: presente ? null : 'Ausente na chamada do curso.',
        };
      }));
      setCourses(prev => prev.map(course => (
        String(course.id) === String(courseId)
          ? { ...course, chamadaStatus: 'realizada', chamadaRealizadaEm: now, chamadaPor: actorName }
          : course
      )));
      addNotification('Backend indisponível. Chamada salva apenas nesta sessão.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const updateCourseSchedule = useCallback(async (courseId, payload) => {
    const actorName = user?.name || 'Instrutor DRM';
    try {
      const updatedCourse = await api.updateCourseSchedule(courseId, payload, actorName);
      setCourses(prev => prev.map(course => (
        String(course.id) === String(courseId) ? updatedCourse : course
      )));
      setApiError(null);
      addNotification('Cronograma atualizado com sucesso.', 'success');
      return updatedCourse;
    } catch {
      const now = new Date().toISOString();
      let fallbackCourse = null;
      setCourses(prev => prev.map(course => {
        if (String(course.id) !== String(courseId)) return course;

        let cronograma = Array.isArray(payload.cronograma)
          ? payload.cronograma
          : Array.isArray(course.cronograma)
            ? course.cronograma
            : [];

        if (payload.action === 'start-next' && !cronograma.some(item => item.status === 'em_andamento')) {
          const nextIndex = cronograma.findIndex(item => item.status !== 'concluida');
          cronograma = cronograma.map((item, index) => (
            index === nextIndex
              ? { ...item, status: 'em_andamento', iniciadoEm: now, instrutor: actorName }
              : item
          ));
        }

        if (payload.action === 'finish-current') {
          cronograma = cronograma.map(item => (
            item.status === 'em_andamento'
              ? { ...item, status: 'concluida', concluidoEm: now, instrutor: item.instrutor || actorName }
              : item
          ));
        }

        fallbackCourse = {
          ...course,
          cronograma,
          cronogramaStatus: cronograma.every(item => item.status === 'concluida') ? 'concluido' : 'em_andamento',
          cronogramaAtualizadoEm: now,
          cronogramaAtualizadoPor: actorName,
        };
        return fallbackCourse;
      }));
      addNotification('Backend indisponível. Cronograma atualizado apenas nesta sessão.', 'warning');
      return fallbackCourse;
    }
  }, [addNotification, user]);

  // Students
  const updateStudentStatus = useCallback(async (studentId, field, value, motivo = null) => {
    const actorName = user?.name || 'Responsável DRM';

    try {
      const updatedStudent = await api.updateStudentStatus(studentId, field, value, motivo, actorName);
      setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));
      setApiError(null);
      if (field === 'statusCertificado' && value === 'aprovado') {
        addNotification('Certificado autorizado e assinado digitalmente.', 'success');
      }
      return updatedStudent;
    } catch {
      let fallbackStudent = null;
      setStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        fallbackStudent = applyStudentStatus(s, field, value, motivo, actorName);
        return fallbackStudent;
      }));
      addNotification('Backend indisponível. Alteração aplicada apenas nesta sessão.', 'warning');
      if (field === 'statusCertificado' && value === 'aprovado') {
        addNotification('Certificado autorizado e assinado digitalmente.', 'success');
      }
      return fallbackStudent;
    }
  }, [addNotification, user]);

  const markCertificadoSent = useCallback(async (studentId) => {
    try {
      const updatedStudent = await api.markCertificateSent(studentId);
      setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));
      setApiError(null);
    } catch {
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, certificadoEnviado: true, dataEnvio: new Date().toISOString().split('T')[0] }
          : s
      ));
      addNotification('Backend indisponível. Envio marcado apenas nesta sessão.', 'warning');
    }
    addNotification(`Certificado enviado com sucesso!`, 'success');
  }, [addNotification]);

  const markAllCertificadosSent = useCallback(async () => {
    try {
      const result = await api.markAllCertificatesSent();
      setStudents(result.students);
      setApiError(null);
    } catch {
      setStudents(prev => prev.map(s =>
        s.statusCertificado === 'aprovado' && !s.certificadoEnviado
          ? { ...s, certificadoEnviado: true, dataEnvio: new Date().toISOString().split('T')[0] }
          : s
      ));
      addNotification('Backend indisponível. Envios marcados apenas nesta sessão.', 'warning');
    }
    addNotification('Todos os certificados aprovados foram enviados!', 'success');
  }, [addNotification]);

  const value = {
    user, login, logout,
    students, setStudents, updateStudentStatus, markCertificadoSent, markAllCertificadosSent,
    courses, addCourse, updateCourse, updateAttendance, updateCourseSchedule, refreshData,
    loadingData, apiError,
    sidebarOpen, setSidebarOpen,
    notifications, addNotification, markAllNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
};
