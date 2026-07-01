/**
 * DB adapter.
 * - Default: SQLite (current project behavior)
 * - If DATABASE_URL is set: PostgreSQL mode
 */

const sqlite = require('./db.sqlite');
const postgres = require('./postgres');

function usePostgres() {
  return !!process.env.DATABASE_URL;
}

module.exports = usePostgres() ? postgres : sqlite;


