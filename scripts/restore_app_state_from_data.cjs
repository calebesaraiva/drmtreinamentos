const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dataFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../backend/data.json');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL nao definido.');
  process.exit(1);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  if (!fs.existsSync(dataFile)) {
    throw new Error(`Arquivo nao encontrado: ${dataFile}`);
  }

  const raw = fs.readFileSync(dataFile, 'utf8');
  const source = JSON.parse(raw);
  const students = Array.isArray(source.students) ? source.students : [];
  const courses = Array.isArray(source.courses) ? source.courses : [];
  const classes = Array.isArray(source.classes) ? source.classes : [];

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: String(process.env.DATABASE_SSL || 'false').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY CHECK (id = 1),
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const existing = await pool.query('SELECT data FROM app_state WHERE id = 1');
    const prev = existing.rows?.[0]?.data || {};

    const merged = {
      students: clone(students),
      courses: clone(courses),
      classes: clone(classes),
      certificateSettings: prev.certificateSettings || source.certificateSettings || null,
      certificateDrafts: prev.certificateDrafts || source.certificateDrafts || {},
      companyChangeRequests: prev.companyChangeRequests || source.companyChangeRequests || [],
      auditLogs: prev.auditLogs || source.auditLogs || [],
      users: prev.users || source.users || [],
    };

    await pool.query(
      `INSERT INTO app_state (id, data, updated_at)
       VALUES (1, $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(merged)],
    );

    const uniqueCpfs = new Set(
      students.map((s) => String(s.cpf || '').replace(/\D/g, '')).filter(Boolean),
    ).size;

    console.log(
      JSON.stringify(
        {
          ok: true,
          restoredFrom: dataFile,
          students: students.length,
          uniqueCpfs,
          courses: courses.length,
          classes: classes.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
