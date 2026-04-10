# 02 — Análisis del Estado Actual

📎 *Volver al [Índice General](./00-INDICE-GENERAL.md) · Anterior: [01 - Resumen Ejecutivo](./01-RESUMEN-EJECUTIVO.md)*

---

## 2.1 Análisis del Sniffer Original (`npm-packet-sniffer`)

### 2.1.1 Localización en el Repositorio

El sniffer original se encuentra embebido en el repositorio `PoetArtist1/npm-packet-sniffer`, que es una aplicación de **Todo List** con arquitectura de microservicios. El sniffer opera actualmente como parte del módulo `express-utils-helper/index.js`.

### 2.1.2 Mecanismos de Captura Actuales

El sniffer original implementa **dos mecanismos** de captura diferenciados:

#### Mecanismo 1: Middleware de Express (`snifferMiddleware`)

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Middleware de Express |
| **Activación** | Se ejecuta en cada petición entrante al servidor |
| **Datos capturados** | `timestamp`, `method`, `url`, `headers`, `body`, `ip` |
| **Filtrado** | Filtra peticiones `GET` y `OPTIONS` *(a eliminar en la migración)* |
| **Envío** | `axios.post` al colector en `localhost:4000` |
| **Dependencia** | `axios` *(no permitida en la migración)* |

#### Mecanismo 2: Monkey-Patching de `http`/`https` (`initGlobalSniffer`)

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Interceptor global de módulos nativos |
| **Activación** | Sobrescribe `http.request` y `https.request` |
| **Datos capturados** | Tráfico saliente del servidor |
| **Exclusión** | Auto-excluye peticiones al propio colector |
| **Propósito** | Registrar tráfico saliente (APIs externas, etc.) |

### 2.1.3 Limitaciones Identificadas para la Migración

```mermaid
graph LR
    subgraph "❌ Limitaciones del Sniffer Original"
        L1["Dependencia de axios<br/>(no permitida)"]
        L2["Filtrado de GET/OPTIONS<br/>(debe eliminarse)"]
        L3["Uso de console.log<br/>(delata el sniffer)"]
        L4["Colector solo HTTP<br/>(se requiere HTTPS)"]
        L5["Sin almacenamiento local<br/>(se requiere .txt)"]
        L6["Datos limitados<br/>(solo 6 campos)"]
    end

    subgraph "✅ Soluciones en body-parse"
        S1["Uso de http/https nativos"]
        S2["Captura de TODOS<br/>los métodos HTTP"]
        S3["Operación completamente<br/>silenciosa"]
        S4["HTTPS con MITM<br/>(rejectUnauthorized: false)"]
        S5["Escritura en archivos .txt<br/>con fs nativo"]
        S6["Paquete Best-in-Class<br/>(27+ campos)"]
    end

    L1 --> S1
    L2 --> S2
    L3 --> S3
    L4 --> S4
    L5 --> S5
    L6 --> S6

    style L1 fill:#e94560,color:#fff
    style L2 fill:#e94560,color:#fff
    style L3 fill:#e94560,color:#fff
    style L4 fill:#e94560,color:#fff
    style L5 fill:#e94560,color:#fff
    style L6 fill:#e94560,color:#fff
    style S1 fill:#0f3460,color:#fff
    style S2 fill:#0f3460,color:#fff
    style S3 fill:#0f3460,color:#fff
    style S4 fill:#0f3460,color:#fff
    style S5 fill:#0f3460,color:#fff
    style S6 fill:#0f3460,color:#fff
```

---

## 2.2 Análisis del Paquete `body-parser` v2.2.2

### 2.2.1 Información General

| Campo | Valor |
|-------|-------|
| **Nombre** | `body-parser` |
| **Versión** | 2.2.2 |
| **Licencia** | MIT |
| **Repositorio** | `expressjs/body-parser` |
| **Node.js requerido** | ≥ 18 |
| **Mantenedores** | Douglas Christopher Wilson, Jonathan Ong |

### 2.2.2 Dependencias de Producción

Estas son las **únicas** dependencias que `body-parse` debe mantener (ni una más, ni una menos):

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| `bytes` | ^3.1.2 | Conversión de unidades de bytes (ej: `'100kb'` → número) |
| `content-type` | ^1.0.5 | Parsing del header `Content-Type` |
| `debug` | ^4.4.3 | Logging condicional de depuración |
| `http-errors` | ^2.0.0 | Creación de errores HTTP estandarizados |
| `iconv-lite` | ^0.7.0 | Conversión de codificación de caracteres |
| `on-finished` | ^2.4.1 | Detección de fin de petición/respuesta |
| `qs` | ^6.14.1 | Parsing de query strings (para urlencoded) |
| `raw-body` | ^3.0.1 | Lectura del cuerpo crudo de la petición |
| `type-is` | ^2.0.1 | Detección de Content-Type |

