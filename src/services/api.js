const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(payload?.error || 'Erro ao comunicar com o servidor.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request('/api/health'),
  login: (username, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  getDashboard: () => request('/api/dashboard'),
  getStudents: () => request('/api/students'),
  getCourses: () => request('/api/courses'),
  getCertificateSettings: () => request('/api/settings/certificate'),
  updateCertificateSettings: (payload) => request('/api/settings/certificate', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  getPublicCourses: () => request('/api/public/courses'),
  verifyCourseCode: (courseId, codigo) => request(`/api/public/courses/${courseId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  }),
  enrollStudent: (courseId, payload) => request(`/api/public/courses/${courseId}/enroll`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createCourse: (course) => request('/api/courses', {
    method: 'POST',
    body: JSON.stringify(course),
  }),
  updateCourse: (courseId, course) => request(`/api/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(course),
  }),
  getCourseStudents: (courseId) => request(`/api/courses/${courseId}/students`),
  updateAttendance: (courseId, attendance, actor = 'Responsável DRM') => request(`/api/courses/${courseId}/attendance`, {
    method: 'PATCH',
    body: JSON.stringify({ attendance, actor }),
  }),
  updateCourseSchedule: (courseId, payload, actor = 'Instrutor DRM') => request(`/api/courses/${courseId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ ...payload, actor }),
  }),
  updateStudentStatus: (studentId, field, value, motivo = null, actor = 'Responsável DRM') => request(`/api/students/${studentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ field, value, motivo, actor }),
  }),
  markCertificateSent: (studentId) => request(`/api/students/${studentId}/certificate-sent`, {
    method: 'PATCH',
  }),
  markAllCertificatesSent: () => request('/api/students/certificates/send-all', {
    method: 'PATCH',
  }),
  validateCertificate: (code) => request(`/api/certificates/${encodeURIComponent(code)}`),
};
