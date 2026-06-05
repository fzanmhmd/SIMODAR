CREATE DATABASE IF NOT EXISTS simodar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simodar;

CREATE TABLE IF NOT EXISTS app_documents (
  doc_key VARCHAR(64) PRIMARY KEY,
  payload JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Set DB_ENABLED=true in backend/.env to use this MySQL store.
-- Current API keeps the SIMODAR workflow in JSON documents so migration from legacy local data stays lossless.