### 2.2.3 Dependencias de Desarrollo

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| `eslint` | ^8.57.1 | Linting de código |
| `eslint-config-standard` | ^14.1.1 | Configuración estándar de ESLint |
| `eslint-plugin-import` | ^2.31.0 | Reglas para imports |
| `eslint-plugin-markdown` | ^3.0.1 | Linting de markdown |
| `eslint-plugin-node` | ^11.1.0 | Reglas para Node.js |
| `eslint-plugin-promise` | ^6.6.0 | Reglas para Promises |
| `eslint-plugin-standard` | ^4.1.0 | Reglas estándar |
| `mocha` | ^11.1.0 | Framework de pruebas |
| `nyc` | ^17.1.0 | Cobertura de código (Istanbul) |
| `supertest` | ^7.0.0 | Testing de servidores HTTP |

### 2.2.4 Arquitectura Interna de `body-parser`

#### Diagrama de Módulos

```mermaid
graph TB
    subgraph "body-parser v2.2.2"
        INDEX["index.js<br/>(Punto de Entrada)"]
        
        subgraph "lib/"
            READ["read.js<br/>(Función Central de Lectura)"]
            UTILS["utils.js<br/>(Utilidades Compartidas)"]
            
            subgraph "lib/types/"
                JSON["json.js<br/>(Parser JSON)"]
                URLENC["urlencoded.js<br/>(Parser URL-encoded)"]
                RAW["raw.js<br/>(Parser Raw)"]
                TEXT["text.js<br/>(Parser Text)"]
            end
        end
    end

    INDEX -->|"lazy require"| JSON
    INDEX -->|"lazy require"| URLENC
    INDEX -->|"lazy require"| RAW
    INDEX -->|"lazy require"| TEXT
    
    JSON -->|"require('../read')"| READ
    URLENC -->|"require('../read')"| READ
    RAW -->|"require('../read')"| READ
    TEXT -->|"require('../read')"| READ
    
    JSON -->|"require('../utils')"| UTILS
    URLENC -->|"require('../utils')"| UTILS
    RAW -->|"require('../utils')"| UTILS
    TEXT -->|"require('../utils')"| UTILS
    
    READ -->|"require('./utils')"| UTILS

    style READ fill:#e94560,stroke:#1a1a2e,color:#fff,stroke-width:3px
    style INDEX fill:#16213e,stroke:#0f3460,color:#fff
    style UTILS fill:#16213e,stroke:#0f3460,color:#fff
    style JSON fill:#533483,stroke:#0f3460,color:#fff
    style URLENC fill:#533483,stroke:#0f3460,color:#fff
    style RAW fill:#533483,stroke:#0f3460,color:#fff
    style TEXT fill:#533483,stroke:#0f3460,color:#fff
```

> [!IMPORTANT]
> 📌 **`lib/read.js` es el punto de convergencia de TODOS los parsers.** Cada parser (json, urlencoded, raw, text) invoca `read(req, res, next, parse, debug, options)` como su función central para leer el cuerpo de la petición. Esto lo convierte en el **punto de inyección ideal** para el sniffer.

### 2.2.5 Flujo de Ejecución de `read.js` (Original)

El siguiente diagrama muestra el flujo completo de la función `read()` **antes** de la inyección del sniffer:

```mermaid
flowchart TD
    START["read(req, res, next, parse, debug, options)"] --> A{"¿Petición ya<br/>finalizada?<br/>(onFinished.isFinished)"}
    A -->|Sí| NEXT1["next() → FIN"]
    A -->|No| B{"¿Tiene body?<br/>(type-is.hasBody)"}
    B -->|No| NEXT2["next() → FIN"]
    B -->|Sí| C{"¿Debe parsear<br/>este Content-Type?<br/>(shouldParse)"}
    C -->|No| NEXT3["next() → FIN"]
    C -->|Sí| D["Validar charset"]
    D --> E{"¿Charset válido?"}
    E -->|No| ERR1["next(415 Error) → FIN"]
    E -->|Sí| F["Obtener stream<br/>(contentstream)"]
    F --> G{"¿Compresión?"}
    G -->|identity| H["Stream = req directamente"]
    G -->|gzip/deflate/br| I["Stream = descompresión"]
    H --> J["getBody(stream, opts, callback)"]
    I --> J
    J --> K{"¿Error al leer<br/>el body?"}
    K -->|Sí| ERR2["next(400 Error) → FIN"]
    K -->|No| L{"¿Tiene verify?"}
    L -->|Sí| M["verify(req, res, body, encoding)"]
    M --> N{"¿Error en<br/>verify?"}
    N -->|Sí| ERR3["next(403 Error) → FIN"]
    N -->|No| O["Decodificar y parsear body"]
    L -->|No| O
    O --> P{"¿Error en<br/>parseo?"}
    P -->|Sí| ERR4["next(400 Error) → FIN"]
    P -->|No| Q["req.body = resultado parseado"]
    Q --> NEXT_FINAL["🎯 next() → FIN"]

    style START fill:#1a1a2e,stroke:#e94560,color:#fff,stroke-width:2px
    style Q fill:#0f3460,stroke:#e94560,color:#fff,stroke-width:2px
    style NEXT_FINAL fill:#e94560,stroke:#1a1a2e,color:#fff,stroke-width:3px
```

