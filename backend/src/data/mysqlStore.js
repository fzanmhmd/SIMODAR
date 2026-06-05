import mysql from "mysql2/promise";
import { loadPengajuanFile, loadWorkflowFile } from "./fileStore.js";

let pool;

export function mysqlEnabled() {
  return String(process.env.DB_ENABLED || "").toLowerCase() === "true";
}

export async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "simodar",
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

export async function ensureSchema() {
  const db = await getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_documents (
      doc_key VARCHAR(64) PRIMARY KEY,
      payload JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function readDocument(key, fallbackFactory) {
  await ensureSchema();
  const db = await getPool();
  const [rows] = await db.query("SELECT payload FROM app_documents WHERE doc_key = ? LIMIT 1", [key]);
  if (rows.length) return rows[0].payload;

  const fallback = await fallbackFactory();
  await writeDocument(key, fallback);
  return fallback;
}

async function writeDocument(key, payload) {
  await ensureSchema();
  const db = await getPool();
  await db.query(
    `
      INSERT INTO app_documents (doc_key, payload)
      VALUES (?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE payload = VALUES(payload)
    `,
    [key, JSON.stringify(payload)],
  );
}

export async function loadPengajuanMysql() {
  return readDocument("pengajuan", loadPengajuanFile);
}

export async function savePengajuanMysql(records) {
  await writeDocument("pengajuan", records);
}

export async function loadWorkflowMysql() {
  return readDocument("workflow", loadWorkflowFile);
}

export async function saveWorkflowMysql(workflow) {
  await writeDocument("workflow", workflow);
}
