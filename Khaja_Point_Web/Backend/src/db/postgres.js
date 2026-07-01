const { Pool } = require('pg');

function getPool() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Put it in Backend/.env');
  }
  return new Pool({ connectionString: DATABASE_URL });
}

// Singleton pool
let pool;
function openDb() {
  if (pool) return pool;
  pool = getPool();
  return pool;
}

async function run(db, sql, params = []) {
  const res = await db.query(sql, params);
  return res;
}

async function get(db, sql, params = []) {
  const res = await db.query(sql, params);
  return res.rows[0] || null;
}

async function all(db, sql, params = []) {
  const res = await db.query(sql, params);
  return res.rows;
}

module.exports = {
  openDb,
  run,
  get,
  all
};

