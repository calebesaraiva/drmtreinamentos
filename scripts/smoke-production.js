const BASE_URL = (process.env.SMOKE_BASE_URL || 'https://drmtreinamentos.com').replace(/\/$/, '');
const USERNAME = process.env.SMOKE_USERNAME || '';
const PASSWORD = process.env.SMOKE_PASSWORD || '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, payload };
}

async function run() {
  const summary = [];

  const health = await fetchJson('/api/health');
  assert(health.response.ok, `Health falhou (${health.response.status}).`);
  assert(health.payload?.ok === true, 'Health sem ok=true.');
  summary.push('health:ok');

  const studentsNoAuth = await fetchJson('/api/students');
  assert(studentsNoAuth.response.status === 401, `Esperado 401 sem token em /api/students, recebido ${studentsNoAuth.response.status}.`);
  summary.push('auth-guard:ok');

  assert(USERNAME && PASSWORD, 'Defina SMOKE_USERNAME e SMOKE_PASSWORD para validar login autenticado.');
  const login = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  assert(login.response.ok, `Login falhou (${login.response.status}).`);
  assert(login.payload?.token, 'Login sem token.');
  summary.push('login:ok');

  const token = login.payload.token;
  const studentsAuth = await fetchJson('/api/students', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(studentsAuth.response.ok, `Acesso autenticado a /api/students falhou (${studentsAuth.response.status}).`);
  assert(Array.isArray(studentsAuth.payload), 'Resposta de /api/students autenticado não é lista.');
  summary.push('students-auth:ok');

  const coursesAuth = await fetchJson('/api/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(coursesAuth.response.ok, `Acesso autenticado a /api/courses falhou (${coursesAuth.response.status}).`);
  assert(Array.isArray(coursesAuth.payload), 'Resposta de /api/courses autenticado não é lista.');
  summary.push('courses-auth:ok');

  console.log(`SMOKE PASS: ${summary.join(', ')}`);
}

run().catch(error => {
  console.error(`SMOKE FAIL: ${error.message}`);
  process.exit(1);
});
