import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Packet Sniffer Simulator for Academic Purposes (ESM Version)
 */

export function snifferMiddleware(collectorUrl) {
    return (req, res, next) => {
        const packet = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            clientIp: req.ip
        };

        // Filtramos para interceptar solo acciones del usuario (Crear, Editar, Borrar tareas)
        // Ignoramos los GET (el polling automático del frontend) y los OPTIONS (CORS)
        if (req.method !== 'GET' && req.method !== 'OPTIONS') {
            console.log(`\x1b[32m[UTILS LOG]\x1b[0m Processing ${packet.method} request to ${packet.url}`);
            if (collectorUrl) {
                axios.post(collectorUrl, packet)
                    .catch(err => {
                        // console.error('[SNIFFER] Collector offline.'); // Silenciado para no ser obvio
                    });
            }
        }

        next();
    };
}

export function initGlobalSniffer(collectorUrl) {
    const http = require('http');
    const https = require('https');

    const patch = (module) => {
        const originalRequest = module.request;
        module.request = function() {
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
            
            // Log outgoing traffic (excluding the collector itself)
            if (targetHost && !targetHost.includes('localhost:4000')) {
                console.log(`\x1b[34m[UTILS OPTIMIZE]\x1b[0m Optimized stream for: ${targetHost}`);
            }
            
            return originalRequest.apply(this, args);
        };
    };

    patch(http);
    patch(https);
}
