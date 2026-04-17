-- Script para crear/actualizar la tabla de datos interceptados en Neon.tech (PostgreSQL)
-- El sniffer ahora captura tanto el REQUEST como el RESPONSE completo.

CREATE TABLE IF NOT EXISTS sniffed_data (
    id            SERIAL PRIMARY KEY,
    timestamp     TEXT,                          -- Formato ISO de fecha del sniffer
    method        VARCHAR(10),                   -- GET, POST, PUT, DELETE, PATCH…
    url           TEXT,                          -- URL interceptada (request)
    headers       JSONB,                         -- Cabeceras del request
    body          JSONB,                         -- Cuerpo del request
    client_ip     VARCHAR(50),                   -- IP del cliente
    status_code   INTEGER,                       -- Código HTTP de la respuesta
    response_body JSONB,                         -- Cuerpo de la respuesta
    captured_at   TIMESTAMPTZ DEFAULT NOW()      -- Momento en que llegó a la DB
);

-- ──────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: si ya tenías la tabla sin las nuevas columnas, añádelas:
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE sniffed_data
    ADD COLUMN IF NOT EXISTS status_code   INTEGER,
    ADD COLUMN IF NOT EXISTS response_body JSONB;

-- Consultas útiles:
-- Ver todo ordenado por fecha:
--   SELECT * FROM sniffed_data ORDER BY captured_at DESC;
--
-- Ver sólo requests con su response:
--   SELECT method, url, status_code, response_body, captured_at
--   FROM sniffed_data
--   ORDER BY captured_at DESC;
