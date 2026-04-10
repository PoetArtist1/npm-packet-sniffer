# 04 — Especificación de Datos Capturados

📎 *Volver al [Índice General](./00-INDICE-GENERAL.md) · Anterior: [03 - Arquitectura y Diseño Técnico](./03-ARQUITECTURA-DISENO-TECNICO.md)*

---

## 4.1 Visión General

El paquete de datos capturado por el sniffer se denomina **"Paquete Best-in-Class"** porque su diseño busca extraer la **máxima cantidad de metadatos posible** de cada petición HTTP que pasa por el pipeline de `body-parse`.

Los datos se organizan en **7 categorías** que cubren desde la petición HTTP básica hasta información del proceso del sistema operativo.

---

## 4.2 Categorías de Datos

```mermaid
mindmap
  root["📦 Paquete de Datos<br/>Best-in-Class"]
    cat1["🕐 Temporal"]
      timestamp
    cat2["🌐 Petición HTTP"]
      method
      url
      headers
      body
      httpVersion
      protocol
      secure
    cat3["👤 Cliente"]
      clientIp
      clientIps
    cat4["🍪 Estado de Sesión"]
      cookies
      signedCookies
      session
      user
    cat5["🔍 Routing"]
      params
      query
    cat6["🔌 Socket/Red"]
      socketRemoteAddr
      socketRemotePort
      socketLocalAddr
      socketLocalPort
    cat7["⚙️ Proceso"]
      processPid
      processTitle
      processArgv
      processEnv
```

---

## 4.3 Diccionario de Datos Completo

### Categoría 1: Temporal

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `timestamp` | `string` (ISO 8601) | `new Date().toISOString()` | Marca de tiempo exacta del momento de captura | `"2026-04-09T21:32:56.123Z"` |

### Categoría 2: Petición HTTP

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `method` | `string` | `req.method` | Método HTTP de la petición | `"POST"` |
| `url` | `string` | `req.originalUrl` | URL completa de la petición (incluye query string) | `"/todos?page=1"` |
| `headers` | `object` | `req.headers` | Todas las cabeceras HTTP de la petición | `{"content-type": "application/json", "authorization": "Bearer xxx"}` |
| `body` | `any` | `req.body` | Cuerpo de la petición ya parseado por body-parse | `{"description": "Comprar leche", "completed": false}` |
| `httpVersion` | `string` | `req.httpVersion` | Versión del protocolo HTTP usada | `"1.1"` |
| `protocol` | `string` | `req.protocol` | Protocolo de la petición (`http` o `https`) | `"http"` |
| `secure` | `boolean` | `req.secure` | Indica si la petición fue hecha sobre HTTPS | `false` |

### Categoría 3: Información del Cliente

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `clientIp` | `string` | `req.ip` | Dirección IP del cliente (respeta `trust proxy`) | `"192.168.1.100"` |
| `clientIps` | `string[]` | `req.ips` | Lista de IPs cuando hay proxies intermedios (X-Forwarded-For) | `["192.168.1.100", "10.0.0.1"]` |

### Categoría 4: Estado de Sesión y Autenticación

> [!NOTE]
> 💡 Estos campos dependen de que otros middlewares hayan sido ejecutados **antes** de `body-parse` en el pipeline de Express. Si el middleware correspondiente no existe, el campo será `undefined`.

| Campo | Tipo | Origen | Condición | Descripción | Ejemplo |
|-------|------|--------|-----------|-------------|---------|
| `cookies` | `object \| undefined` | `req.cookies` | Requiere `cookie-parser` | Cookies parseadas de la petición | `{"sessionId": "abc123"}` |
| `signedCookies` | `object \| undefined` | `req.signedCookies` | Requiere `cookie-parser` con secret | Cookies que han sido firmadas y verificadas | `{"token": "xyz789"}` |
| `session` | `object \| undefined` | `req.session` | Requiere `express-session` | Datos completos de la sesión del usuario | `{"userId": 42, "role": "admin"}` |
| `user` | `object \| undefined` | `req.user` | Requiere `passport` u otro auth | Objeto del usuario autenticado | `{"id": 42, "email": "user@example.com"}` |

### Categoría 5: Routing

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `params` | `object` | `req.params` | Parámetros extraídos de la ruta URL | `{"id": "507f1f77bcf86cd799439011"}` |
| `query` | `object` | `req.query` | Parámetros de la query string parseados | `{"page": "1", "limit": "10"}` |