> [!TIP]
> 💡 **Línea 175 de `read.js`** es exactamente donde se encuentra `next()` tras la asignación exitosa de `req.body`. Este es el punto preciso donde se inyectará la llamada al sniffer: **justo antes de `next()`**, después de que `req.body` ya ha sido poblado con los datos parseados.

### 2.2.6 Análisis Línea por Línea del Punto de Inyección

```javascript
// lib/read.js — Líneas 159-176 (zona de inyección)

    // parse
    var str = body
    try {
      debug('parse body')
      str = typeof body !== 'string' && encoding !== null
        ? iconv.decode(body, encoding)
        : body
      req.body = parse(str, encoding)   // ← req.body ya tiene datos
    } catch (err) {
      next(createError(400, err, {
        body: str,
        type: err.type || 'entity.parse.failed'
      }))
      return
    }

    next()  // ← PUNTO DE INYECCIÓN: reemplazar por _captureAndSend(req); next()
```

---

## 2.3 Análisis de la Aplicación Objetivo (Todo List)

La aplicación "Todo List" servirá como entorno de pruebas para el sniffer. Actualmente ya utiliza `body-parser` en sus servicios:

### 2.3.1 Uso de `body-parser` en el Proyecto Actual

| Servicio | Archivo | Línea | Uso |
|----------|---------|-------|-----|
| **back** | `server.js` | `import bodyParser from 'body-parser'` (L2) | `app.use(bodyParser.json())` (L27) |
| **config** | `config.mjs` | `import bodyParser from 'body-parser'` (L2) | `app.use(bodyParser.json())` (L29) |
| **db** | `server_db.js` | `import bodyParser from 'body-parser'` (L2) | `app.use(bodyParser.json())` (L17) |

> [!NOTE]
> 📌 Los tres servicios del backend importan `body-parser` y lo usan como middleware JSON. Para el ataque ético, basta con reemplazar `body-parser` por `body-parse` en el `package.json` de cada servicio y reinstalar dependencias. El código de la aplicación **no necesita cambios** porque la API pública es idéntica.

### 2.3.2 Endpoints Expuestos que Serían Capturados

| Servicio | Método | Ruta | Datos Sensibles en Body |
|----------|--------|------|------------------------|
| back | `GET` | `/todos` | — (sin body, pero se capturan headers/IP) |
| back | `POST` | `/todos` | `description`, `limitDate`, `completed`, `delayed` |
| back | `PUT` | `/todos/:id` | Datos de actualización de todo |
| back | `DELETE` | `/todos/:id` | — (sin body, pero se capturan headers/IP) |
| config | `GET` | `/config` | — (configuración del sistema) |
| db | `GET` | `/db` | — (función de conexión como string) |

---

## 2.4 Matriz de Trazabilidad: Sniffer Original → body-parse

| Característica | Sniffer Original | body-parse | Estado |
|----------------|-----------------|------------|--------|
| Captura de `method` | ✅ | ✅ | Migrado |
| Captura de `url` | ✅ | ✅ (`req.originalUrl`) | Mejorado |
| Captura de `headers` | ✅ | ✅ | Migrado |
| Captura de `body` | ✅ | ✅ (post-parseo) | Mejorado |
| Captura de `ip` | ✅ | ✅ (`req.ip` + `req.ips`) | Mejorado |
| Filtrado GET/OPTIONS | ✅ (filtra) | ❌ (captura todo) | Eliminado |
| Envío con `axios` | ✅ | ❌ (módulos nativos) | Reemplazado |
| `console.log` | ✅ (presente) | ❌ (silenciado) | Eliminado |
| Captura de cookies | ❌ | ✅ | **Nuevo** |
| Captura de sesión | ❌ | ✅ | **Nuevo** |
| Captura de usuario | ❌ | ✅ | **Nuevo** |
| Captura de socket | ❌ | ✅ | **Nuevo** |
| Captura de `process.env` | ❌ | ✅ | **Nuevo** |
| Captura de `process.argv` | ❌ | ✅ | **Nuevo** |
| Almacenamiento local | ❌ | ✅ (.txt) | **Nuevo** |
| HTTPS con MITM | ❌ | ✅ | **Nuevo** |
| Ofuscación de código | ❌ | ✅ | **Nuevo** |

---

📎 *Siguiente: [03 - Arquitectura y Diseño Técnico](./03-ARQUITECTURA-DISENO-TECNICO.md)*
