import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { MOCK_STUDENTS, MOCK_COURSES } from '../data/mockData';
import { api } from '../services/api';

const AppContext = createContext(null);

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

function isApiResponseError(error) {
  return Boolean(error?.status);
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('drmUser') || 'null');
    } catch {
      return null;
    }
  });
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const businessLastSnapshotRef = useRef({ approved: 0, pending: 0, certs: 0 });

  useEffect(() => {
    api.setToken(localStorage.getItem('drmAuthToken') || '');
    let ignore = false;

    async function loadInitialData() {
      setLoadingData(true);
      try {
        const [loadedStudents, loadedCourses, loadedClasses] = await Promise.all([
          api.getStudents(),
          api.getCourses(),
          api.getClasses(),
        ]);

        if (!ignore) {
          setStudents(loadedStudents);
          setCourses(loadedCourses);
          setClasses(loadedClasses);
          setApiError(null);
        }
      } catch (error) {
        if (!ignore) {
          if (error?.status === 401) {
            setUser(null);
            localStorage.removeItem('drmUser');
            api.setToken('');
          }
          setApiError('Não foi possível conectar ao servidor.');
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
      api.setToken(result.token);
      return { success: true, user: result.user };
    } catch (error) {
      const message = error?.message || 'Usuário ou senha inválidos.';
      setApiError(message);
      return { success: false, error: message };
    }
  }, []);

  const changeOwnPassword = useCallback(async (newPassword) => {
    try {
      const result = await api.changeOwnPassword(newPassword);
      setUser(result.user);
      localStorage.setItem('drmUser', JSON.stringify(result.user));
      setApiError(null);
      addNotification('Senha alterada com sucesso. Acesso liberado.', 'success');
      return { success: true, user: result.user };
    } catch (error) {
      const message = error?.message || 'Não foi possível alterar a senha.';
      setApiError(message);
      addNotification(message, 'error');
      return { success: false, error: message };
    }
  }, [addNotification]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('drmUser');
    api.setToken('');
  }, []);

  // Courses
  const addCourse = useCallback(async (course) => {
    try {
      const newCourse = await api.createCourse(course);
      setCourses(prev => [...prev, newCourse]);
      setApiError(null);
      return newCourse;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
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
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
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
      const [loadedStudents, loadedCourses, loadedClasses] = await Promise.all([
        api.getStudents(),
        api.getCourses(),
        api.getClasses(),
      ]);
      setStudents(loadedStudents);
      setCourses(loadedCourses);
      setClasses(loadedClasses);
      setApiError(null);
      return { students: loadedStudents, courses: loadedCourses, classes: loadedClasses };
    } catch (error) {
      if (error?.status === 401) {
        setUser(null);
        localStorage.removeItem('drmUser');
        api.setToken('');
      }
      setApiError('Não foi possível conectar ao servidor.');
      return null;
    }
  }, []);

  useEffect(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'empresario') return undefined;
    const timer = setInterval(() => {
      refreshData();
    }, 15000);
    return () => clearInterval(timer);
  }, [user, refreshData]);

  useEffect(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'empresario') return;
    const approved = students.filter(item => item.statusCadastro === 'aprovado').length;
    const pending = students.filter(item => item.statusCadastro === 'pendente' || item.statusCertificado === 'pendente').length;
    const certs = students.filter(item => item.statusCertificado === 'aprovado').length;
    const prev = businessLastSnapshotRef.current;
    if (prev.approved > 0 || prev.pending > 0 || prev.certs > 0) {
      if (approved > prev.approved) addNotification('DRM aprovou novo(s) aluno(s) da sua empresa.', 'success');
      if (certs > prev.certs) addNotification('Novo(s) certificado(s) foram liberados para sua empresa.', 'success');
      if (pending < prev.pending) addNotification('Pendências da sua empresa foram atualizadas.', 'info');
    }
    businessLastSnapshotRef.current = { approved, pending, certs };
  }, [students, user, addNotification]);

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
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
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
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
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
  const addManualClass = useCallback(async (payload) => {
    const actorName = user?.name || 'Responsável DRM';
    const actorRole = user?.role || 'responsavel';
    try {
      const result = await api.createManualClass({ ...payload, actor: actorName, actorRole });
      setClasses(prev => [...prev, result.class]);
      setStudents(prev => [...prev, ...result.students]);
      setApiError(null);
      addNotification('Turma criada e enviada para análise.', 'success');
      return result;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível criar a turma.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const addCompanyPreRegistration = useCallback(async (payload) => {
    const actorName = user?.name || 'Empresário';
    const actorRole = user?.role || 'empresario';
    try {
      const result = await api.createCompanyPreRegistration({ ...payload, actor: actorName, actorRole });
      setClasses(prev => [...prev, result.class]);
      setStudents(prev => [...prev, ...result.students]);
      setApiError(null);
      addNotification('Pré-cadastro enviado para validação do responsável DRM.', 'success');
      return result;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível enviar o pré-cadastro.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const updateClassStudentsStatus = useCallback(async (classId, payload) => {
    const actorName = user?.name || 'Responsável DRM';
    const actorRole = user?.role || 'responsavel';
    try {
      const result = await api.updateClassStudentsStatus(classId, { ...payload, actor: actorName, actorRole });
      setStudents(result.students);
      setClasses(prev => prev.map(item => String(item.id) === String(classId) ? result.class : item));
      setApiError(null);
      addNotification('Turma atualizada com sucesso.', 'success');
      return result;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível atualizar a turma.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const updateClassRequestStatus = useCallback(async (classId, payload) => {
    const actorName = user?.name || 'Responsável DRM';
    const actorRole = user?.role || 'responsavel';
    try {
      const result = await api.updateClassRequestStatus(classId, { ...payload, actor: actorName, actorRole });
      setClasses(prev => prev.map(item => (String(item.id) === String(classId) ? result.class : item)));
      setApiError(null);
      addNotification('Solicitação da turma atualizada com sucesso.', 'success');
      return result;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível atualizar a solicitação da turma.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const addManualStudent = useCallback(async (payload) => {
    const actorName = user?.name || 'Responsável DRM';
    try {
      const newStudent = await api.createManualStudent({ ...payload, actor: actorName });
      setStudents(prev => [...prev, newStudent]);
      setApiError(null);
      addNotification(
        newStudent.statusCertificado === 'aprovado'
          ? 'Aluno cadastrado manualmente com certificado assinado.'
          : 'Aluno cadastrado manualmente com sucesso.',
        'success',
      );
      if (newStudent.statusCertificado === 'aprovado' && !newStudent.certificadoEnviado && newStudent.certificadoEmailErro) {
        addNotification(newStudent.certificadoEmailErro, 'warning');
      }
      return newStudent;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível cadastrar aluno manualmente.', 'warning');
      return null;
    }
  }, [addNotification, user]);

  const updateStudentStatus = useCallback(async (studentId, field, value, motivo = null) => {
    const actorName = user?.name || 'Responsável DRM';
    const actorRole = user?.role || 'responsavel';

    try {
      const updatedStudent = await api.updateStudentStatus(studentId, field, value, motivo, actorName, actorRole);
      setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));
      setApiError(null);
      if (field === 'statusCertificado' && value === 'aprovado') {
        addNotification('Certificado autorizado e assinado digitalmente.', 'success');
      }
      return updatedStudent;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
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

  const updateStudentProfile = useCallback(async (studentId, payload) => {
    try {
      const updatedStudent = await api.updateStudentProfile(studentId, payload);
      setStudents(prev => prev.map(s => (String(s.id) === String(studentId) ? updatedStudent : s)));
      setApiError(null);
      addNotification('Dados do aluno atualizados com sucesso.', 'success');
      return updatedStudent;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível atualizar dados do aluno.', 'warning');
      return null;
    }
  }, [addNotification]);

  const markCertificadoSent = useCallback(async (studentId) => {
    try {
      const updatedStudent = await api.markCertificateSent(studentId);
      setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));
      setApiError(null);
      if (updatedStudent.certificadoEnviado) {
        addNotification('Certificado enviado com sucesso!', 'success');
      } else {
        addNotification(updatedStudent.certificadoEmailErro || 'Certificado não foi enviado.', 'warning');
      }
      return updatedStudent;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível confirmar o envio.', 'warning');
      return null;
    }
  }, [addNotification]);

  const markAllCertificadosSent = useCallback(async () => {
    try {
      const result = await api.markAllCertificatesSent();
      setStudents(result.students);
      setApiError(null);
      const failed = result.students.filter(student => (
        student.statusCertificado === 'aprovado' &&
        !student.certificadoEnviado &&
        student.certificadoEmailErro
      ));
      if (failed.length > 0) {
        addNotification(`${failed.length} certificado(s) não foram enviados. Verifique a configuração SMTP.`, 'warning');
      } else {
        addNotification('Todos os certificados aprovados foram enviados!', 'success');
      }
      return result;
    } catch (error) {
      if (isApiResponseError(error)) {
        setApiError(error.message);
        addNotification(error.message, 'error');
        return null;
      }
      addNotification('Backend indisponível. Não foi possível confirmar os envios.', 'warning');
      return null;
    }
  }, [addNotification]);

  const refreshSystemUsers = useCallback(async () => {
    try {
      const loaded = await api.getUsers();
      setSystemUsers(Array.isArray(loaded) ? loaded : []);
      return loaded;
    } catch (error) {
      if (isApiResponseError(error)) {
        addNotification(error.message, 'error');
      }
      return null;
    }
  }, [addNotification]);

  const addSystemUser = useCallback(async (payload) => {
    try {
      const created = await api.createUser(payload);
      const createdUser = created?.user || created;
      setSystemUsers(prev => [createdUser, ...prev]);
      addNotification('Usuário cadastrado com sucesso.', 'success');
      return { success: true, user: createdUser, temporaryPassword: created?.temporaryPassword || null };
    } catch (error) {
      const message = error?.message || 'Não foi possível cadastrar o usuário.';
      addNotification(message, 'error');
      return { success: false, error: message };
    }
  }, [addNotification]);

  const updateSystemUser = useCallback(async (id, payload) => {
    try {
      const updated = await api.updateUser(id, payload);
      setSystemUsers(prev => prev.map(item => (String(item.id) === String(id) ? updated : item)));
      addNotification('Cadastro atualizado com sucesso.', 'success');
      return updated;
    } catch (error) {
      addNotification(error?.message || 'Não foi possível atualizar o usuário.', 'error');
      return null;
    }
  }, [addNotification]);

  const toggleSystemUserStatus = useCallback(async (id) => {
    const target = systemUsers.find(item => String(item.id) === String(id));
    if (!target) return null;
    const nextStatus = target.status === 'ativo' ? 'inativo' : 'ativo';
    return updateSystemUser(id, { status: nextStatus });
  }, [systemUsers, updateSystemUser]);

  const removeSystemUser = useCallback(async (id) => {
    try {
      await api.deleteUser(id);
      setSystemUsers(prev => prev.filter(item => String(item.id) !== String(id)));
      addNotification('Usuário removido.', 'success');
      return true;
    } catch (error) {
      addNotification(error?.message || 'Não foi possível remover o usuário.', 'error');
      return false;
    }
  }, [addNotification]);

  const value = {
    user, login, logout, changeOwnPassword,
    students, setStudents, addManualStudent, updateStudentStatus, updateStudentProfile, markCertificadoSent, markAllCertificadosSent,
    classes, addManualClass, addCompanyPreRegistration, updateClassStudentsStatus, updateClassRequestStatus,
    courses, addCourse, updateCourse, updateAttendance, updateCourseSchedule, refreshData,
    loadingData, apiError,
    sidebarOpen, setSidebarOpen,
    systemUsers, refreshSystemUsers, addSystemUser, updateSystemUser, toggleSystemUserStatus, removeSystemUser,
    notifications, addNotification, markAllNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
};
