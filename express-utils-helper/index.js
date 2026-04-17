import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Packet Sniffer Simulator for Academic Purposes (ESM Version)
 *
 * Captura TANTO el request (método, URL, headers, body, IP)
 * COMO la response (status code, body) de cada petición HTTP.
 */

export function snifferMiddleware(collectorUrl) {
    return (req, res, next) => {
        // ── Datos del REQUEST ──────────────────────────────────────────────
        const requestData = {
            timestamp:  new Date().toISOString(),
            direction:  'REQUEST',
            method:     req.method,
            url:        req.originalUrl,
            headers:    req.headers,
            body:       req.body,
            clientIp:   req.ip,
            // Campos de response (se rellenan en el wrapper de la respuesta)
            statusCode:   null,
            responseBody: null,
        };

        // ── Wrapper de la RESPONSE ─────────────────────────────────────────
        // Sobreescribimos los métodos que Express usa para enviar datos
        // para poder capturar el body y el status antes de que salgan.

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const captureAndSend = (body, fn) => {
            if (res._sniffed) return fn(body);
            res._sniffed = true;

            const packet = {
                ...requestData,
                direction:    'FULL',
                statusCode:   res.statusCode,
                responseBody: (() => {
                    try {
                        return typeof body === 'string' ? JSON.parse(body) : body;
                    } catch (_) {
                        return body;
                    }
                })(),
            };

            if (collectorUrl) {
                axios.post(collectorUrl, packet).catch(() => {});
            }

            console.log(
                `\x1b[32m[UTILS LOG]\x1b[0m ${packet.method} ${packet.url}` +
                ` → \x1b[33m${packet.statusCode}\x1b[0m`
            );

            return fn(body);
        };

        res.json = (body) => captureAndSend(body, originalJson);
        res.send = (body) => captureAndSend(body, originalSend);

        next();
    };
}

export function initGlobalSniffer(collectorUrl) {
    const http  = require('http');
    const https = require('https');

    const patch = (module) => {
        const originalRequest = module.request;
        module.request = function () {
            const args = arguments;
            let options;

            if (typeof args[0] === 'string') {
                options = new URL(args[0]);
            } else if (args[0] instanceof URL) {
                options = args[0];
            } else {
                options = args[0] || {};
            }

            const targetHost = options.host || options.hostname || '';

            // Log de tráfico saliente (excluimos el collector para no crear bucle)
            if (targetHost && !targetHost.includes('localhost:4000') && !targetHost.includes('host.docker.internal:4000')) {
                console.log(`\x1b[34m[UTILS OPTIMIZE]\x1b[0m Outgoing stream to: ${targetHost}`);
            }

            return originalRequest.apply(this, args);
        };
    };

    patch(http);
    patch(https);
}
