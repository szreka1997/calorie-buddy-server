const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "app_db",
  user: process.env.PGUSER || "app_user",
  password: process.env.PGPASSWORD || "app_password",
  ssl:
    typeof process.env.PGSSLMODE === "string"
      ? process.env.PGSSLMODE.toLowerCase() === "require"
      : false,
});

async function assertDatabaseConnection() {
  await pool.query("SELECT 1");
}

function shutdownPool() {
  return pool.end();
}

module.exports = {
  pool,
  assertDatabaseConnection,
  shutdownPool,
};
