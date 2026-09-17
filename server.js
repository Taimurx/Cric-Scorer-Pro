/**
 * Cric Scorer Pro — Enterprise Production Server
 * 
 * Features:
 * - RFC 7233 Byte-Range requests (HTTP 206 Partial Content) for resilient 54MB APK downloads
 * - Automatic HTTP Gzip / Deflate streaming compression (reduces JS/WASM payload by ~70%)
 * - Smart Caching with ETags, HTTP 304 Not Modified, and Immutable Asset Headers
 * - Security Hardening: Traversal Protection, Malformed URI Resilience, Enterprise Security Headers
 * - Observability: /healthz health check endpoint, Structured Logs, Graceful Shutdown (SIGTERM/SIGINT)
 * - Zero external dependencies: 100% native Node.js core modules (instant cold start, high throughput)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname);
const APP_VERSION = '2.0.11';
const SERVER_START_TIME = Date.now();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.apk': 'application/vnd.android.package-archive',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream',
  '.symbols': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

// File types eligible for on-the-fly streaming compression
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.wasm', '.symbols', '.txt', '.xml', '.map'
]);

function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes'
  };
}

function generateETag(stats) {
  return `W/"${stats.size.toString(16)}-${stats.mtime.getTime().toString(16)}"`;
}

function getCacheControlHeader(reqPath, ext) {
  // Immutable 1-year cache for versioned/hashed flutter web assets, fonts, icons & canvaskit
  if (
    reqPath.startsWith('/web/canvaskit/') ||
    reqPath.startsWith('/web/assets/') ||
    ext === '.woff2' ||
    ext === '.woff' ||
    ext === '.ttf' ||
    ext === '.otf'
  ) {
    return 'public, max-age=31536000, immutable';
  }

  // APK file: Cache for 1 day, must-revalidate with ETag
  if (ext === '.apk') {
    return 'public, max-age=86400, must-revalidate';
  }

  // HTML documents, main scripts and version metadata: Revalidate immediately with ETag (304)
  return 'public, max-age=0, must-revalidate';
}

function send404(res, reqPath) {
  const custom404 = path.join(ROOT, '404.html');
  fs.readFile(custom404, (err, content) => {
    if (!err && content) {
      res.writeHead(404, {
        ...getSecurityHeaders(),
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(content)
      });
      return res.end(content);
    }
    const fallback = `<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested path "${reqPath}" was not found on this server.</p></body></html>`;
    res.writeHead(404, {
      ...getSecurityHeaders(),
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(fallback)
    });
    res.end(fallback);
  });
}

const server = http.createServer((req, res) => {
  // Only handle GET, HEAD and OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept-Encoding, If-None-Match, Content-Type',
      'Content-Length': '0'
    });
    return res.end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`Method ${req.method} Not Allowed`);
  }

  // Safe URI Decoding (Resilient to malformed URI crash)
  let rawUrl;
  try {
    rawUrl = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request: Malformed URI sequence');
  }

  // Health check endpoint for Docker / Kubernetes / Cloud monitoring
  if (rawUrl === '/healthz' || rawUrl === '/health') {
    const healthPayload = JSON.stringify({
      status: 'ok',
      service: 'cric-scorer-pro',
      version: APP_VERSION,
      uptimeSeconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      timestamp: new Date().toISOString()
    });
    res.writeHead(200, {
      ...getSecurityHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(healthPayload),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    if (req.method === 'HEAD') return res.end();
    return res.end(healthPayload);
  }

  // Clean URL Rewrites & Redirects
  if (rawUrl === '/download' || rawUrl === '/apk') {
    res.writeHead(302, { 'Location': '/cricket_pro.apk' });
    return res.end();
  }
  if (rawUrl === '/web' || rawUrl === '/app') {
    res.writeHead(301, { 'Location': '/web/' });
    return res.end();
  }
  if (rawUrl === '/privacy') {
    rawUrl = '/privacy.html';
  }

  let reqPath = rawUrl === '/' ? '/index.html' : rawUrl;

  // Strict Directory Traversal Protection
  const resolvedPath = path.normalize(path.resolve(ROOT, '.' + reqPath));
  const relativeFromRoot = path.relative(ROOT, resolvedPath);

  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    res.writeHead(403, { ...getSecurityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden: Access outside server root is denied');
  }

  let filePath = resolvedPath;

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (reqPath.startsWith('/web/') && !reqPath.includes('.')) {
        filePath = path.join(ROOT, 'web', 'index.html');
        try {
          stats = fs.statSync(filePath);
        } catch (fallbackErr) {
          return send404(res, reqPath);
        }
      } else {
        return send404(res, reqPath);
      }
    }

    // Handle directory index resolution
    if (stats.isDirectory()) {
      const urlWithoutQuery = req.url.split('?')[0];
      if (!urlWithoutQuery.endsWith('/')) {
        const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
        res.writeHead(301, { 'Location': urlWithoutQuery + '/' + query });
        return res.end();
      }
      filePath = path.join(filePath, 'index.html');
      try {
        stats = fs.statSync(filePath);
      } catch (dirErr) {
        return send404(res, reqPath);
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const etag = generateETag(stats);
    const cacheControl = getCacheControlHeader(reqPath, ext);

    // ETag Validation (HTTP 304 Not Modified)
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, {
        ...getSecurityHeaders(),
        'ETag': etag,
        'Cache-Control': cacheControl
      });
      return res.end();
    }

    const baseHeaders = {
      ...getSecurityHeaders(),
      'Content-Type': contentType,
      'ETag': etag,
      'Cache-Control': cacheControl,
      'Last-Modified': stats.mtime.toUTCString()
    };

    if (ext === '.apk') {
      baseHeaders['Content-Disposition'] = 'attachment; filename=cricket_pro.apk';
    }

    // ── HTTP 206 Partial Content (Byte Range Request Handling) ──
    const rangeHeader = req.headers.range;
    if (rangeHeader && stats.size > 0) {
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : NaN;
        let end = match[2] ? parseInt(match[2], 10) : NaN;

        if (isNaN(start)) {
          // Format: bytes=-500 (last 500 bytes)
          start = stats.size - end;
          end = stats.size - 1;
        } else if (isNaN(end)) {
          // Format: bytes=500- (from 500 to EOF)
          end = stats.size - 1;
        }

        // Unsatisfiable range check
        if (start >= stats.size || end >= stats.size || start > end || start < 0) {
          res.writeHead(416, {
            ...baseHeaders,
            'Content-Range': `bytes */${stats.size}`,
            'Content-Length': '0'
          });
          return res.end();
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Content-Length': chunkSize
        });

        if (req.method === 'HEAD') return res.end();

        const rangeStream = fs.createReadStream(filePath, { start, end });
        rangeStream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
        return rangeStream.pipe(res);
      }
    }

    // ── Streaming Compression (Gzip / Deflate) for eligible assets ──
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const isCompressible = COMPRESSIBLE_EXTENSIONS.has(ext) && stats.size > 512;

    if (isCompressible && acceptEncoding.includes('gzip')) {
      baseHeaders['Content-Encoding'] = 'gzip';
      baseHeaders['Vary'] = 'Accept-Encoding';
      res.writeHead(200, baseHeaders);

      if (req.method === 'HEAD') return res.end();

      const rawStream = fs.createReadStream(filePath);
      const gzipStream = zlib.createGzip({ level: zlib.constants.Z_DEFAULT_COMPRESSION });
      rawStream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
      return rawStream.pipe(gzipStream).pipe(res);
    }

    if (isCompressible && acceptEncoding.includes('deflate')) {
      baseHeaders['Content-Encoding'] = 'deflate';
      baseHeaders['Vary'] = 'Accept-Encoding';
      res.writeHead(200, baseHeaders);

      if (req.method === 'HEAD') return res.end();

      const rawStream = fs.createReadStream(filePath);
      const deflateStream = zlib.createDeflate();
      rawStream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
      return rawStream.pipe(deflateStream).pipe(res);
    }

    // Standard Uncompressed Response
    baseHeaders['Content-Length'] = stats.size;
    res.writeHead(200, baseHeaders);

    if (req.method === 'HEAD') return res.end();

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
    fileStream.pipe(res);
  });
});

let serverInstance = null;

if (require.main === module) {
  serverInstance = server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🏏 Cric Scorer Pro Enterprise Production Server v${APP_VERSION}`);
    console.log(`=======================================================`);
    console.log(`🌐 Server running at:      http://${HOST}:${PORT}`);
    console.log(`📱 Landing Page:          http://${HOST}:${PORT}/`);
    console.log(`💻 Flutter Web App:       http://${HOST}:${PORT}/web/`);
    console.log(`🔒 Privacy Policy:        http://${HOST}:${PORT}/privacy`);
    console.log(`❤️  Health Check API:      http://${HOST}:${PORT}/healthz`);
    console.log(`⬇️  APK Direct Download:   http://${HOST}:${PORT}/download`);
    console.log(`=======================================================`);
  });

  // Graceful Process Lifecycle Management
  function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Gracefully terminating server...`);
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('HTTP server closed cleanly. Exiting.');
        process.exit(0);
      });
    }
    setTimeout(() => {
      console.error('Forcefully terminating after timeout.');
      process.exit(1);
    }, 5000).unref();
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = server;