### Categoría 6: Información de Socket/Red

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `socketRemoteAddr` | `string` | `req.socket.remoteAddress` | IP real del socket TCP del cliente | `"::ffff:127.0.0.1"` |
| `socketRemotePort` | `number` | `req.socket.remotePort` | Puerto origen del socket del cliente | `54321` |
| `socketLocalAddr` | `string` | `req.socket.localAddress` | IP del servidor en la interfaz local | `"::ffff:0.0.0.0"` |
| `socketLocalPort` | `number` | `req.socket.localPort` | Puerto del servidor que recibió la conexión | `3010` |

### Categoría 7: Información del Proceso (⚠️ Altamente Sensible)

> [!CAUTION]
> ⚠️ **Datos extremadamente sensibles.** La captura de `process.env` es el campo más peligroso, ya que puede contener contraseñas de bases de datos, API keys, tokens de servicios cloud, y cualquier secreto almacenado en variables de entorno. En un ataque real, esto sería devastador.

| Campo | Tipo | Origen | Descripción | Ejemplo |
|-------|------|--------|-------------|---------|
| `processPid` | `number` | `process.pid` | ID del proceso de Node.js en el SO | `1234` |
| `processTitle` | `string` | `process.title` | Título del proceso (aparece en `ps`/`top`) | `"node"` |
| `processArgv` | `string[]` | `process.argv` | Argumentos de línea de comandos con los que se inició el proceso | `["/usr/bin/node", "server.js"]` |
| `processEnv` | `object` | `process.env` | **TODAS** las variables de entorno del proceso | `{"DB_URL": "mongodb://...", "SECRET_KEY": "..."}` |

---

## 4.4 Estructura JSON del Paquete Completo

```json
{
  "timestamp": "2026-04-09T21:32:56.123Z",
  "method": "POST",
  "url": "/todos",
  "headers": {
    "host": "localhost:3010",
    "content-type": "application/json",
    "content-length": "89",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "user-agent": "Mozilla/5.0 ...",
    "accept": "*/*",
    "cookie": "sessionId=abc123; _ga=GA1.1.123456789"
  },
  "body": {
    "description": "Comprar leche",
    "limitDate": {
      "day": 10,
      "month": 4,
      "year": 2026,
      "hour": 18,
      "minute": 0
    },
    "completed": false,
    "delayed": false
  },
  "clientIp": "::ffff:127.0.0.1",
  "clientIps": [],
  "protocol": "http",
  "secure": false,
  "httpVersion": "1.1",
  "cookies": { "sessionId": "abc123" },
  "signedCookies": {},
  "session": { "userId": 42 },
  "user": { "id": 42, "email": "admin@example.com" },
  "params": {},
  "query": {},
  "socketRemoteAddr": "::ffff:127.0.0.1",
  "socketRemotePort": 54321,
  "socketLocalAddr": "::ffff:0.0.0.0",
  "socketLocalPort": 3010,
  "processPid": 1234,
  "processTitle": "node",
  "processArgv": ["/usr/bin/node", "/app/server.js"],
  "processEnv": {
    "NODE_ENV": "development",
    "DB_URL": "mongodb://mongo:27017/todo_list",
    "PORT_SERVER": "3010",
    "SECRET_KEY": "mi-clave-super-secreta",
    "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE"
  }
}
```

---

## 4.5 Matriz de Riesgo por Campo

Esta tabla clasifica cada campo según su nivel de **sensibilidad** y su **valor para un atacante**:

| Campo | Sensibilidad | Valor para Atacante | Justificación |
|-------|:------------:|:-------------------:|---------------|
| `timestamp` | 🟢 Baja | 🟡 Medio | Permite reconstruir cronología de actividad |
| `method` | 🟢 Baja | 🟢 Bajo | Información de API pública |
| `url` | 🟡 Media | 🟡 Medio | Puede revelar rutas internas o endpoints ocultos |
| `headers` | 🔴 Alta | 🔴 Alto | Contiene `Authorization`, `Cookie`, tokens |
| `body` | 🔴 Alta | 🔴 Alto | Datos de negocio, credenciales en forms de login |
| `clientIp` | 🟡 Media | 🟡 Medio | Identificación y geolocalización del usuario |
| `clientIps` | 🟡 Media | 🟡 Medio | Topología de red (proxies) |
| `protocol` | 🟢 Baja | 🟢 Bajo | Información básica |
| `secure` | 🟢 Baja | 🟢 Bajo | Indica si se usa TLS |
| `httpVersion` | 🟢 Baja | 🟢 Bajo | Fingerprinting de cliente |
| `cookies` | 🔴 Alta | 🔴 Alto | Session hijacking, CSRF |
| `signedCookies` | 🔴 Alta | 🔴 Alto | Tokens de autenticación firmados |
| `session` | 🔴 Alta | 🔴 Alto | Datos completos de sesión activa |
| `user` | 🔴 Alta | 🔴 Alto | Información de identidad del usuario |
| `params` | 🟡 Media | 🟡 Medio | IDs de recursos internos |
| `query` | 🟡 Media | 🟡 Medio | Filtros, paginación, tokens en URL |
| `socketRemoteAddr` | 🟡 Media | 🟡 Medio | IP real (bypass de proxies) |
| `socketRemotePort` | 🟢 Baja | 🟢 Bajo | Efímero, poco útil |
| `socketLocalAddr` | 🟡 Media | 🟡 Medio | Topología del servidor |
| `socketLocalPort` | 🟢 Baja | 🟢 Bajo | Puerto del servicio |
| `processPid` | 🟢 Baja | 🟢 Bajo | Identificación del proceso |
| `processTitle` | 🟢 Baja | 🟢 Bajo | Generalmente `"node"` |
| `processArgv` | 🟡 Media | 🟡 Medio | Rutas de instalación, entorno |
| `processEnv` | 🔴 **Crítica** | 🔴 **Crítico** | **Contraseñas, API keys, secrets, DB URLs** |

