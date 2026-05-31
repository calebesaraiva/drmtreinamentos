import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import {
  MOCK_STUDENTS,
  MOCK_COURSES,
  CHART_DATA_MONTHLY,
} from '../src/data/mockData.js';
import { NR_CATALOG } from '../src/data/nrCatalog.js';
import {
  defaultCertificateConfig,
  defaultCertificateLayout,
  mergeCertificateConfig,
  sampleCertificateStudent,
} from '../src/data/certificateDefaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) return;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

loadEnvFile(join(__dirname, '..', '.env'));

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const LOCAL_DEV_PASSWORD = ['127.0.0.1', 'localhost'].includes(HOST) ? 'admin123' : '';

const DATA_FILE = process.env.DATA_FILE || join(__dirname, 'data.json');
const LOGO_FILE = join(__dirname, '..', 'public', 'brand', 'drm-certi-sem-fundo.png');
const CERTIFICATE_PAGE_WIDTH = 1123;
const CERTIFICATE_PAGE_HEIGHT = 794;
const CERTIFICATE_STANDARD_VERSION = 1;
const DATABASE_URL = process.env.DATABASE_URL || '';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://drmtreinamentos.com';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `DRM Treinamentos <${SMTP_USER}>` : '');
const AUTH_SECRET = process.env.AUTH_SECRET || 'change-this-secret-in-production';
const AUTH_TTL_HOURS = Number(process.env.AUTH_TTL_HOURS || 12);
const CORS_ALLOWED_ORIGINS = String(
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.PUBLIC_APP_URL ||
  'http://localhost:5173',
)
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);
const CORS_PRIMARY_ORIGIN = CORS_ALLOWED_ORIGINS[0] || 'http://localhost:5173';
const ENV_APP_USERS = [
  {
    id: 1,
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || LOCAL_DEV_PASSWORD,
    name: process.env.ADMIN_NAME || 'Administrador DRM',
    role: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@drmtreinamentos.com',
  },
  {
    id: 2,
    username: process.env.RESPONSAVEL_USERNAME || 'responsavel',
    password: process.env.RESPONSAVEL_PASSWORD || LOCAL_DEV_PASSWORD,
    name: process.env.RESPONSAVEL_NAME || 'Responsável DRM',
    role: 'responsavel',
    email: process.env.RESPONSAVEL_EMAIL || 'deivson@drmtreinamentos.com',
    status: 'ativo',
    tipo: 'usuario',
  },
].filter(user => user.username && user.password);

const dbPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : null;

const mailTransport = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

function fallbackData() {
  const defaultUsers = structuredClone(ENV_APP_USERS);
  if (dbPool) {
    return {
      students: [],
      courses: [],
      classes: [],
      certificateSettings: {},
      companyChangeRequests: [],
      users: defaultUsers,
    };
  }

  if (!existsSync(DATA_FILE)) {
    return {
      students: structuredClone(MOCK_STUDENTS),
      courses: structuredClone(MOCK_COURSES),
      classes: [],
      certificateSettings: {},
      companyChangeRequests: [],
      users: defaultUsers,
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    return {
      students: Array.isArray(parsed.students) ? parsed.students : structuredClone(MOCK_STUDENTS),
      courses: Array.isArray(parsed.courses) ? parsed.courses : structuredClone(MOCK_COURSES),
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      certificateSettings: parsed.certificateSettings && typeof parsed.certificateSettings === 'object' ? parsed.certificateSettings : {},
      companyChangeRequests: Array.isArray(parsed.companyChangeRequests) ? parsed.companyChangeRequests : [],
      users: Array.isArray(parsed.users) ? parsed.users : defaultUsers,
    };
  } catch {
    return {
      students: structuredClone(MOCK_STUDENTS),
      courses: structuredClone(MOCK_COURSES),
      classes: [],
      certificateSettings: {},
      companyChangeRequests: [],
      users: defaultUsers,
    };
  }
}

async function ensureDatabase() {
  if (!dbPool) return;
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function loadData() {
  const localData = fallbackData();
  if (!dbPool) return localData;

  await ensureDatabase();
  const existing = await dbPool.query('SELECT data FROM app_state WHERE id = 1');
  if (existing.rows[0]?.data) {
    const storedUsers = Array.isArray(existing.rows[0].data.users) ? existing.rows[0].data.users : localData.users;
    return {
      students: Array.isArray(existing.rows[0].data.students) ? existing.rows[0].data.students : localData.students,
      courses: Array.isArray(existing.rows[0].data.courses) ? existing.rows[0].data.courses : localData.courses,
      classes: Array.isArray(existing.rows[0].data.classes) ? existing.rows[0].data.classes : localData.classes,
      certificateSettings: existing.rows[0].data.certificateSettings && typeof existing.rows[0].data.certificateSettings === 'object'
        ? existing.rows[0].data.certificateSettings
        : {},
      companyChangeRequests: Array.isArray(existing.rows[0].data.companyChangeRequests) ? existing.rows[0].data.companyChangeRequests : [],
      users: mergeEnvUsers(storedUsers),
    };
  }

  await dbPool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(localData)],
  );
  return localData;
}

function normalizeCertificateSettings(payload = {}) {
  const normalized = {
    config: mergeCertificateConfig(payload.config || {}),
    layout: mergeCertificateLayoutPdf(payload.layout || {}),
    updatedAt: payload.updatedAt || new Date().toISOString(),
    standardVersion: Number(payload.standardVersion) || 0,
  };

  if (normalized.standardVersion < CERTIFICATE_STANDARD_VERSION) {
    return {
      config: mergeCertificateConfig({}),
      layout: mergeCertificateLayoutPdf({}),
      updatedAt: new Date().toISOString(),
      standardVersion: CERTIFICATE_STANDARD_VERSION,
    };
  }

  return {
    ...normalized,
    standardVersion: CERTIFICATE_STANDARD_VERSION,
  };
}

const initialData = await loadData();
let students = initialData.students;
let courses = initialData.courses;
let classes = initialData.classes || [];
let certificateSettings = normalizeCertificateSettings(initialData.certificateSettings || {});
let companyChangeRequests = Array.isArray(initialData.companyChangeRequests) ? initialData.companyChangeRequests : [];
let users = mergeEnvUsers(initialData.users || []);

function persistData() {
  const payload = { students, courses, classes, certificateSettings, companyChangeRequests, users };
  if (!dbPool) {
    writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
    return;
  }

  dbPool.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(payload)],
  ).catch(error => {
    console.error('Erro ao persistir no PostgreSQL:', error);
  });
}

function updateCertificateSettings(payload) {
  certificateSettings = normalizeCertificateSettings({
    config: payload.config && typeof payload.config === 'object' ? payload.config : certificateSettings.config || {},
    layout: payload.layout && typeof payload.layout === 'object' ? payload.layout : certificateSettings.layout || {},
    updatedAt: new Date().toISOString(),
    standardVersion: CERTIFICATE_STANDARD_VERSION,
  });
  persistData();
  return certificateSettings;
}

function sanitizeManagedUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function mergeEnvUsers(storedUsers = []) {
  const usersByUsername = new Map(
    storedUsers.map(item => [String(item.username || '').toLowerCase(), item]),
  );

  ENV_APP_USERS.forEach(envUser => {
    const key = String(envUser.username || '').toLowerCase();
    if (!key) return;
    if (!usersByUsername.has(key)) {
      usersByUsername.set(key, {
        ...envUser,
        id: envUser.id || Date.now(),
        status: 'ativo',
        tipo: 'usuario',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return [...usersByUsername.values()];
}

const allowedStatusFields = new Set(['statusCadastro', 'statusCertificado']);
const allowedStatusValues = new Set(['pendente', 'aprovado', 'recusado']);
const privilegedRoles = new Set(['admin', 'responsavel']);

function canManageCertificates(payload = {}) {
  return privilegedRoles.has(String(payload.actorRole || '').toLowerCase());
}

function actorLabel(payload = {}) {
  return payload.actor || 'Responsável DRM';
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_PRIMARY_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  });
  res.end(body);
}

function sendBuffer(res, status, buffer, contentType, filename) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': CORS_PRIMARY_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Vary': 'Origin',
  });
  res.end(buffer);
}

function sendNoContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': CORS_PRIMARY_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  });
  res.end();
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signToken(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const [encodedPayload, receivedSignature] = String(token || '').split('.');
  if (!encodedPayload || !receivedSignature) return null;
  const expectedSignature = createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (receivedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload?.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (AUTH_TTL_HOURS * 3600);
  const payload = {
    sub: String(user.id),
    username: user.username,
    role: user.role,
    name: user.name,
    exp,
  };
  return {
    token: signToken(payload),
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

function readBearerToken(req) {
  const header = String(req.headers.authorization || '');
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function requireAuth(req, res) {
  const token = readBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Não autorizado. Faça login novamente.' });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: 'Sessão inválida ou expirada. Faça login novamente.' });
    return null;
  }
  return payload;
}

function notFound(res) {
  sendJson(res, 404, { error: 'Rota nao encontrada.' });
}

function badRequest(res, message) {
  sendJson(res, 400, { error: message });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

const allowedUserRoles = new Set(['admin', 'responsavel', 'usuario', 'instrutor', 'empresario']);

function normalizeUserRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return allowedUserRoles.has(normalized) ? normalized : 'usuario';
}

function normalizeUserStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'inativo') return 'inativo';
  if (normalized === 'pendente' || normalized === 'pendente_aprovacao') return 'pendente';
  return 'ativo';
}

function currentUserFromAuth(auth = {}) {
  return users.find(item => String(item.id) === String(auth.sub)) || null;
}

function isBusinessRole(auth = {}) {
  return String(auth.role || '').toLowerCase() === 'empresario';
}

function businessScopedClasses(auth = {}) {
  if (!isBusinessRole(auth)) return classes;
  const current = currentUserFromAuth(auth);
  const company = String(current?.empresa || '').trim().toLowerCase();
  const actorName = String(current?.name || '').trim().toLowerCase();
  const actorUser = String(current?.username || '').trim().toLowerCase();
  return classes.filter((turma) => {
    const classCompany = String(turma?.empresa?.nome || '').trim().toLowerCase();
    const createdBy = String(turma?.criadoPor || '').trim().toLowerCase();
    if (company && classCompany === company) return true;
    return createdBy === actorName || createdBy === actorUser;
  });
}

function businessScopedStudents(auth = {}) {
  if (!isBusinessRole(auth)) return students;
  const scopedClasses = businessScopedClasses(auth);
  const classIds = new Set(scopedClasses.map(item => String(item.id)));
  const current = currentUserFromAuth(auth);
  const company = String(current?.empresa || '').trim().toLowerCase();
  return students.filter((student) => {
    if (classIds.has(String(student.turmaId || ''))) return true;
    if (company) return String(student.empresa || '').trim().toLowerCase() === company;
    return false;
  });
}

function listCompanyChangeRequests(auth = {}) {
  const role = String(auth.role || '').toLowerCase();
  const current = currentUserFromAuth(auth);
  const company = String(current?.empresa || '').trim().toLowerCase();
  if (privilegedRoles.has(role)) return companyChangeRequests;
  if (role === 'empresario') {
    return companyChangeRequests.filter(item => String(item.empresa || '').trim().toLowerCase() === company);
  }
  return [];
}

function createCompanyChangeRequest(payload = {}, auth = {}) {
  const role = String(auth.role || '').toLowerCase();
  if (!['admin', 'responsavel', 'empresario'].includes(role)) {
    return { status: 403, error: 'Você não tem permissão para solicitar alteração cadastral.' };
  }
  const current = currentUserFromAuth(auth);
  const empresa = String(payload.empresa || current?.empresa || '').trim();
  const tipo = String(payload.tipo || '').trim().toLowerCase();
  const detalhes = payload.detalhes && typeof payload.detalhes === 'object' ? payload.detalhes : {};
  const motivo = String(payload.motivo || '').trim();
  if (!empresa) return { status: 400, error: 'Empresa é obrigatória.' };
  if (!['senha', 'dados'].includes(tipo)) return { status: 400, error: 'Tipo de solicitação inválido.' };
  if (!motivo) return { status: 400, error: 'Motivo da solicitação é obrigatório.' };

  const nextId = companyChangeRequests.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const request = {
    id: nextId,
    empresa,
    tipo,
    motivo,
    detalhes,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    criadoPor: auth.name || payload.actor || 'Solicitante',
    criadoPorRole: role || 'empresario',
    analisadoEm: null,
    analisadoPor: null,
    motivoRecusa: null,
  };
  companyChangeRequests = [request, ...companyChangeRequests];
  persistData();
  return { request };
}

function updateCompanyChangeRequestStatus(id, payload = {}, auth = {}) {
  const role = String(auth.role || '').toLowerCase();
  if (!privilegedRoles.has(role)) {
    return { status: 403, error: 'Você não tem permissão para aprovar/recusar solicitações.' };
  }
  const value = String(payload.status || '').trim().toLowerCase();
  const motivoRecusa = String(payload.motivoRecusa || '').trim();
  if (!['aprovado', 'recusado'].includes(value)) return { status: 400, error: 'Status inválido.' };
  if (value === 'recusado' && !motivoRecusa) return { status: 400, error: 'Motivo da recusa é obrigatório.' };

  const index = companyChangeRequests.findIndex(item => String(item.id) === String(id));
  if (index === -1) return { status: 404, error: 'Solicitação não encontrada.' };

  companyChangeRequests[index] = {
    ...companyChangeRequests[index],
    status: value,
    analisadoEm: new Date().toISOString(),
    analisadoPor: auth.name || 'Responsável DRM',
    motivoRecusa: value === 'recusado' ? motivoRecusa : null,
  };
  persistData();
  return { request: companyChangeRequests[index] };
}

function dashboardFromData(studentsData = [], classesData = [], coursesData = []) {
  const totalAlunos = studentsData.length;
  const alunosAprovados = studentsData.filter(s => s.statusCadastro === 'aprovado').length;
  const alunosPendentes = studentsData.filter(s => s.statusCadastro === 'pendente').length;
  const certificadosEmitidos = studentsData.filter(s => s.statusCertificado === 'aprovado').length;
  const certificadosEnviados = studentsData.filter(s => s.certificadoEnviado).length;
  const totalCursos = coursesData.length;

  const pendingItems = studentsData
    .filter(s => s.statusCadastro === 'pendente' || s.statusCertificado === 'pendente')
    .map(s => ({
      id: s.id,
      nome: s.nome,
      nomeCurso: s.nomeCurso,
      statusCadastro: s.statusCadastro,
      statusCertificado: s.statusCertificado,
    }));

  const recentStudents = [...studentsData]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return {
    metrics: {
      totalAlunos,
      alunosAprovados,
      alunosPendentes,
      certificadosEmitidos,
      certificadosEnviados,
      totalCursos,
    },
    charts: {
      monthly: CHART_DATA_MONTHLY,
    },
    pendingItems,
    recentStudents,
    generatedAt: new Date().toISOString(),
  };
}

function listUsers() {
  return users.map(sanitizeManagedUser);
}

function generateTemporaryPassword() {
  const suffix = String(Date.now()).slice(-6);
  return `Drm@${suffix}`;
}

function createManagedUser(payload = {}) {
  const name = String(payload.name || '').trim();
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const providedPassword = String(payload.password || '').trim();
  const role = normalizeUserRole(payload.role);
  const tipo = payload.tipo === 'instrutor' ? 'instrutor' : 'usuario';
  const status = role === 'empresario'
    ? normalizeUserStatus(payload.status || 'pendente')
    : normalizeUserStatus(payload.status);
  const empresa = String(payload.empresa || '').trim();
  const password = role === 'empresario'
    ? (providedPassword || generateTemporaryPassword())
    : providedPassword;

  if (!name || !username || !email || !password) {
    return { status: 400, error: 'Nome, usuário, e-mail e senha são obrigatórios.' };
  }
  if (role === 'empresario' && !empresa) {
    return { status: 400, error: 'Informe a empresa para usuário Empresário.' };
  }
  if (password.length < 6) {
    return { status: 400, error: 'A senha deve ter pelo menos 6 caracteres.' };
  }
  const duplicated = users.some(item => (
    String(item.username).toLowerCase() === username.toLowerCase() ||
    String(item.email).toLowerCase() === email
  ));
  if (duplicated) {
    return { status: 400, error: 'Usuário ou e-mail já cadastrado.' };
  }

  const newUser = {
    id: Date.now(),
    name,
    username,
    email,
    password,
    role,
    empresa,
    tipo,
    status,
    mustChangePassword: role === 'empresario',
    temporaryPasswordGeneratedAt: role === 'empresario' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  users = [newUser, ...users];
  persistData();
  return {
    user: sanitizeManagedUser(newUser),
    temporaryPassword: role === 'empresario' ? password : null,
  };
}

function updateManagedUser(id, payload = {}) {
  const index = users.findIndex(item => String(item.id) === String(id));
  if (index === -1) return { status: 404, error: 'Usuário não encontrado.' };

  const target = users[index];
  const nextUsername = payload.username !== undefined ? String(payload.username || '').trim() : target.username;
  const nextEmail = payload.email !== undefined ? String(payload.email || '').trim().toLowerCase() : target.email;
  const nextName = payload.name !== undefined ? String(payload.name || '').trim() : target.name;
  const nextRole = payload.role !== undefined ? normalizeUserRole(payload.role) : target.role;
  const nextStatus = payload.status !== undefined ? normalizeUserStatus(payload.status) : normalizeUserStatus(target.status);
  const nextTipo = payload.tipo !== undefined ? (payload.tipo === 'instrutor' ? 'instrutor' : 'usuario') : target.tipo;
  const nextPassword = payload.password !== undefined ? String(payload.password || '').trim() : target.password;
  const nextEmpresa = payload.empresa !== undefined ? String(payload.empresa || '').trim() : String(target.empresa || '').trim();

  if (!nextName || !nextUsername || !nextEmail) {
    return { status: 400, error: 'Nome, usuário e e-mail são obrigatórios.' };
  }
  if (nextRole === 'empresario' && !nextEmpresa) {
    return { status: 400, error: 'Informe a empresa para usuário Empresário.' };
  }
  if (!nextPassword) {
    return { status: 400, error: 'Senha inválida.' };
  }
  if (payload.password !== undefined && nextPassword.length < 6) {
    return { status: 400, error: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  const duplicated = users.some(item => (
    String(item.id) !== String(id) && (
      String(item.username).toLowerCase() === nextUsername.toLowerCase() ||
      String(item.email).toLowerCase() === nextEmail
    )
  ));
  if (duplicated) {
    return { status: 400, error: 'Usuário ou e-mail já cadastrado.' };
  }

  users[index] = {
    ...target,
    name: nextName,
    username: nextUsername,
    email: nextEmail,
    password: nextPassword,
    role: nextRole,
    empresa: nextEmpresa,
    tipo: nextTipo,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  if (payload.password !== undefined && nextRole === 'empresario') {
    users[index].mustChangePassword = true;
    users[index].temporaryPasswordGeneratedAt = new Date().toISOString();
  }
  persistData();
  return { user: sanitizeManagedUser(users[index]) };
}

function changeOwnPassword(auth = {}, payload = {}) {
  const index = users.findIndex(item => String(item.id) === String(auth.sub));
  if (index === -1) return { status: 404, error: 'Usuário não encontrado.' };
  const nextPassword = String(payload.newPassword || '').trim();
  if (!nextPassword || nextPassword.length < 6) {
    return { status: 400, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
  }
  users[index] = {
    ...users[index],
    password: nextPassword,
    mustChangePassword: false,
    temporaryPasswordGeneratedAt: null,
    passwordUpdatedAt: new Date().toISOString(),
  };
  persistData();
  return { user: sanitizeManagedUser(users[index]) };
}

function deleteManagedUser(id, auth = null) {
  const index = users.findIndex(item => String(item.id) === String(id));
  if (index === -1) return { status: 404, error: 'Usuário não encontrado.' };
  const target = users[index];
  if (auth && String(auth.sub) === String(id)) {
    return { status: 400, error: 'Você não pode remover seu próprio usuário logado.' };
  }
  users = users.filter(item => String(item.id) !== String(id));
  persistData();
  return { removed: sanitizeManagedUser(target) };
}

function buildCertificateAuthorization(actorName = 'Responsável DRM') {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return {
    certificadoAutorizadoEm: now.toISOString(),
    certificadoAutorizadoPor: actorName,
    certificadoAssinaturaCodigo: `DRM-CERT-${stamp}-${String(now.getTime()).slice(-6)}`,
    certificadoTemplateVersion: Number(certificateSettings?.standardVersion || CERTIFICATE_STANDARD_VERSION),
  };
}

function buildCourseAccessCode(courseName = '') {
  const prefix = String(courseName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 3)
    .toUpperCase() || 'DRM';
  return `${prefix}-${String(Date.now()).slice(-5)}`;
}

const COURSE_SCHEDULE_TEMPLATES = {
  NR10: [
    'Introdução à segurança com eletricidade',
    'Riscos em instalações e serviços com eletricidade',
    'Técnicas de análise de risco',
    'Medidas de controle do risco elétrico',
    'Normas técnicas brasileiras e regulamentações do MTE',
    'Equipamentos de proteção coletiva e individual',
    'Rotinas de trabalho e procedimentos',
    'Documentação de instalações elétricas',
    'Riscos adicionais e combate a incêndios',
    'Acidentes de origem elétrica, primeiros socorros e responsabilidades',
  ],
  NR35: [
    'Noções de segurança de trabalho em altura',
    'Normas aplicáveis para trabalho em altura',
    'Procedimentos de segurança para trabalhos em altura',
    'Análise de riscos e fator de queda',
    'Proteção coletiva, isolamento e segurança',
    'Acesso por corda',
    'Trabalho em altura conforme NR-18',
    'Nós, voltas e sistemas de ancoragem',
    'Prática de movimentação com talabarte e linhas de segurança',
    'Proteção contra quedas e primeiros socorros',
  ],
  NR18: [
    'Plataforma de Trabalho Aéreo e aspectos regulamentares',
    'Tipos construtivos, aplicações e características operacionais',
    'Acidentes previsíveis e como evitá-los',
    'Plano de Segurança da Operação',
    'Processo de capacitação de operadores',
    'Manutenção mínima de segurança',
  ],
  NR12: [
    'Aspectos gerais, objetivos e aplicações',
    'Análise de risco e etapas de adequação',
    'Normas e dispositivos de segurança',
    'Proteções fixas e móveis',
    'Estudo de caso e exemplos práticos',
    'Arranjo físico e meios de acesso',
    'Treinamentos e capacitações',
    'Ergonomia, sinalização e procedimentos',
    'Transporte de materiais, componentes pressurizados e manutenção',
  ],
};

function detectCourseNorm(courseName = '') {
  const match = String(courseName).toUpperCase().match(/NR\s*[- ]?\s*(\d+)/);
  return match ? `NR${match[1]}` : 'GERAL';
}

function buildDefaultSchedule(course = {}) {
  const norm = detectCourseNorm(course.nomeCurso);
  const topics = COURSE_SCHEDULE_TEMPLATES[norm] || [
    'Abertura do treinamento e orientações iniciais',
    'Conteúdo técnico principal',
    'Prática, dúvidas e revisão',
    'Avaliação e encerramento',
  ];

  return topics.map((titulo, index) => ({
    id: `${norm}-${index + 1}`,
    ordem: index + 1,
    titulo,
    status: 'pendente',
  }));
}

function normalizeSchedule(course = {}) {
  const source = Array.isArray(course.cronograma) && course.cronograma.length > 0
    ? course.cronograma
    : buildDefaultSchedule(course);

  return source.map((item, index) => ({
    id: item.id || `aula-${index + 1}`,
    ordem: Number(item.ordem || index + 1),
    titulo: String(item.titulo || `Aula ${index + 1}`).trim(),
    status: ['pendente', 'em_andamento', 'concluida'].includes(item.status) ? item.status : 'pendente',
    iniciadoEm: item.iniciadoEm || null,
    concluidoEm: item.concluidoEm || null,
    instrutor: item.instrutor || null,
  }));
}

function normalizeCourse(course) {
  const cronograma = normalizeSchedule(course);
  return {
    codigoVerificacao: course.codigoVerificacao || buildCourseAccessCode(course.nomeCurso),
    status: course.status || 'ativo',
    chamadaStatus: course.chamadaStatus || 'aberta',
    cronograma,
    cronogramaStatus: course.cronogramaStatus || (cronograma.some(item => item.status === 'em_andamento') ? 'em_andamento' : 'pendente'),
    ...course,
    cronograma,
  };
}

function publicCourse(course) {
  const inscritos = students.filter(student => String(student.cursoId) === String(course.id)).length;
  return {
    id: course.id,
    nomeCurso: course.nomeCurso,
    descricao: course.descricao,
    empresaContratante: course.empresaContratante,
    local: course.local,
    data: course.data,
    horarioInicio: course.horarioInicio,
    duracao: course.duracao,
    maxAlunos: course.maxAlunos,
    inscritos,
    vagasDisponiveis: Math.max(0, Number(course.maxAlunos || 0) - inscritos),
    status: course.status,
  };
}

function clearCertificateAuthorization(student) {
  const updated = { ...student };
  delete updated.certificadoAutorizadoEm;
  delete updated.certificadoAutorizadoPor;
  delete updated.certificadoAssinaturaCodigo;
  delete updated.certificadoTemplateVersion;
  return updated;
}

function applyStudentStatus(student, field, value, motivo = null, actorName = 'Responsável DRM') {
  const updated = { ...student, [field]: value };

  if (field === 'statusCadastro' && value === 'recusado') {
    updated.statusCertificado = 'recusado';
  }

  if (field === 'statusCertificado' && value === 'aprovado') {
    if (student.presente !== true && Number(student.presenca || 0) < 75) {
      return { ...student, statusCertificado: 'pendente', motivoRecusa: 'Certificado só pode ser liberado para aluno presente na chamada.' };
    }
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

function formatDateBR(date) {
  if (!date) return '-';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatDateTimeBR(dateTime) {
  if (!dateTime) return '-';
  return new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeFileName(value = 'certificado') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'certificado';
}

function certificateFileName(student = {}) {
  const date = sanitizeFileName(student.periodoFim || student.data || new Date().toISOString().split('T')[0]);
  return `${sanitizeFileName(student.nome)}-${date}-${sanitizeFileName(student.nomeCurso)}.pdf`;
}

function certificateTopics(student = {}) {
  const norm = detectCourseNorm(student.nomeCurso);
  return COURSE_SCHEDULE_TEMPLATES[norm] || [
    'Abertura do treinamento e orientações iniciais',
    'Conteúdo técnico principal',
    'Prática, dúvidas e revisão',
    'Avaliação e encerramento',
  ];
}

function mergeCertificateLayoutPdf(layout = {}) {
  const mergedFields = {
    ...defaultCertificateLayout.fields,
    ...(layout.fields || {}),
  };

  mergedFields.localCursoTopo = {
    ...defaultCertificateLayout.fields.localCursoTopo,
    visible: layout.fields?.localCursoTopo?.visible ?? defaultCertificateLayout.fields.localCursoTopo.visible,
  };

  const highestFieldPage = Object.values(mergedFields).reduce(
    (highest, field) => Math.max(highest, Number(field.page) || 1),
    1,
  );

  return {
    ...defaultCertificateLayout,
    ...layout,
    pages: Math.max(defaultCertificateLayout.pages, Number(layout.pages) || 0, highestFieldPage),
    fields: mergedFields,
  };
}

function formatLongDateBR(date) {
  if (!date) return '-- de -------- de ----';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderCertificateTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value ?? ''),
    template || '',
  );
}

function extractCertificateNorm(curso = '') {
  const match = String(curso).match(/\bNR[-\s]?(\d{1,2})\b/i);
  return match ? `NR\n${match[1]}` : 'NR';
}

function certificatePdfValues(config = {}, student = {}) {
  const cfg = mergeCertificateConfig(config);
  const data = { ...sampleCertificateStudent, ...student };
  const manualSignature = data.assinaturaTipo === 'manual';
  const temInstrutor = data.temInstrutor !== false;
  const instrutorNome = temInstrutor ? data.instrutorNome || data.nomeInstrutor || data.instrutor || 'Instrutor não informado' : '';
  const instrutorCargo = temInstrutor ? data.instrutorCargo || data.cargoInstrutor || data.instrutorFuncao || 'Técnico/Engenheiro responsável' : '';
  const instrutorRegistro = temInstrutor ? data.instrutorRegistro || data.registroInstrutor || data.creaInstrutor || data.cftInstrutor || 'CREA/CFT não informado' : '';
  const periodoInicio = formatDateBR(data.periodoInicio || data.data);
  const periodoFim = formatDateBR(data.periodoFim || data.data);
  const templateValues = {
    nome: data.nome,
    cpf: data.cpf || '000.000.000-00',
    curso: data.nomeCurso,
    instrutor: instrutorNome,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    duracao: data.duracao || '8 horas',
    local: data.local || 'local definido',
    cidade: data.local || cfg.endereco,
    data: formatDateBR(data.data),
    dataExtenso: formatLongDateBR(data.data),
    hora: data.horarioInicio ? `, às ${data.horarioInicio}` : '',
    periodo: periodoInicio === periodoFim ? periodoFim : `${periodoInicio} a ${periodoFim}`,
    norma: extractCertificateNorm(data.nomeCurso),
    validadeAnos: cfg.validadeAnos || '2',
    cnpj: cfg.cnpj,
    responsavel: data.certificadoAutorizadoPor || cfg.nomeResponsavel,
    localAssinatura: data.certificadoAssinaturaLocal || cfg.assinaturaDigitalLocal || cfg.endereco,
    assinaturaDataHora: formatDateTimeBR(data.certificadoAutorizadoEm || cfg.assinaturaDigitalAutorizadaEm),
    assinaturaCodigo: manualSignature ? '' : data.certificadoAssinaturaCodigo || cfg.assinaturaDigitalCodigo || 'DRM-AUTH-000000',
  };

  const defaultTopics = certificateTopics(data).map((topic, index) => `${index + 1}. ${topic};`).join('\n');

  return {
    marca: 'DRM',
    nomeEmpresa: cfg.nomeEmpresa,
    cnpjEmpresaTopo: renderCertificateTemplate(cfg.cnpjModelo, templateValues),
    localCursoTopo: data.local || cfg.endereco,
    nrBadge: renderCertificateTemplate(cfg.normaBadge, templateValues),
    nrBadgeConteudo: renderCertificateTemplate(cfg.normaBadge, templateValues),
    titulo: cfg.tituloCertificado,
    textoCertificado: renderCertificateTemplate(cfg.textoCertificadoModelo, templateValues),
    dataLocal: renderCertificateTemplate(cfg.detalhesCursoModelo, templateValues),
    assinaturaResponsavel: cfg.nomeResponsavel,
    assinaturaValidade: manualSignature
      ? `Certificado assinado manualmente por ${templateValues.responsavel}.`
      : renderCertificateTemplate(cfg.assinaturaValidacaoModelo, templateValues),
    cargoResponsavel: cfg.cargoResponsavel,
    creaResponsavel: cfg.creaResponsavel,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    instrutorTipo: cfg.instrutorRotulo,
    participanteNome: data.nome,
    participanteCpf: `CPF ${data.cpf || '000.000.000-00'}`,
    participanteTipo: cfg.registroParticipante,
    marcaCentral: cfg.assinaturaEmpresaTexto,
    conteudoTitulo: cfg.conteudoTitulo,
    conteudoSubtitulo: renderCertificateTemplate(cfg.conteudoSubtitulo, templateValues),
    conteudoProgramatico: cfg.conteudoProgramatico || defaultTopics,
    rodape: cfg.textoRodape,
  };
}

function pdfFieldColor(field, config) {
  if (field.color === 'primary') return config.corPrimaria;
  if (field.color === 'secondary') return config.corSecundaria;
  if (field.color === 'accent') return config.corAcento || config.corSecundaria;
  if (field.color === 'muted') return config.corAcento || '#64748B';
  return '#1E1E24';
}

function fieldRect(doc, field) {
  return {
    x: (field.x / 100) * doc.page.width,
    y: (field.y / 100) * doc.page.height,
    w: (field.w / 100) * doc.page.width,
    h: (field.h / 100) * doc.page.height,
  };
}

function dataUrlToBuffer(value = '') {
  const match = String(value).match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  return match ? Buffer.from(match[1], 'base64') : null;
}

function configuredImageSource(src) {
  if (!src) return null;
  const dataImage = dataUrlToBuffer(src);
  if (dataImage) return dataImage;
  if (src === defaultCertificateConfig.logoAssetPath || src === '/brand/drm-certi-sem-fundo.png') {
    return existsSync(LOGO_FILE) ? LOGO_FILE : null;
  }
  return null;
}

function drawCertificateDecor(doc, page, cfg) {
  const width = doc.page.width;
  const height = doc.page.height;
  const primary = cfg.corPrimaria || '#F97316';
  const secondary = cfg.corSecundaria || '#DC2626';
  const accent = cfg.corAcento || '#3F3F46';
  const headerTop = page === 2 ? 0.232 * height : 0.202 * height;

  doc.save();
  doc.rect(0, 0, width, height).fill('#ffffff');
  doc.opacity(page === 2 ? 0.16 : 0.18).polygon(
    [0.14 * width, 0],
    [0.38 * width, 0],
    [0.18 * width, height],
    [0, height],
    [0, 0.36 * height],
  ).fill(primary);
  doc.opacity(page === 2 ? 0.07 : 0.09).polygon(
    [0.82 * width, 0],
    [width, 0],
    [width, 0.34 * height],
    [0.68 * width, 0.14 * height],
  ).fill(secondary);
  doc.opacity(0.16).polygon(
    [0, 0.84 * height],
    [0.22 * width, height],
    [0, height],
  ).fill(primary);
  doc.restore();

  doc.rect(0.02 * width, 0.02 * height, 0.96 * width, 0.96 * height).lineWidth(2).stroke(primary);
  doc.rect(0.025 * width, 0.025 * height, 0.95 * width, 0.95 * height).lineWidth(1).stroke('#ffffff');
  doc.rect(0.03 * width, 0.03 * height, 0.94 * width, 0.94 * height).lineWidth(1).stroke('#fed7aa');
  doc.rect(0.02 * width, 0.02 * height, 0.46 * width, 0.01 * height).fill(primary);
  doc.rect(0.34 * width, 0.02 * height, 0.14 * width, 0.01 * height).fill(secondary);
  doc.rect(0.77 * width, 0.02 * height, 0.21 * width, 0.01 * height).fill(primary);
  doc.moveTo(0.02 * width, headerTop).lineTo(0.98 * width, headerTop).dash(3, { space: 3 }).lineWidth(0.8).stroke(primary).undash();
  doc.save();
  doc.opacity(0.12);
  doc.rect(0.02 * width, page === 2 ? 0.24 * height : 0.21 * height, 0.96 * width, 0.112 * height).fill(primary);
  doc.restore();
  doc.rect(0.03 * width, 0.946 * height, 0.34 * width, 0.02 * height).fill('#fed7aa');
  doc.rect(0.41 * width, 0.966 * height, 0.18 * width, 0.01 * height).fill(secondary);
  doc.rect(0.41 * width, 0.966 * height, 0.09 * width, 0.01 * height).fill(primary);
  doc.rect(0.63 * width, 0.946 * height, 0.34 * width, 0.02 * height).fill('#fed7aa');
  doc.strokeColor(accent);
}

function drawSpecialCertificateField(doc, id, field, cfg, values, rect, scale) {
  const primary = cfg.corPrimaria || '#F97316';
  const secondary = cfg.corSecundaria || '#DC2626';
  const accent = cfg.corAcento || '#3F3F46';
  const logoSource = configuredImageSource(cfg.logoAssetPath || cfg.logoUrl);

  if (field.kind === 'brand' || field.kind === 'centerBrand') {
    if (logoSource) {
      doc.image(logoSource, rect.x, rect.y, { fit: [rect.w, rect.h], align: field.kind === 'brand' ? 'left' : 'center', valign: 'center' });
    } else {
      doc.font('Helvetica-BoldOblique').fontSize((field.kind === 'brand' ? field.fontSize * 2.3 : field.fontSize) * scale).fillColor(primary).text('DRM', rect.x, rect.y, {
        width: rect.w,
        height: rect.h,
        align: field.align || 'center',
        valign: 'center',
      });
    }
    return;
  }

  if (field.kind === 'digitalSignature') {
    const signatureType = cfg.assinaturaTipo === 'manual' ? 'manual' : 'digital';
    const signature = configuredImageSource(cfg.assinaturaDigitalUrl);
    if (signature) {
      doc.image(signature, rect.x, rect.y, { fit: [rect.w, rect.h], align: 'center', valign: 'center' });
      return;
    }
    doc.roundedRect(rect.x, rect.y, rect.w, rect.h, 4).dash(3, { space: 3 }).lineWidth(0.8).stroke(primary).undash();
    doc.font('Helvetica-Bold').fontSize(field.fontSize * scale).fillColor(primary).text('DRM', rect.x, rect.y + rect.h * 0.26, {
      width: rect.w,
      align: 'center',
    });
    doc.font('Helvetica-Bold').fontSize(Math.max(6, field.fontSize * 0.55 * scale)).text(`assinatura ${signatureType}`, rect.x, rect.y + rect.h * 0.56, {
      width: rect.w,
      align: 'center',
    });
    return;
  }

  if (field.kind === 'nrBadge') {
    doc.save();
    doc.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    doc.rotate(45);
    doc.roundedRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, rect.w * 0.16).lineWidth(1.4).stroke(primary);
    doc.roundedRect(-rect.w / 2 + 3, -rect.h / 2 + 3, rect.w - 6, rect.h - 6, rect.w * 0.14).lineWidth(0.8).stroke(secondary);
    doc.rotate(-45);
    doc.font('Helvetica-Bold').fontSize(field.fontSize * scale).fillColor(primary).text(values[id], -rect.w / 2, -field.fontSize * scale, {
      width: rect.w,
      align: 'center',
      lineGap: 0,
    });
    doc.restore();
    return;
  }

  if (field.kind === 'locationText') {
    doc.rect(rect.x, rect.y, rect.w, rect.h).lineWidth(1.4).stroke(primary);
    doc.font('Helvetica-Bold').fontSize(field.fontSize * scale).fillColor(primary).text(`LOCAL DO CURSO - ${values[id]}`, rect.x, rect.y + rect.h * 0.28, {
      width: rect.w,
      align: 'center',
      characterSpacing: 0.25 * scale,
    });
    return;
  }

  if (field.kind === 'seal') {
    const size = Math.min(rect.w, rect.h) * 0.72;
    doc.circle(rect.x + rect.w / 2, rect.y + rect.h / 2, size / 2).lineWidth(2.2).stroke(accent);
    doc.circle(rect.x + rect.w / 2, rect.y + rect.h / 2, size / 2 - 3).lineWidth(0.8).stroke(secondary);
  }
}

function drawCertificateField(doc, id, field, cfg, values, scale) {
  if (!field.visible) return;
  const rect = fieldRect(doc, field);
  const fontSize = Math.max(field.fontSize || 9.2, 9.2) * scale;

  if (field.kind) {
    drawSpecialCertificateField(doc, id, field, cfg, values, rect, scale);
    return;
  }

  const fontFamily = field.serif ? 'Times' : 'Helvetica';
  const bold = Number.parseInt(field.weight || 400, 10) >= 700;
  const italic = Boolean(field.italic);
  const font = field.serif
    ? (bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman')
    : (bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica');

  if (field.line) {
    doc.rect(rect.x, rect.y, rect.w, Math.max(0.8, 1.4 * scale)).fill(cfg.corPrimaria || '#F97316');
  }

  doc.font(font).fontSize(fontSize).fillColor(pdfFieldColor(field, cfg));
  doc.text(values[id] || '', rect.x, rect.y + (field.line ? 5 * scale : 0), {
    width: rect.w,
    height: rect.h,
    align: field.align || 'left',
    lineGap: Math.max(0, fontSize * ((field.lineHeight || 1.18) - 1)),
    characterSpacing: field.letterSpacing ? field.letterSpacing * scale : 0,
  });
}

function generateCertificatePdf(student, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `Certificado - ${student.nome || 'Aluno'}`,
        Author: 'DRM Treinamentos e Certificações',
        Subject: student.nomeCurso || 'Certificado',
      },
    });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cfg = {
      ...mergeCertificateConfig(certificateSettings.config || {}),
      assinaturaTipo: options.signatureType === 'manual' ? 'manual' : 'digital',
    };
    const layout = mergeCertificateLayoutPdf(certificateSettings.layout || {});
    const values = certificatePdfValues(cfg, { ...student, assinaturaTipo: cfg.assinaturaTipo });
    const showInstructor = student?.temInstrutor !== false;
    const instructorFields = new Set(['instrutorNome', 'instrutorCargo', 'instrutorRegistro', 'instrutorTipo']);
    const scale = doc.page.width / CERTIFICATE_PAGE_WIDTH;
    const pages = Array.from({ length: layout.pages || 1 }, (_, index) => index + 1);

    pages.forEach((page, index) => {
      if (index > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
      drawCertificateDecor(doc, page, cfg);
      Object.entries(layout.fields).forEach(([id, field]) => {
        if ((field.page || 1) !== page) return;
        if (!showInstructor && instructorFields.has(id)) return;
        drawCertificateField(doc, id, field, cfg, values, scale);
      });
    });

    doc.end();
  });
}

function buildCertificateEmail(student) {
  const validationUrl = `${PUBLIC_APP_URL.replace(/\/$/, '')}/validar-certificado`;
  const certificateCode = student.certificadoAssinaturaCodigo || '';
  const courseName = student.nomeCurso || 'treinamento DRM';

  return {
    subject: `Seu certificado DRM está pronto - ${courseName}`,
    text: [
      `Olá, ${student.nome}.`,
      '',
      `Parabéns pela conclusão do curso ${courseName}.`,
      'Seu certificado oficial DRM Treinamentos e Certificações está anexado a este e-mail em PDF.',
      `Código de validação: ${certificateCode}`,
      `Validação pública: ${validationUrl}`,
      '',
      'Atenciosamente,',
      'DRM Treinamentos e Certificações',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
        <div style="max-width:640px;margin:0 auto;padding:28px 16px">
          <div style="background:linear-gradient(135deg,#111827,#f97316);border-radius:18px 18px 0 0;padding:28px;color:white">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fed7aa">DRM Treinamentos e Certificações</p>
            <h1 style="margin:0;font-size:26px;line-height:1.2">Seu certificado está pronto</h1>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:28px">
            <p style="font-size:16px;margin:0 0 16px">Olá, <strong>${student.nome}</strong>.</p>
            <p style="font-size:15px;margin:0 0 16px">
              Parabéns pela conclusão do curso <strong>${courseName}</strong>. Seu certificado oficial está anexado a este e-mail em PDF.
            </p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#9a3412">Código de validação</p>
              <p style="margin:0;font-family:Consolas,monospace;font-size:16px;font-weight:bold;color:#111827">${certificateCode}</p>
            </div>
            <p style="font-size:14px;margin:0 0 16px;color:#4b5563">
              A autenticidade do certificado pode ser conferida a qualquer momento pelo link abaixo:
            </p>
            <p style="margin:0 0 24px">
              <a href="${validationUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">
                Validar certificado
              </a>
            </p>
            <p style="font-size:13px;color:#6b7280;margin:0">
              Guarde este e-mail e o PDF anexado. Ele comprova a emissão e permite a validação pública do certificado.
            </p>
            <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
            <p style="font-size:14px;margin:0;color:#374151">Atenciosamente,<br><strong>DRM Treinamentos e Certificações</strong></p>
          </div>
        </div>
      </div>
    `,
  };
}

async function sendCertificateEmail(student, options = {}) {
  if (!mailTransport) return { sent: false, error: 'SMTP nao configurado.' };
  if (!student.email) return { sent: false, error: 'Aluno sem e-mail cadastrado.' };

  const message = buildCertificateEmail(student);
  const certificatePdf = await generateCertificatePdf(student, options);
  const filename = certificateFileName(student);
  await mailTransport.sendMail({
    from: SMTP_FROM,
    to: student.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [
      {
        filename,
        content: certificatePdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return { sent: true };
}

function buildDashboard() {
  return dashboardFromData(students, classes, courses);
}

function normalizeCoursePayload(payload) {
  const pickText = (...values) => {
    const value = values.find(item => item !== undefined && item !== null && String(item).trim() !== '');
    return value === undefined ? '' : String(value).trim();
  };
  const instrutorNomeRaw = pickText(payload.instrutorNome, payload.nomeInstrutor, payload.instrutor);
  const instrutorCargoRaw = pickText(payload.instrutorCargo, payload.cargoInstrutor, payload.instrutorFuncao);
  const instrutorRegistroRaw = pickText(payload.instrutorRegistro, payload.registroInstrutor, payload.creaInstrutor, payload.cftInstrutor);
  const explicitNoInstructor = payload.temInstrutor === false || payload.temInstrutor === 'false';
  const temInstrutor = explicitNoInstructor
    ? false
    : payload.temInstrutor !== undefined || Boolean(instrutorNomeRaw || instrutorCargoRaw || instrutorRegistroRaw);
  const instrutorNome = temInstrutor ? instrutorNomeRaw : '';
  const instrutorCargo = temInstrutor ? instrutorCargoRaw : '';
  const instrutorRegistro = temInstrutor ? instrutorRegistroRaw : '';

  return {
    ...payload,
    temInstrutor,
    instrutor: instrutorNome,
    instrutorNome,
    instrutorCargo,
    instrutorRegistro,
    status: payload.status || 'ativo',
    codigoVerificacao: payload.codigoVerificacao || buildCourseAccessCode(payload.nomeCurso),
    chamadaStatus: payload.chamadaStatus || 'aberta',
    cronograma: normalizeSchedule(payload),
    cronogramaStatus: payload.cronogramaStatus || 'pendente',
  };
}

function createCourse(payload) {
  const coursePayload = normalizeCoursePayload(payload);
  const required = ['nomeCurso', 'empresaContratante', 'local', 'data', 'horarioInicio', 'duracao', 'maxAlunos'];
  if (coursePayload.temInstrutor) {
    required.push('instrutorNome', 'instrutorCargo', 'instrutorRegistro');
  }
  const missing = required.filter(field => !coursePayload[field]);
  if (missing.length > 0) {
    return { error: `Campos obrigatorios: ${missing.join(', ')}` };
  }

  const nextId = courses.reduce((max, course) => Math.max(max, Number(course.id) || 0), 0) + 1;
  const newCourse = {
    ...coursePayload,
    id: nextId,
    maxAlunos: Number(coursePayload.maxAlunos),
    qrCode: `DRM-QR-${String(Date.now()).slice(-6)}`,
    status: coursePayload.status || 'ativo',
    codigoVerificacao: coursePayload.codigoVerificacao || buildCourseAccessCode(coursePayload.nomeCurso),
    chamadaStatus: 'aberta',
    cronograma: normalizeSchedule(coursePayload),
    cronogramaStatus: 'pendente',
    createdAt: new Date().toISOString().split('T')[0],
  };
  courses = [...courses, newCourse];
  persistData();
  return { course: newCourse };
}

function updateCourse(id, payload) {
  const index = courses.findIndex(course => String(course.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Curso nao encontrado.' };
  }

  const current = courses[index];
  const coursePayload = normalizeCoursePayload({ ...current, ...payload });
  if (coursePayload.temInstrutor) {
    const missingInstructor = ['instrutorNome', 'instrutorCargo', 'instrutorRegistro'].filter(field => !coursePayload[field]);
    if (missingInstructor.length > 0) {
      return { status: 400, error: `Campos obrigatorios: ${missingInstructor.join(', ')}` };
    }
  }
  const updated = {
    ...current,
    ...coursePayload,
    id: current.id,
    qrCode: current.qrCode,
    maxAlunos: coursePayload.maxAlunos !== undefined ? Number(coursePayload.maxAlunos) : current.maxAlunos,
    updatedAt: new Date().toISOString(),
  };

  courses = courses.map(course => (String(course.id) === String(id) ? updated : course));
  persistData();
  return { course: updated };
}

function deleteTestCourse(id, payload = {}) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para remover curso de teste.' };
  }
  const course = courses.find(item => String(item.id) === String(id));
  if (!course) return { status: 404, error: 'Curso nao encontrado.' };
  if (!String(course.nomeCurso || '').includes('[TESTE]')) {
    return { status: 403, error: 'Por segurança, somente cursos marcados como [TESTE] podem ser removidos por este endpoint.' };
  }
  const hasNonTestStudents = students.some(student => String(student.cursoId) === String(id) && !String(student.nome || '').includes('[TESTE]'));
  if (hasNonTestStudents) {
    return { status: 409, error: 'Curso de teste possui alunos sem marcação [TESTE] e não foi removido.' };
  }
  courses = courses.filter(item => String(item.id) !== String(id));
  classes = classes.filter(item => String(item.cursoId) !== String(id));
  students = students.filter(student => String(student.cursoId) !== String(id));
  persistData();
  return { ok: true, removedCourseId: id };
}

function updateCourseSchedule(id, payload) {
  const index = courses.findIndex(course => String(course.id) === String(id));
  if (index === -1) return { status: 404, error: 'Curso nao encontrado.' };

  const actor = payload.actor || 'Instrutor DRM';
  const action = payload.action || 'save';
  const currentCourse = normalizeCourse(courses[index]);
  let cronograma = Array.isArray(payload.cronograma)
    ? normalizeSchedule({ ...currentCourse, cronograma: payload.cronograma })
    : normalizeSchedule(currentCourse);
  const now = new Date().toISOString();

  if (action === 'reset') {
    cronograma = buildDefaultSchedule(currentCourse);
  }

  if (action === 'start-next') {
    if (!cronograma.some(item => item.status === 'em_andamento')) {
      const nextIndex = cronograma.findIndex(item => item.status === 'pendente');
      if (nextIndex !== -1) {
        cronograma[nextIndex] = {
          ...cronograma[nextIndex],
          status: 'em_andamento',
          iniciadoEm: now,
          instrutor: actor,
        };
      }
    }
  }

  if (action === 'finish-current') {
    cronograma = cronograma.map(item => (
      item.status === 'em_andamento'
        ? { ...item, status: 'concluida', concluidoEm: now, instrutor: item.instrutor || actor }
        : item
    ));
  }

  if (action === 'start-item' && payload.itemId) {
    cronograma = cronograma.map(item => {
      if (item.status === 'em_andamento') return { ...item, status: 'pendente', iniciadoEm: null };
      if (String(item.id) === String(payload.itemId) && item.status !== 'concluida') {
        return { ...item, status: 'em_andamento', iniciadoEm: now, instrutor: actor };
      }
      return item;
    });
  }

  const cronogramaStatus = cronograma.every(item => item.status === 'concluida')
    ? 'concluido'
    : cronograma.some(item => item.status === 'em_andamento' || item.status === 'concluida')
      ? 'em_andamento'
      : 'pendente';

  const updated = {
    ...courses[index],
    cronograma,
    cronogramaStatus,
    cronogramaAtualizadoEm: now,
    cronogramaAtualizadoPor: actor,
  };

  courses = courses.map(course => (String(course.id) === String(id) ? updated : course));
  persistData();
  return { course: normalizeCourse(updated) };
}

function activePublicCourses() {
  return courses
    .map(normalizeCourse)
    .filter(course => course.status === 'ativo')
    .map(publicCourse);
}

function verifyCourseAccess(courseId, codigo) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(courseId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };
  if (course.status !== 'ativo') return { status: 400, error: 'Curso nao esta ativo.' };
  if (String(course.codigoVerificacao || '').trim().toUpperCase() !== String(codigo || '').trim().toUpperCase()) {
    return { status: 401, error: 'Codigo de verificacao invalido.' };
  }
  return { course: publicCourse(course) };
}

function createStudentEnrollment(courseId, payload) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(courseId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };

  const verified = verifyCourseAccess(courseId, payload.codigo);
  if (verified.error) return verified;

  const inscritos = students.filter(student => String(student.cursoId) === String(course.id)).length;
  if (Number(course.maxAlunos || 0) > 0 && inscritos >= Number(course.maxAlunos)) {
    return { status: 400, error: 'Curso sem vagas disponiveis.' };
  }

  const required = ['nome', 'cpf'];
  const missing = required.filter(field => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length > 0) {
    return { status: 400, error: `Campos obrigatorios: ${missing.join(', ')}` };
  }

  const duplicate = students.find(student => (
    String(student.cursoId) === String(course.id) &&
    String(student.cpf || '').replace(/\D/g, '') === String(payload.cpf || '').replace(/\D/g, '')
  ));
  if (duplicate) return { status: 409, error: 'CPF ja cadastrado para este curso.' };

  const nextId = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
  const student = {
    id: nextId,
    nome: String(payload.nome).trim(),
    cpf: String(payload.cpf).trim(),
    email: String(payload.email).trim(),
    telefone: String(payload.telefone).trim(),
    empresa: String(payload.empresa).trim(),
    cargo: String(payload.cargo).trim(),
    cursoId: course.id,
    nomeCurso: course.nomeCurso,
    local: payload.local || course.local,
    data: payload.data || course.data,
    horarioInicio: payload.horarioInicio || course.horarioInicio,
    duracao: course.duracao,
    periodoInicio: payload.periodoInicio || payload.data || course.data,
    periodoFim: payload.periodoFim || payload.data || course.data,
    temInstrutor: course.temInstrutor,
    instrutor: course.instrutor,
    instrutorNome: course.instrutorNome,
    instrutorCargo: course.instrutorCargo,
    instrutorRegistro: course.instrutorRegistro,
    statusCadastro: 'pendente',
    statusCertificado: 'pendente',
    certificadoEnviado: false,
    dataEnvio: null,
    presente: null,
    presenca: 0,
    notaProva: 0,
    foto: null,
    motivoRecusa: null,
    inscritoEm: new Date().toISOString(),
  };

  students = [...students, student];
  persistData();
  return { student };
}

async function createManualStudent(payload) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(payload.cursoId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };

  const required = ['nome', 'cpf'];
  const missing = required.filter(field => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length > 0) {
    return { status: 400, error: `Campos obrigatorios: ${missing.join(', ')}` };
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || '').trim())) {
    return { status: 400, error: 'E-mail invalido.' };
  }

  const duplicate = students.find(student => (
    String(student.cursoId) === String(course.id) &&
    String(student.cpf || '').replace(/\D/g, '') === String(payload.cpf || '').replace(/\D/g, '')
  ));
  if (duplicate) {
    return {
      status: 409,
      error: `CPF ja cadastrado para este curso (${duplicate.nome || 'Aluno'}). Valide o certificado existente antes de novo cadastro.`,
    };
  }

  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const studentDate = String(payload.data || course.data || '').trim();
  const studentStartTime = String(payload.horarioInicio || course.horarioInicio || '').trim();
  const studentLocation = String(payload.local || course.local || '').trim();
  const studentDuration = String(payload.duracao || course.duracao || '').trim();
  const studentPeriodoInicio = String(payload.periodoInicio || studentDate || '').trim();
  const studentPeriodoFim = String(payload.periodoFim || studentDate || '').trim();
  const studentEmail = String(payload.email || '').trim();
  const studentPhone = String(payload.telefone || '').trim();
  const studentCompany = String(payload.empresa || '').trim() || 'A definir';
  const studentRole = String(payload.cargo || '').trim() || 'Participante';
  const isRetroativo = Boolean(payload.cadastroRetroativo) || (studentDate && studentDate < today);
  const motivoRetroativo = String(payload.motivoRetroativo || '').trim();
  if (isRetroativo && !motivoRetroativo) {
    return { status: 400, error: 'Informe o motivo do cadastro retroativo para envio a analise.' };
  }
  const nextId = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
  const student = {
    id: nextId,
    nome: String(payload.nome).trim(),
    cpf: String(payload.cpf).trim(),
    email: studentEmail,
    telefone: studentPhone,
    empresa: studentCompany,
    cargo: studentRole,
    cursoId: course.id,
    nomeCurso: course.nomeCurso,
    local: studentLocation,
    data: studentDate,
    horarioInicio: studentStartTime,
    duracao: studentDuration,
    periodoInicio: studentPeriodoInicio,
    periodoFim: studentPeriodoFim,
    temInstrutor: course.temInstrutor,
    instrutor: course.instrutor,
    instrutorNome: course.instrutorNome,
    instrutorCargo: course.instrutorCargo,
    instrutorRegistro: course.instrutorRegistro,
    statusCadastro: 'pendente',
    statusCertificado: 'pendente',
    certificadoEnviado: false,
    dataEnvio: null,
    presente: true,
    presenca: Number(payload.presenca || 100),
    notaProva: Number(payload.notaProva || 10),
    foto: null,
    motivoRecusa: null,
    origemCadastro: isRetroativo ? 'manual-retroativo' : 'manual',
    cadastroRetroativo: isRetroativo,
    motivoRetroativo: motivoRetroativo || null,
    inscritoEm: now,
    chamadaRealizadaEm: null,
    chamadaPor: null,
  };

  students = [...students, student];
  persistData();
  return { student };
}

function classChecklist(turma) {
  const classStudents = students.filter(student => String(student.turmaId) === String(turma.id));
  const hasStudents = classStudents.length > 0;
  const approvedStudents = classStudents.filter(student => student.statusCertificado === 'aprovado');
  const emittedStudents = approvedStudents.filter(student => student.certificadoAssinaturaCodigo);
  const analysisDone = hasStudents && classStudents.every(student => (
    student.statusCadastro !== 'pendente' && student.statusCertificado !== 'pendente'
  ));
  const certificatesApproved = emittedStudents.length > 0;
  const emailsSent = approvedStudents.length > 0 && approvedStudents.every(student => student.certificadoEnviado);

  return [
    { id: 'empresa', label: 'Empresa cadastrada', status: turma.empresa?.nome ? 'concluido' : 'erro', motivo: turma.empresa?.nome ? 'Empresa vinculada à turma.' : 'Informe ou selecione a empresa contratante.' },
    { id: 'curso', label: 'Curso definido', status: turma.cursoId ? 'concluido' : 'erro', motivo: turma.cursoId ? 'Curso vinculado à turma.' : 'Selecione um curso antes de avançar.' },
    { id: 'alunos', label: 'Alunos cadastrados', status: hasStudents ? 'concluido' : 'pendente', motivo: hasStudents ? `${classStudents.length} aluno(s) cadastrados.` : 'Cadastre ou importe alunos para a turma.' },
    { id: 'analise', label: 'Análise concluída', status: analysisDone ? 'concluido' : hasStudents ? 'pendente' : 'bloqueado', motivo: analysisDone ? 'Todos os alunos foram analisados.' : hasStudents ? 'Ainda existem alunos pendentes de aprovação/recusa.' : 'Cadastre alunos primeiro.' },
    { id: 'certificados', label: 'Certificados emitidos', status: certificatesApproved ? 'concluido' : analysisDone ? 'pendente' : 'bloqueado', motivo: certificatesApproved ? `${emittedStudents.length} certificado(s) autorizados.` : analysisDone ? 'Emita os certificados aprovados.' : 'Conclua a análise antes da emissão.' },
    { id: 'emails', label: 'E-mails enviados', status: emailsSent ? 'concluido' : certificatesApproved ? 'pendente' : 'bloqueado', motivo: emailsSent ? 'Todos os certificados aprovados foram enviados.' : certificatesApproved ? 'Ainda há certificados aprovados sem envio por e-mail.' : 'Autorize certificados antes do envio.' },
  ];
}

function classPendencies(turma) {
  const classStudents = students.filter(student => String(student.turmaId) === String(turma.id));
  const pendencies = [];
  classStudents.forEach(student => {
    const prefix = `${student.nome || 'Aluno sem nome'} (${student.cpf || 'sem CPF'})`;
    if (!student.nome) pendencies.push({ studentId: student.id, tipo: 'nome', mensagem: `${prefix}: nome obrigatório ausente.` });
    if (!student.cpf) pendencies.push({ studentId: student.id, tipo: 'cpf', mensagem: `${prefix}: CPF obrigatório ausente.` });
    if (!student.email) pendencies.push({ studentId: student.id, tipo: 'email', mensagem: `${prefix}: sem e-mail; use baixar PDF/ZIP.` });
    if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) pendencies.push({ studentId: student.id, tipo: 'email', mensagem: `${prefix}: e-mail inválido.` });
    if (student.statusCertificado !== 'aprovado') pendencies.push({ studentId: student.id, tipo: 'certificado', mensagem: `${prefix}: certificado não aprovado.` });
    if (student.certificadoEmailErro) pendencies.push({ studentId: student.id, tipo: 'envio', mensagem: `${prefix}: ${student.certificadoEmailErro}` });
  });
  return pendencies;
}

function enrichClass(turma) {
  const classStudents = students.filter(student => String(student.turmaId) === String(turma.id));
  return {
    ...turma,
    totalAlunos: classStudents.length,
    alunosPendentes: classStudents.filter(student => student.statusCadastro === 'pendente' || student.statusCertificado === 'pendente').length,
    alunosAprovados: classStudents.filter(student => student.statusCadastro === 'aprovado').length,
    certificadosAprovados: classStudents.filter(student => student.statusCertificado === 'aprovado').length,
    certificadosEnviados: classStudents.filter(student => student.certificadoEnviado).length,
    checklist: classChecklist(turma),
    pendencias: classPendencies(turma),
  };
}

function getClasses() {
  return classes.map(enrichClass);
}

function createManualClass(payload) {
  const course = normalizeCourse(courses.find(item => String(item.id) === String(payload.cursoId)) || {});
  if (!course.id) return { status: 404, error: 'Curso nao encontrado.' };
  const classDuration = String(payload.duracao || course.duracao || '').trim() || '8 horas';

  const empresa = payload.empresa || {};
  if (!String(empresa.nome || '').trim()) return { status: 400, error: 'Empresa e obrigatoria.' };
  const rows = Array.isArray(payload.alunos) ? payload.alunos : [];
  if (rows.length === 0) return { status: 400, error: 'Informe ao menos um aluno.' };

  const requiredStudent = ['nome', 'cpf', 'email', 'telefone', 'cargo'];
  const invalidIndex = rows.findIndex(row => requiredStudent.some(field => !String(row[field] || '').trim()));
  if (invalidIndex !== -1) return { status: 400, error: `Aluno ${invalidIndex + 1} possui campos obrigatorios vazios.` };
  const invalidEmailIndex = rows.findIndex(row => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email || '').trim()));
  if (invalidEmailIndex !== -1) return { status: 400, error: `Aluno ${invalidEmailIndex + 1} possui e-mail invalido.` };

  const cpfSet = new Set();
  for (const row of rows) {
    const cpf = String(row.cpf || '').replace(/\D/g, '');
    if (cpfSet.has(cpf)) return { status: 409, error: `CPF duplicado na turma: ${row.cpf}.` };
    cpfSet.add(cpf);
    const duplicate = students.find(student => (
      String(student.cursoId) === String(course.id) &&
      String(student.cpf || '').replace(/\D/g, '') === cpf
    ));
    if (duplicate) return { status: 409, error: `CPF ja cadastrado para este curso: ${row.cpf}.` };
  }

  const actor = actorLabel(payload);
  const actorRole = payload.actorRole || 'responsavel';
  const now = new Date().toISOString();
  const nextClassId = classes.reduce((max, turma) => Math.max(max, Number(turma.id) || 0), 0) + 1;
  const turma = {
    id: nextClassId,
    nome: payload.nome || `Turma ${course.nomeCurso} - ${empresa.nome}`,
    empresa: {
      nome: String(empresa.nome || '').trim(),
      cnpj: String(empresa.cnpj || '').trim(),
      contato: String(empresa.contato || '').trim(),
      telefone: String(empresa.telefone || '').trim(),
      email: String(empresa.email || '').trim(),
    },
    cursoId: course.id,
    nomeCurso: course.nomeCurso,
    cargaHoraria: classDuration,
    validade: payload.validade || certificateSettings.config?.validadeAnos || '',
    modeloCertificado: payload.modeloCertificado || certificateSettings.config?.tituloCertificado || 'CERTIFICADO',
    instrutorNome: payload.instrutorNome || course.instrutorNome || course.instrutor || '',
    instrutorCargo: payload.instrutorCargo || course.instrutorCargo || '',
    instrutorRegistro: payload.instrutorRegistro || course.instrutorRegistro || '',
    local: payload.local || course.local,
    data: payload.data || course.data,
    horarioInicio: payload.horarioInicio || course.horarioInicio,
    periodoInicio: payload.periodoInicio || payload.data || course.data,
    periodoFim: payload.periodoFim || payload.data || course.data,
    status: 'em_analise',
    origem: 'turma-manual',
    ambienteTeste: Boolean(payload.ambienteTeste) || String(payload.nome || empresa.nome || '').includes('[TESTE]'),
    criadoEm: now,
    criadoPor: actor,
    historico: [
      { tipo: 'criada', ator: actor, perfil: actorRole, em: now, quantidade: rows.length, detalhe: `${rows.length} aluno(s) enviados para análise.` },
    ],
  };

  const nextStudentStart = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
  const newStudents = rows.map((row, index) => ({
    id: nextStudentStart + index,
    nome: String(row.nome).trim(),
    cpf: String(row.cpf).trim(),
    email: String(row.email).trim(),
    telefone: String(row.telefone).trim(),
    empresa: turma.empresa.nome,
    cargo: String(row.cargo).trim(),
    cursoId: course.id,
    turmaId: turma.id,
    turmaNome: turma.nome,
    nomeCurso: course.nomeCurso,
    local: turma.local,
    data: turma.data,
    horarioInicio: turma.horarioInicio,
    duracao: classDuration,
    periodoInicio: turma.periodoInicio,
    periodoFim: turma.periodoFim,
    temInstrutor: course.temInstrutor,
    instrutor: turma.instrutorNome,
    instrutorNome: turma.instrutorNome,
    instrutorCargo: turma.instrutorCargo,
    instrutorRegistro: turma.instrutorRegistro,
    statusCadastro: 'aprovado',
    statusCertificado: 'pendente',
    certificadoEnviado: false,
    dataEnvio: null,
    presente: true,
    presenca: Number(row.presenca || 100),
    notaProva: Number(row.notaProva || 10),
    foto: null,
    motivoRecusa: null,
    origemCadastro: 'turma-manual',
    inscritoEm: now,
    chamadaRealizadaEm: now,
    chamadaPor: actor,
  }));

  classes = [...classes, turma];
  students = [...students, ...newStudents];
  persistData();
  return { class: enrichClass(turma), students: newStudents };
}

function createCompanyPreRegistration(payload) {
  const pendingRequestId = payload.pendingRequestId != null ? String(payload.pendingRequestId) : null;
  const requestedCode = String(payload.codigoCatalogo || payload.courseCode || '').trim().toUpperCase();
  const catalogItem = NR_CATALOG.find(item => String(item.code || '').toUpperCase() === requestedCode) || null;
  const baseCourse = normalizeCourse(courses.find(item => String(item.id) === String(payload.cursoId)) || {});
  if (!baseCourse.id && !catalogItem) return { status: 404, error: 'Curso nao encontrado.' };

  const empresaFixada = String(payload.authUser?.empresa || '').trim();
  const empresaNome = String(empresaFixada || payload.empresaNome || payload.empresa?.nome || '').trim();
  if (!empresaNome) return { status: 400, error: 'Empresa e obrigatoria.' };

  const rows = Array.isArray(payload.alunos) ? payload.alunos : [];

  const requiredStudent = ['nome', 'cpf', 'telefone'];
  const invalidIndex = rows.findIndex(row => requiredStudent.some(field => !String(row[field] || '').trim()));
  if (invalidIndex !== -1) return { status: 400, error: `Funcionario ${invalidIndex + 1} possui campos obrigatorios vazios.` };

  const cpfSet = new Set();
  for (const row of rows) {
    const cpf = String(row.cpf || '').replace(/\D/g, '');
    if (cpfSet.has(cpf)) return { status: 409, error: `CPF duplicado no pre-cadastro: ${row.cpf}.` };
    cpfSet.add(cpf);
    if (baseCourse.id) {
      const duplicate = students.find(student => (
        String(student.cursoId) === String(baseCourse.id) &&
        String(student.cpf || '').replace(/\D/g, '') === cpf
      ));
      if (duplicate) return { status: 409, error: `CPF ja cadastrado para este curso: ${row.cpf}.` };
    }
  }

  const actor = actorLabel(payload);
  const actorRole = payload.actorRole || 'empresario';
  const now = new Date().toISOString();
  const templateCourse = baseCourse.id ? baseCourse : {
    nomeCurso: catalogItem?.nomeCurso || payload.nomeCurso || 'Curso solicitado',
    duracao: catalogItem?.duracao || payload.duracao || '8 horas',
    descricao: catalogItem?.descricao || payload.descricao || '',
    instrutorNome: '',
    instrutorCargo: '',
    instrutorRegistro: '',
    temInstrutor: false,
    local: '',
    data: '',
    horarioInicio: '',
  };
  const classDuration = String(payload.duracao || templateCourse.duracao || '').trim() || '8 horas';

  if (pendingRequestId) {
    const pendingClass = classes.find(item => String(item.id) === pendingRequestId && String(item.origem || '') === 'pre-cadastro-empresarial');
    if (!pendingClass) return { status: 404, error: 'Solicitacao pendente nao encontrada.' };
    const pendingCourse = normalizeCourse(courses.find(item => String(item.id) === String(pendingClass.cursoId)) || {});
    if (!pendingCourse.id) return { status: 404, error: 'Curso da solicitacao nao encontrado.' };
    if (rows.length === 0) return { class: enrichClass(pendingClass), students: [], course: pendingCourse };

    const nextStudentStart = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
    const newStudents = rows.map((row, index) => ({
      id: nextStudentStart + index,
      nome: String(row.nome).trim(),
      cpf: String(row.cpf).trim(),
      email: String(row.email || '').trim(),
      telefone: String(row.telefone).trim(),
      empresa: pendingClass.empresa?.nome || empresaNome,
      cargo: String(row.cargo || 'Funcionário').trim(),
      cursoId: pendingCourse.id,
      turmaId: pendingClass.id,
      turmaNome: pendingClass.nome,
      nomeCurso: pendingClass.nomeCurso || pendingCourse.nomeCurso,
      local: pendingClass.local,
      data: pendingClass.data,
      horarioInicio: pendingClass.horarioInicio,
      duracao: pendingClass.cargaHoraria || classDuration,
      periodoInicio: pendingClass.periodoInicio,
      periodoFim: pendingClass.periodoFim,
      temInstrutor: pendingCourse.temInstrutor,
      instrutor: pendingClass.instrutorNome,
      instrutorNome: pendingClass.instrutorNome,
      instrutorCargo: pendingClass.instrutorCargo,
      instrutorRegistro: pendingClass.instrutorRegistro,
      statusCadastro: 'pendente',
      statusCertificado: 'pendente',
      certificadoEnviado: false,
      dataEnvio: null,
      presente: true,
      presenca: 100,
      notaProva: 10,
      foto: null,
      motivoRecusa: null,
      origemCadastro: 'pre-cadastro-empresarial',
      inscritoEm: now,
    }));

    students = [...students, ...newStudents];
    classes = classes.map(item => (
      String(item.id) !== pendingRequestId
        ? item
        : {
            ...item,
            historico: [
              ...(Array.isArray(item.historico) ? item.historico : []),
              { tipo: 'alunos-adicionados', ator: actor, perfil: actorRole, em: now, quantidade: rows.length, detalhe: `${rows.length} funcionario(s) enviados para validacao DRM.` },
            ],
          }
    ));
    persistData();
    return {
      class: enrichClass(classes.find(item => String(item.id) === pendingRequestId)),
      students: newStudents,
      course: pendingCourse,
    };
  }

  let effectiveCourse = baseCourse;
  if (!baseCourse.id || baseCourse.tipoCurso === 'modelo' || String(payload.forcePendingCourse || 'true') !== 'false') {
    const nextCourseId = courses.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const requestedCourse = {
      id: nextCourseId,
      qrCode: `DRM-SOL-${String(Date.now()).slice(-6)}`,
      local: String(payload.local || '').trim() || 'A definir',
      data: String(payload.data || '').trim() || '',
      horarioInicio: String(payload.horarioInicio || '').trim() || '',
      duracao: classDuration,
      maxAlunos: Number(payload.maxAlunos || rows.length || 30),
      temInstrutor: false,
      instrutor: '',
      instrutorNome: '',
      instrutorCargo: '',
      instrutorRegistro: '',
      nomeCurso: templateCourse.nomeCurso,
      descricao: templateCourse.descricao || '',
      empresaContratante: empresaNome,
      status: 'pendente_aprovacao',
      codigoVerificacao: buildCourseAccessCode(templateCourse.nomeCurso),
      tipoCurso: 'solicitacao_empresarial',
      codigoCatalogo: requestedCode || templateCourse.codigoCatalogo || '',
      origemSolicitacao: 'empresario',
      solicitacaoAprovacao: 'pendente',
      solicitadoPor: actor,
      createdAt: now.split('T')[0],
      solicitadoEm: now,
    };
    courses = [...courses, requestedCourse];
    effectiveCourse = normalizeCourse(requestedCourse);
  }

  const nextClassId = classes.reduce((max, turma) => Math.max(max, Number(turma.id) || 0), 0) + 1;
  const turma = {
    id: nextClassId,
    nome: payload.nome || `Pré-cadastro ${effectiveCourse.nomeCurso} - ${empresaNome}`,
    empresa: {
      nome: empresaNome,
      cnpj: String(payload.empresaCnpj || '').trim(),
      contato: String(payload.empresaContato || '').trim(),
      telefone: String(payload.empresaTelefone || '').trim(),
      email: String(payload.empresaEmail || '').trim(),
    },
    cursoId: effectiveCourse.id,
    nomeCurso: effectiveCourse.nomeCurso,
    cargaHoraria: classDuration,
    validade: payload.validade || certificateSettings.config?.validadeAnos || '',
    modeloCertificado: payload.modeloCertificado || certificateSettings.config?.tituloCertificado || 'CERTIFICADO',
    instrutorNome: payload.instrutorNome || effectiveCourse.instrutorNome || effectiveCourse.instrutor || '',
    instrutorCargo: payload.instrutorCargo || effectiveCourse.instrutorCargo || '',
    instrutorRegistro: payload.instrutorRegistro || effectiveCourse.instrutorRegistro || '',
    local: payload.local || effectiveCourse.local,
    data: payload.data || effectiveCourse.data,
    horarioInicio: payload.horarioInicio || effectiveCourse.horarioInicio,
    periodoInicio: payload.periodoInicio || payload.data || effectiveCourse.data,
    periodoFim: payload.periodoFim || payload.data || effectiveCourse.data,
    status: 'em_analise',
    origem: 'pre-cadastro-empresarial',
    solicitacaoCursoStatus: 'pendente',
    criadoEm: now,
    criadoPor: actor,
    historico: [
      { tipo: 'pre-cadastro', ator: actor, perfil: actorRole, em: now, quantidade: rows.length, detalhe: rows.length > 0 ? `${rows.length} funcionario(s) e curso solicitados para validacao DRM.` : 'Dados do treinamento confirmados. Aguardando cadastro de funcionarios.' },
    ],
  };

  const nextStudentStart = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0) + 1;
  const newStudents = rows.map((row, index) => ({
    id: nextStudentStart + index,
    nome: String(row.nome).trim(),
    cpf: String(row.cpf).trim(),
    email: String(row.email || '').trim(),
    telefone: String(row.telefone).trim(),
    empresa: empresaNome,
    cargo: String(row.cargo || 'Funcionário').trim(),
    cursoId: effectiveCourse.id,
    turmaId: turma.id,
    turmaNome: turma.nome,
    nomeCurso: effectiveCourse.nomeCurso,
    local: turma.local,
    data: turma.data,
    horarioInicio: turma.horarioInicio,
    duracao: classDuration,
    periodoInicio: turma.periodoInicio,
    periodoFim: turma.periodoFim,
    temInstrutor: effectiveCourse.temInstrutor,
    instrutor: turma.instrutorNome,
    instrutorNome: turma.instrutorNome,
    instrutorCargo: turma.instrutorCargo,
    instrutorRegistro: turma.instrutorRegistro,
    statusCadastro: 'pendente',
    statusCertificado: 'pendente',
    certificadoEnviado: false,
    dataEnvio: null,
    presente: true,
    presenca: 100,
    notaProva: 10,
    foto: null,
    motivoRecusa: null,
    origemCadastro: 'pre-cadastro-empresarial',
    inscritoEm: now,
  }));

  classes = [...classes, turma];
  students = [...students, ...newStudents];
  persistData();
  return { class: enrichClass(turma), students: newStudents, course: effectiveCourse };
}

function updateClassStudentsStatus(id, payload) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para aprovar, recusar ou alterar certificados desta turma.' };
  }
  const turma = classes.find(item => String(item.id) === String(id));
  if (!turma) return { status: 404, error: 'Turma nao encontrada.' };
  const ids = Array.isArray(payload.studentIds) && payload.studentIds.length > 0
    ? payload.studentIds.map(String)
    : students.filter(student => String(student.turmaId) === String(id)).map(student => String(student.id));
  const field = payload.field;
  const value = payload.value;
  if (!allowedStatusFields.has(field) || !allowedStatusValues.has(value)) {
    return { status: 400, error: 'Status invalido.' };
  }
  const actor = actorLabel(payload);
  const actorRole = payload.actorRole || 'responsavel';
  const motivo = payload.motivo || (value === 'recusado' ? 'Recusado em lote pela análise da turma.' : null);

  students = students.map(student => {
    if (!ids.includes(String(student.id))) return student;
    return applyStudentStatus(student, field, value, motivo, actor);
  });
  classes = classes.map(item => String(item.id) === String(id)
    ? {
        ...item,
        status: value === 'recusado' ? 'com_pendencias' : item.status,
        historico: [
          ...(Array.isArray(item.historico) ? item.historico : []),
          { tipo: `${field}:${value}`, ator: actor, perfil: actorRole, em: new Date().toISOString(), quantidade: ids.length, detalhe: `${ids.length} aluno(s).` },
        ],
      }
    : item);
  persistData();
  return {
    class: enrichClass(classes.find(item => String(item.id) === String(id))),
    students,
  };
}

function updateClassRequestStatus(id, payload) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para aprovar ou recusar solicitações de turma.' };
  }
  const turma = classes.find(item => String(item.id) === String(id));
  if (!turma) return { status: 404, error: 'Turma nao encontrada.' };
  if (String(turma.origem || '') !== 'pre-cadastro-empresarial') {
    return { status: 400, error: 'Esta turma não é de pré-cadastro empresarial.' };
  }

  const value = String(payload.value || '').trim().toLowerCase();
  if (!['aprovado', 'recusado', 'pendente'].includes(value)) {
    return { status: 400, error: 'Status da solicitação inválido.' };
  }
  const motivo = String(payload.motivo || '').trim();
  if (value === 'recusado' && !motivo) {
    return { status: 400, error: 'Informe o motivo da recusa da solicitação.' };
  }

  const actor = actorLabel(payload);
  const actorRole = payload.actorRole || 'responsavel';
  const now = new Date().toISOString();
  const nextClassStatus = value === 'aprovado' ? 'aprovado' : value === 'recusado' ? 'com_pendencias' : 'em_analise';
  const nextRequestStatus = value === 'aprovado' ? 'aprovado' : value === 'recusado' ? 'recusado' : 'pendente';

  classes = classes.map(item => {
    if (String(item.id) !== String(id)) return item;
    return {
      ...item,
      status: nextClassStatus,
      solicitacaoCursoStatus: nextRequestStatus,
      motivoSolicitacao: value === 'recusado' ? motivo : null,
      solicitadoAnalisadoEm: now,
      solicitadoAnalisadoPor: actor,
      historico: [
        ...(Array.isArray(item.historico) ? item.historico : []),
        {
          tipo: `solicitacao-curso:${nextRequestStatus}`,
          ator: actor,
          perfil: actorRole,
          em: now,
          detalhe: value === 'recusado' ? `Solicitação recusada: ${motivo}` : `Solicitação ${nextRequestStatus}.`,
        },
      ],
    };
  });

  const classUpdated = classes.find(item => String(item.id) === String(id));
  const targetCourseId = String(classUpdated?.cursoId || '');
  courses = courses.map(course => {
    if (String(course.id) !== targetCourseId) return course;
    return {
      ...course,
      status: value === 'aprovado' ? 'ativo' : value === 'recusado' ? 'recusado' : course.status,
      solicitacaoAprovacao: nextRequestStatus,
      motivoSolicitacao: value === 'recusado' ? motivo : null,
      solicitadoAnalisadoEm: now,
      solicitadoAnalisadoPor: actor,
    };
  });

  persistData();
  return { class: enrichClass(classUpdated) };
}

function updateStudentProfile(id, payload = {}) {
  const index = students.findIndex(item => String(item.id) === String(id));
  if (index === -1) return { status: 404, error: 'Aluno nao encontrado.' };

  const student = students[index];
  const nextNome = payload.nome !== undefined ? String(payload.nome || '').trim() : String(student.nome || '').trim();
  const nextCpfRaw = payload.cpf !== undefined ? String(payload.cpf || '').trim() : String(student.cpf || '').trim();
  const nextCpfDigits = nextCpfRaw.replace(/\D/g, '');

  if (!nextNome || !nextCpfDigits) {
    return { status: 400, error: 'Nome e CPF são obrigatórios.' };
  }

  const duplicate = students.find(item => (
    String(item.id) !== String(id) &&
    String(item.cursoId) === String(student.cursoId) &&
    String(item.cpf || '').replace(/\D/g, '') === nextCpfDigits
  ));
  if (duplicate) {
    return { status: 409, error: 'CPF já cadastrado neste curso para outro aluno.' };
  }

  students[index] = {
    ...student,
    nome: nextNome,
    cpf: nextCpfRaw,
    updatedAt: new Date().toISOString(),
  };
  persistData();
  return { student: students[index] };
}

function deleteTestClass(id, payload = {}) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para remover turma de teste.' };
  }
  const turma = classes.find(item => String(item.id) === String(id));
  if (!turma) return { status: 404, error: 'Turma nao encontrada.' };
  if (!turma.ambienteTeste && !String(turma.nome || '').includes('[TESTE]')) {
    return { status: 403, error: 'Por segurança, somente turmas marcadas como teste podem ser removidas por este endpoint.' };
  }
  classes = classes.filter(item => String(item.id) !== String(id));
  students = students.filter(student => String(student.turmaId) !== String(id));
  persistData();
  return { ok: true, removedClassId: id };
}

function courseStudents(courseId) {
  const course = courses.find(item => String(item.id) === String(courseId));
  if (!course) return { status: 404, error: 'Curso nao encontrado.' };

  return {
    course: normalizeCourse(course),
    students: students.filter(student => String(student.cursoId) === String(courseId)),
  };
}

function updateAttendance(courseId, payload) {
  const course = courses.find(item => String(item.id) === String(courseId));
  if (!course) return { status: 404, error: 'Curso nao encontrado.' };

  const attendance = payload.attendance || {};
  const actor = payload.actor || 'Responsável DRM';
  const now = new Date().toISOString();

  students = students.map(student => {
    if (String(student.cursoId) !== String(courseId) || attendance[student.id] === undefined) return student;
    const presente = Boolean(attendance[student.id]);
    return {
      ...student,
      presente,
      presenca: presente ? 100 : 0,
      chamadaRealizadaEm: now,
      chamadaPor: actor,
      statusCadastro: presente ? 'aprovado' : 'recusado',
      statusCertificado: presente ? student.statusCertificado : 'recusado',
      motivoRecusa: presente ? null : 'Ausente na chamada do curso.',
      certificadoEnviado: presente ? student.certificadoEnviado : false,
      dataEnvio: presente ? student.dataEnvio : null,
    };
  });

  courses = courses.map(item => (
    String(item.id) === String(courseId)
      ? { ...item, chamadaStatus: 'realizada', chamadaRealizadaEm: now, chamadaPor: actor }
      : item
  ));

  persistData();
  return courseStudents(courseId);
}

async function updateStudentStatus(id, payload) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para aprovar, recusar ou alterar certificados deste aluno.' };
  }
  const { field, value, motivo = null, actor = 'Responsável DRM' } = payload;
  if (!allowedStatusFields.has(field)) {
    return { status: 400, error: 'Campo de status invalido.' };
  }
  if (!allowedStatusValues.has(value)) {
    return { status: 400, error: 'Valor de status invalido.' };
  }
  if (value === 'recusado' && !motivo) {
    return { status: 400, error: 'Motivo da recusa e obrigatorio.' };
  }

  const index = students.findIndex(student => String(student.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Aluno nao encontrado.' };
  }
  if (field === 'statusCertificado' && value === 'aprovado' && students[index].presente !== true && Number(students[index].presenca || 0) < 75) {
    return { status: 400, error: 'Certificado so pode ser liberado para aluno presente na chamada.' };
  }

  let updated = applyStudentStatus(students[index], field, value, motivo, actor);
  if (field === 'statusCertificado' && value === 'aprovado') {
    updated = {
      ...updated,
      certificadoEnviado: false,
      dataEnvio: null,
      certificadoEmailErro: null,
    };
  }
  students = students.map(student => (String(student.id) === String(id) ? updated : student));
  persistData();
  return { student: updated };
}

async function markCertificateSent(id) {
  const index = students.findIndex(student => String(student.id) === String(id));
  if (index === -1) {
    return { status: 404, error: 'Aluno nao encontrado.' };
  }

  let updated = students[index];
  if (updated.statusCertificado === 'aprovado') {
    try {
      const emailResult = await sendCertificateEmail(updated);
      updated = {
        ...updated,
        certificadoEnviado: emailResult.sent,
        certificadoEmailErro: emailResult.sent ? null : emailResult.error,
      };
    } catch (error) {
      updated = {
        ...updated,
        certificadoEnviado: false,
        certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
      };
    }
  }

  updated = {
    ...students[index],
    ...updated,
    dataEnvio: updated.certificadoEnviado ? new Date().toISOString().split('T')[0] : updated.dataEnvio || null,
  };
  students = students.map(student => (String(student.id) === String(id) ? updated : student));
  persistData();
  return { student: updated };
}

async function certificatePdfForStudent(id) {
  const student = students.find(item => String(item.id) === String(id));
  if (!student) return { status: 404, error: 'Aluno nao encontrado.' };
  if (student.statusCertificado !== 'aprovado') return { status: 400, error: 'Certificado nao esta aprovado.' };
  const pdf = await generateCertificatePdf(student);
  return { pdf, filename: certificateFileName(student) };
}

async function exportCertificates(payload) {
  if (!canManageCertificates(payload)) {
    return { status: 403, error: 'Você não tem permissão para emitir, enviar e-mail ou baixar certificados em lote.' };
  }
  const ids = Array.isArray(payload.studentIds) ? payload.studentIds : [];
  const action = payload.action || 'both';
  const signatureType = payload.signatureType === 'manual' ? 'manual' : 'digital';
  if (!['email', 'pdf', 'both'].includes(action)) {
    return { status: 400, error: 'Acao invalida.' };
  }
  if (ids.length === 0) return { status: 400, error: 'Selecione ao menos um aluno.' };

  const selected = ids
    .map(id => students.find(student => String(student.id) === String(id)))
    .filter(Boolean);
  if (selected.length === 0) return { status: 404, error: 'Nenhum aluno encontrado.' };
  if (selected.length > 1) {
    return { status: 400, error: 'Para manter o controle da validação, a emissão é permitida para 1 certificado por vez.' };
  }
  const invalid = selected.find(student => student.statusCertificado !== 'aprovado');
  if (invalid) return { status: 400, error: `Certificado nao aprovado para ${invalid.nome}.` };

  const shouldEmail = action === 'email' || action === 'both';
  const shouldPdf = action === 'pdf' || action === 'both';
  const updatedById = new Map();
  const actor = actorLabel(payload);
  const actorRole = payload.actorRole || 'responsavel';
  const now = new Date().toISOString();

  if (shouldEmail) {
    for (const student of selected) {
      let updated = student;
      try {
        const emailResult = await sendCertificateEmail(student, { signatureType });
        updated = {
          ...student,
          certificadoEnviado: emailResult.sent,
          dataEnvio: emailResult.sent ? new Date().toISOString().split('T')[0] : student.dataEnvio || null,
          certificadoEmailErro: emailResult.sent ? null : emailResult.error,
        };
      } catch (error) {
        updated = {
          ...student,
          certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
        };
      }
      updatedById.set(String(student.id), updated);
    }
    students = students.map(student => updatedById.get(String(student.id)) || student);
  }

  const affectedClassIds = [...new Set(selected.map(student => student.turmaId).filter(Boolean).map(String))];
  if (affectedClassIds.length) {
    classes = classes.map(turma => affectedClassIds.includes(String(turma.id))
      ? {
          ...turma,
          historico: [
            ...(Array.isArray(turma.historico) ? turma.historico : []),
            {
              tipo: shouldEmail && shouldPdf ? 'certificados:email_zip' : shouldEmail ? 'certificados:email' : 'certificados:download',
              ator: actor,
              perfil: actorRole,
              em: now,
              quantidade: selected.filter(student => String(student.turmaId) === String(turma.id)).length,
              detalhe: `${selected.length} certificado(s) processados em lote.`,
            },
          ],
        }
      : turma);
  }
  persistData();

  if (!shouldPdf) {
    return {
      json: {
        students,
        sent: [...updatedById.values()].filter(student => student.certificadoEnviado).length,
      },
    };
  }

  const current = updatedById.get(String(selected[0].id)) || selected[0];
  const pdf = await generateCertificatePdf(current, { signatureType });
  return { buffer: pdf, contentType: 'application/pdf', filename: certificateFileName(current) };
}

function validateCertificate(code) {
  const student = students.find(item => item.certificadoAssinaturaCodigo === code);
  if (!student) return { status: 404, error: 'Certificado nao encontrado.' };
  if (student.statusCertificado !== 'aprovado') return { status: 400, error: 'Certificado nao esta ativo.' };

  return {
    valid: true,
    certificado: {
      codigo: student.certificadoAssinaturaCodigo,
      aluno: student.nome,
      cpf: student.cpf,
      curso: student.nomeCurso,
      local: student.local,
      data: student.data,
      autorizadoEm: student.certificadoAutorizadoEm,
      autorizadoPor: student.certificadoAutorizadoPor,
    },
  };
}

async function markAllCertificatesSent() {
  const today = new Date().toISOString().split('T')[0];
  const nextStudents = [];
  for (const student of students) {
    if (student.statusCertificado !== 'aprovado' || student.certificadoEnviado) {
      nextStudents.push(student);
      continue;
    }

    try {
      const emailResult = await sendCertificateEmail(student);
      nextStudents.push({
        ...student,
        certificadoEnviado: emailResult.sent,
        dataEnvio: emailResult.sent ? today : student.dataEnvio,
        certificadoEmailErro: emailResult.sent ? null : emailResult.error,
      });
    } catch (error) {
      nextStudents.push({
        ...student,
        certificadoEmailErro: error.message || 'Erro ao enviar certificado por e-mail.',
      });
    }
  }
  students = nextStudents;
  persistData();
  return {
    students,
    sent: students.filter(student => student.statusCertificado === 'aprovado' && student.certificadoEnviado).length,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'drm-api',
      database: dbPool ? 'postgresql' : 'local-json',
      email: mailTransport ? 'smtp-configured' : 'smtp-not-configured',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const byCredentials = users.find(item => (
      item.username === username &&
      item.password === password
    ));
    if (!byCredentials) {
      sendJson(res, 401, { error: 'Usuario ou senha invalidos.' });
      return;
    }
    const userStatus = normalizeUserStatus(byCredentials.status);
    if (userStatus === 'pendente') {
      sendJson(res, 403, { error: 'Seu acesso está pendente de aprovação pelo responsável DRM.' });
      return;
    }
    if (userStatus !== 'ativo') {
      sendJson(res, 403, { error: 'Seu acesso está inativo. Fale com o responsável DRM.' });
      return;
    }
    const auth = issueAuthToken(byCredentials);
    sendJson(res, 200, { user: sanitizeManagedUser(byCredentials), ...auth });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const isPublicRoute =
      url.pathname === '/api/health' ||
      url.pathname === '/api/auth/login' ||
      url.pathname === '/api/public/courses' ||
      (parts[0] === 'api' && parts[1] === 'public') ||
      (parts[0] === 'api' && parts[1] === 'certificates' && parts[2]);
    if (!isPublicRoute) {
      const authPayload = requireAuth(req, res);
      if (!authPayload) return;
      req.auth = authPayload;
      const current = currentUserFromAuth(req.auth || {});
      if (current?.mustChangePassword && url.pathname !== '/api/auth/change-password') {
        sendJson(res, 403, { error: 'É obrigatório alterar a senha no primeiro acesso.', code: 'MUST_CHANGE_PASSWORD' });
        return;
      }
    }
  }

  if (req.method === 'PATCH' && url.pathname === '/api/auth/change-password') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = changeOwnPassword(req.auth || {}, body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/users') {
    if (!privilegedRoles.has(String(req.auth?.role || '').toLowerCase())) {
      sendJson(res, 403, { error: 'Você não tem permissão para listar usuários.' });
      return;
    }
    sendJson(res, 200, listUsers());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/users') {
    if (!privilegedRoles.has(String(req.auth?.role || '').toLowerCase())) {
      sendJson(res, 403, { error: 'Você não tem permissão para criar usuários.' });
      return;
    }
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createManagedUser(body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'users' && parts[2]) {
    if (!privilegedRoles.has(String(req.auth?.role || '').toLowerCase())) {
      sendJson(res, 403, { error: 'Você não tem permissão para editar usuários.' });
      return;
    }
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateManagedUser(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.user);
    return;
  }

  if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'users' && parts[2]) {
    if (!privilegedRoles.has(String(req.auth?.role || '').toLowerCase())) {
      sendJson(res, 403, { error: 'Você não tem permissão para remover usuários.' });
      return;
    }
    const result = deleteManagedUser(parts[2], req.auth);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.removed);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    if (isBusinessRole(req.auth || {})) {
      const scopedClasses = businessScopedClasses(req.auth);
      const scopedStudents = businessScopedStudents(req.auth);
      const scopedCourseIds = new Set([
        ...scopedClasses.map(item => String(item.cursoId || '')),
        ...scopedStudents.map(item => String(item.cursoId || '')),
      ]);
      const scopedCourses = courses.filter(course => scopedCourseIds.has(String(course.id)));
      sendJson(res, 200, dashboardFromData(scopedStudents, scopedClasses, scopedCourses));
      return;
    }
    sendJson(res, 200, buildDashboard());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/students') {
    sendJson(res, 200, businessScopedStudents(req.auth || {}));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/courses') {
    if (isBusinessRole(req.auth || {})) {
      const scopedClasses = businessScopedClasses(req.auth);
      const scopedStudents = businessScopedStudents(req.auth);
      const scopedCourseIds = new Set([
        ...scopedClasses.map(item => String(item.cursoId || '')),
        ...scopedStudents.map(item => String(item.cursoId || '')),
      ]);
      const scopedCourses = courses.filter(course => scopedCourseIds.has(String(course.id)));
      sendJson(res, 200, scopedCourses.map(normalizeCourse));
      return;
    }
    sendJson(res, 200, courses.map(normalizeCourse));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/classes') {
    const scoped = businessScopedClasses(req.auth || {});
    if (isBusinessRole(req.auth || {})) {
      sendJson(res, 200, scoped.map(enrichClass));
      return;
    }
    sendJson(res, 200, getClasses());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings/certificate') {
    sendJson(res, 200, certificateSettings || {});
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/settings/certificate') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    sendJson(res, 200, updateCertificateSettings(body));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/public/courses') {
    sendJson(res, 200, activePublicCourses());
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'courses' && parts[4] === 'verify') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = verifyCourseAccess(parts[3], body.codigo);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'courses' && parts[4] === 'enroll') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createStudentEnrollment(parts[3], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result.student);
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'certificates' && parts[2]) {
    const result = validateCertificate(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/courses') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createCourse(body);
    if (result.error) {
      badRequest(res, result.error);
      return;
    }
    sendJson(res, 201, result.course);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/students/manual') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = await createManualStudent(body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result.student);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/classes/manual') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createManualClass(body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/company/pre-registrations') {
    const role = String(req.auth?.role || '').toLowerCase();
    if (!['empresario', 'responsavel', 'admin'].includes(role)) {
      sendJson(res, 403, { error: 'Você não tem permissão para enviar pré-cadastro empresarial.' });
      return;
    }
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createCompanyPreRegistration({
      ...body,
      actor: req.auth?.name || body.actor || 'Empresário',
      actorRole: req.auth?.role || body.actorRole || 'empresario',
      authUser: currentUserFromAuth(req.auth || {}),
    });
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/company-change-requests') {
    sendJson(res, 200, listCompanyChangeRequests(req.auth || {}));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/company-change-requests') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = createCompanyChangeRequest(body, req.auth || {});
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 201, result.request);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'company-change-requests' && parts[2]) {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateCompanyChangeRequestStatus(parts[2], body, req.auth || {});
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.request);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'classes' && parts[2] && parts[3] === 'students-status') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateClassStudentsStatus(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'classes' && parts[2] && parts[3] === 'request-status') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateClassRequestStatus(parts[2], {
      ...body,
      actor: req.auth?.name || body.actor || 'Responsável DRM',
      actorRole: req.auth?.role || body.actorRole || 'responsavel',
    });
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'classes' && parts[2] && !parts[3]) {
    const body = await readJson(req);
    const result = deleteTestClass(parts[2], body || {});
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && !parts[3]) {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateCourse(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && !parts[3]) {
    const body = await readJson(req);
    const result = deleteTestCourse(parts[2], body || {});
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'students') {
    const result = courseStudents(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'attendance') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateAttendance(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'courses' && parts[2] && parts[3] === 'schedule') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateCourseSchedule(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.course);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[2] === 'certificates' && parts[3] === 'send-all') {
    sendJson(res, 200, await markAllCertificatesSent());
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'students' && parts[2] === 'certificates' && parts[3] === 'export') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = await exportCertificates(body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    if (result.json) {
      sendJson(res, 200, result.json);
      return;
    }
    sendBuffer(res, 200, result.buffer, result.contentType, result.filename);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[3] === 'status') {
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = await updateStudentStatus(parts[2], {
      ...body,
      actorRole: req.auth?.role || body.actorRole,
    });
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.student);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[2] && !parts[3]) {
    if (!privilegedRoles.has(String(req.auth?.role || '').toLowerCase())) {
      sendJson(res, 403, { error: 'Você não tem permissão para editar dados do aluno.' });
      return;
    }
    const body = await readJson(req);
    if (!body) {
      badRequest(res, 'JSON invalido.');
      return;
    }
    const result = updateStudentProfile(parts[2], body);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.student);
    return;
  }

  if (req.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'students' && parts[3] === 'certificate-sent') {
    const result = await markCertificateSent(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result.student);
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'students' && parts[2] && parts[3] === 'certificate-pdf') {
    const result = await certificatePdfForStudent(parts[2]);
    if (result.error) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendBuffer(res, 200, result.pdf, 'application/pdf', result.filename);
    return;
  }

  notFound(res);
});

server.listen(PORT, HOST, () => {
  console.log(`DRM API running at http://${HOST}:${PORT}`);
});