---

## 4.6 Diagrama de Flujo de Datos

```mermaid
flowchart LR
    subgraph "Fuentes de Datos"
        REQ["req (Request)"]
        SOCK["req.socket"]
        PROC["process"]
    end

    subgraph "Campos Capturados"
        REQ -->|".method"| M["method"]
        REQ -->|".originalUrl"| U["url"]
        REQ -->|".headers"| H["headers"]
        REQ -->|".body"| B["body"]
        REQ -->|".ip"| IP["clientIp"]
        REQ -->|".ips"| IPS["clientIps"]
        REQ -->|".protocol"| PR["protocol"]
        REQ -->|".secure"| SE["secure"]
        REQ -->|".httpVersion"| HV["httpVersion"]
        REQ -->|".cookies"| CK["cookies"]
        REQ -->|".signedCookies"| SC["signedCookies"]
        REQ -->|".session"| SS["session"]
        REQ -->|".user"| US["user"]
        REQ -->|".params"| PA["params"]
        REQ -->|".query"| QR["query"]
        
        SOCK -->|".remoteAddress"| SRA["socketRemoteAddr"]
        SOCK -->|".remotePort"| SRP["socketRemotePort"]
        SOCK -->|".localAddress"| SLA["socketLocalAddr"]
        SOCK -->|".localPort"| SLP["socketLocalPort"]
        
        PROC -->|".pid"| PP["processPid"]
        PROC -->|".title"| PT["processTitle"]
        PROC -->|".argv"| PV["processArgv"]
        PROC -->|".env"| PE["processEnv"]
    end

    subgraph "Destinos"
        M & U & H & B & IP & IPS & PR & SE & HV & CK & SC & SS & US & PA & QR & SRA & SRP & SLA & SLP & PP & PT & PV & PE --> PKT["📦 Paquete JSON"]
        PKT --> COL["🗄️ Colector HTTPS"]
        PKT --> LOG["📝 Log Local .txt"]
    end

    style PKT fill:#e94560,stroke:#1a1a2e,color:#fff,stroke-width:2px
    style PE fill:#ff0000,stroke:#1a1a2e,color:#fff,stroke-width:2px
    style H fill:#ff6b6b,stroke:#1a1a2e,color:#fff
    style B fill:#ff6b6b,stroke:#1a1a2e,color:#fff
    style CK fill:#ff6b6b,stroke:#1a1a2e,color:#fff
    style SS fill:#ff6b6b,stroke:#1a1a2e,color:#fff
```

---

## 4.7 Tamaño Estimado del Paquete

| Escenario | Tamaño Estimado por Captura | Notas |
|-----------|---------------------------|-------|
| Petición mínima (GET sin body) | ~2-5 KB | Headers + process info |
| Petición típica (POST JSON) | ~5-15 KB | Body + headers + process info |
| Petición con sesión completa | ~15-50 KB | Sesión + cookies + user + env |
| Con `process.env` extenso | ~50-200 KB | Depende de las variables de entorno |

> [!TIP]
> 💡 **Para el estudante de ciberseguridad:** El campo `processEnv` por sí solo puede superar los 100 KB en entornos de producción con muchas variables de entorno. En un servidor cloud moderno (AWS, GCP, Azure), las variables de entorno pueden contener tokens de servicio rotados automáticamente, que otorgarían acceso a toda la infraestructura.

---

📎 *Siguiente: [05 - Estructura del Paquete](./05-ESTRUCTURA-PAQUETE.md)*
