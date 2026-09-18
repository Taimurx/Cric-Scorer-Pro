/**
 * Cric Scorer Pro — Enterprise Production Server
 * 
 * Features:
 * - RFC 7233 HTTP 206 Byte-Range streaming (resumable 54.8MB APK downloads)
 * - Dynamic ETag & HTTP 304 Not Modified caching
 * - Transparent Gzip & Deflate stream compression
 * - Enterprise Security Headers (CSP, HSTS, X-Content-Type-Options, etc.)
 * - Path traversal attack prevention
 * - Telemetry & Container Healthcheck (/healthz)
 * - Zero external npm dependencies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);
const APP_VERSION = '2.0.11';
const APK_FILENAME = 'cricket_pro.apk';
const APK_PATH = path.join(PUBLIC_DIR, APK_FILENAME);

// Comprehensive MIME Type Registry
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
  '.wasm': 'application/wasm',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.frag': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

// Compressible Text/Asset Types
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt', '.frag'
]);

/**
 * Apply Enterprise Security Headers to every HTTP response
 */
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Server', 'CricScorerPro-Enterprise/2.0.11');
}

/**
 * Generate lightweight strong ETag from file stats
 */
function generateETag(stat) {
  const mtime = stat.mtimeMs.toString(16);
  const size = stat.size.toString(16);
  return `W/"${size}-${mtime}"`;
}

/**
 * Parse RFC 7233 Range header
 * e.g. "bytes=0-1023", "bytes=500-", "bytes=-500"
 */
function parseRangeHeader(rangeHeader, fileSize) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const rangeSpec = rangeHeader.substring(6).trim();
  const parts = rangeSpec.split('-');
  if (parts.length !== 2) return null;

  let start = parts[0] ? parseInt(parts[0], 10) : NaN;
  let end = parts[1] ? parseInt(parts[1], 10) : NaN;

  if (isNaN(start) && isNaN(end)) return null;

  // Suffix range: bytes=-500 (last 500 bytes)
  if (isNaN(start)) {
    start = Math.max(0, fileSize - end);
    end = fileSize - 1;
  } else if (isNaN(end)) {
    // Prefix range: bytes=500- (from 500 to end of file)
    end = fileSize - 1;
  }

  if (start > end || start < 0 || end >= fileSize) {
    return { invalid: true };
  }

  return { start, end };
}

/**
 * Check if the client already has the cached version
 */
function isFresh(req, etag, stat) {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch) {
    return ifNoneMatch === etag || ifNoneMatch === '*';
  }

  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince) {
    const clientTime = new Date(ifModifiedSince).getTime();
    if (!isNaN(clientTime) && clientTime >= Math.floor(stat.mtimeMs)) {
      return true;
    }
  }

  return false;
}

/**
 * Serve static files with streaming, caching, range requests, and compression
 */
function serveStaticFile(req, res, filePath) {
  // Prevent Path Traversal attacks
  const normalizedPath = path.resolve(filePath);
  if (normalizedPath !== PUBLIC_DIR && !normalizedPath.startsWith(PUBLIC_DIR + path.sep)) {
    res.statusCode = 403;
    res.end('403 Forbidden: Access Denied');
    return;
  }

  fs.stat(normalizedPath, (err, stat) => {
    if (err) {
      if (err.code === 'ENOENT') {
        serve404(req, res);
      } else {
        res.statusCode = 500;
        res.end('500 Internal Server Error');
      }
      return;
    }

    if (stat.isDirectory()) {
      // Auto-resolve index.html inside directories
      const indexPath = path.join(normalizedPath, 'index.html');
      serveStaticFile(req, res, indexPath);
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const etag = generateETag(stat);

    // Apply baseline security headers
    applySecurityHeaders(res);
    res.setHeader('Content-Type', contentType);
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());

    const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

    // Caching Strategy
    const isServiceWorker = normalizedPath.endsWith('flutter_service_worker.js') || normalizedPath.endsWith('sw.js');
    if (ext === '.html' || isServiceWorker) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    } else if (ext === '.wasm') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    } else if (normalizedPath === APK_PATH) {
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      res.setHeader('Content-Disposition', `attachment; filename="${APK_FILENAME}"`);
    } else {
      // Allow caching for JS, CSS, Images, JSON (revalidated by ETag)
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }

    // Conditional Cache Check (HTTP 304 Not Modified)
    if (isFresh(req, etag, stat)) {
      res.statusCode = 304;
      res.end();
      return;
    }

    // Support HTTP Range Requests (RFC 7233) for APK and media streaming
    res.setHeader('Accept-Ranges', 'bytes');
    const rangeHeader = req.headers.range;

    if (rangeHeader && req.method === 'GET') {
      const range = parseRangeHeader(rangeHeader, stat.size);

      if (range && range.invalid) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${stat.size}`);
        res.end('416 Range Not Satisfiable');
        return;
      }

      if (range) {
        const { start, end } = range;
        const contentLength = end - start + 1;

        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', contentLength);

        const stream = fs.createReadStream(normalizedPath, { start, end });
        stream.on('error', () => {
          if (!res.headersSent) res.statusCode = 500;
          res.end();
        });
        stream.pipe(res);
        return;
      }
    }

    // HEAD Request support
    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Length', stat.size);
      res.end();
      return;
    }

    // Compression Handling (Brotli / Gzip / Deflate) for compressible types
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldCompress = COMPRESSIBLE_EXTENSIONS.has(ext) && stat.size > 1024;
    
    // In-memory cache key (based on path, mtime, and encoding requested)
    let encodingType = 'none';
    if (shouldCompress) {
      if (/\bbr\b/.test(acceptEncoding)) encodingType = 'br';
      else if (/\bgzip\b/.test(acceptEncoding)) encodingType = 'gzip';
      else if (/\bdeflate\b/.test(acceptEncoding)) encodingType = 'deflate';
    }
    
    const cacheKey = `${normalizedPath}_${stat.mtimeMs}_${encodingType}`;
    
    if (stat.size < 2 * 1024 * 1024) { // Only cache files < 2MB
      if (memoryCache.has(cacheKey)) {
        const cachedData = memoryCache.get(cacheKey);
        if (encodingType !== 'none') {
          res.setHeader('Content-Encoding', encodingType);
          res.setHeader('Vary', 'Accept-Encoding');
        }
        res.statusCode = 200;
        res.setHeader('Content-Length', cachedData.length);
        res.end(cachedData);
        return;
      }
    }

    const sendAndCache = (stream, res, encodingType) => {
      if (encodingType !== 'none') {
        res.setHeader('Content-Encoding', encodingType);
        res.setHeader('Vary', 'Accept-Encoding');
      }
      
      if (stat.size < 2 * 1024 * 1024) {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          // Limit memory cache size to 100 entries to prevent OOM
          if (memoryCache.size > 100) memoryCache.clear();
          memoryCache.set(cacheKey, buffer);
        });
      }
      stream.pipe(res);
    };

    if (encodingType === 'br') {
      const stream = fs.createReadStream(normalizedPath).pipe(zlib.createBrotliCompress());
      sendAndCache(stream, res, 'br');
      return;
    }
    if (encodingType === 'gzip') {
      const stream = fs.createReadStream(normalizedPath).pipe(zlib.createGzip({ level: 6 }));
      sendAndCache(stream, res, 'gzip');
      return;
    }
    if (encodingType === 'deflate') {
      const stream = fs.createReadStream(normalizedPath).pipe(zlib.createDeflate({ level: 6 }));
      sendAndCache(stream, res, 'deflate');
      return;
    }

    // Standard Full-file stream
    res.statusCode = 200;
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(normalizedPath);
    stream.on('error', () => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
    sendAndCache(stream, res, 'none');
  });
}

/**
 * Custom 404 Handler
 */
function serve404(req, res) {
  const custom404Path = path.join(PUBLIC_DIR, '404.html');
  fs.readFile(custom404Path, (err, data) => {
    applySecurityHeaders(res);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (!err && data) {
      res.end(data);
    } else {
      res.end('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested resource was not found on this server.</p></body></html>');
    }
  });
}

/**
 * Healthcheck & Telemetry Endpoint (/healthz)
 */
function serveHealthz(req, res) {
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  fs.stat(APK_PATH, (err, apkStat) => {
    const memory = process.memoryUsage();
    const payload = {
      status: 'UP',
      application: 'Cric Scorer Pro',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      memory: {
        rssMb: +(memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(2),
        heapTotalMb: +(memory.heapTotal / (1024 * 1024)).toFixed(2)
      },
      apk: {
        available: !err && apkStat.isFile(),
        filename: APK_FILENAME,
        sizeBytes: !err ? apkStat.size : 0,
        sizeMb: !err ? +(apkStat.size / (1024 * 1024)).toFixed(2) : 0
      }
    };

    res.statusCode = 200;
    res.end(JSON.stringify(payload, null, 2));
  });
}

/**
 * Simple In-Memory Rate Limiter for APK Downloads
 */
const rateLimitMap = new Map();
function isRateLimited(ip) {
  if (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === '::1' || ip === 'localhost') return false;
  
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const limit = 5; // max 5 downloads

  let record = rateLimitMap.get(ip);
  if (!record) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
    return false;
  }
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }
  
  record.count += 1;
  return record.count > limit;
}

// Memory cache for small static files to avoid disk I/O
const memoryCache = new Map();

/**
 * Main HTTP Request Dispatcher
 */
function handleRequest(req, res) {
  const startMs = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-';

  // Enterprise Access Logging (JSON Structured format)
  res.on('finish', () => {
    const duration = Date.now() - startMs;
    const date = new Date().toISOString();
    const status = res.statusCode;
    const contentLen = res.getHeader('content-length') || '-';
    const userAgent = req.headers['user-agent'] || '-';
    
    const logEntry = {
      timestamp: date,
      level: "INFO",
      ip: ip,
      method: req.method,
      url: req.url,
      status: status,
      contentLength: contentLen,
      userAgent: userAgent,
      durationMs: duration
    };
    console.log(JSON.stringify(logEntry));
  });

  // Clean URL Redirections & Rewrites
  if (pathname === '/healthz' || pathname === '/health') {
    serveHealthz(req, res);
    return;
  }

  if (pathname === '/download' || pathname === '/apk' || pathname === `/${APK_FILENAME}`) {
    if (isRateLimited(ip)) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Retry-After', '600');
      res.end('429 Too Many Requests - Download rate limit exceeded.');
      return;
    }
    if (pathname === '/download' || pathname === '/apk') {
      res.statusCode = 302;
      res.setHeader('Location', `/${APK_FILENAME}`);
      res.end();
      return;
    }
  }

  if (pathname === '/app' || pathname === '/web') {
    res.statusCode = 301;
    res.setHeader('Location', '/web/');
    res.end();
    return;
  }

  if (pathname === '/privacy') {
    serveStaticFile(req, res, path.join(PUBLIC_DIR, 'privacy.html'));
    return;
  }

  if (pathname === '/') {
    serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
    return;
  }

  // Web application subroute SPA rewrite check
  if (pathname.startsWith('/web/')) {
    const subpath = pathname.substring(5);
    const targetFile = path.join(PUBLIC_DIR, 'web', subpath);

    // If subroute has no extension and is not a known file, serve web/index.html (SPA rewrite)
    if (!path.extname(subpath)) {
      fs.stat(targetFile, (err, stat) => {
        if (!err && stat.isDirectory()) {
          serveStaticFile(req, res, path.join(targetFile, 'index.html'));
        } else if (err && err.code === 'ENOENT') {
          serveStaticFile(req, res, path.join(PUBLIC_DIR, 'web', 'index.html'));
        } else {
          serveStaticFile(req, res, targetFile);
        }
      });
      return;
    }
  }

  // Resolve static file path
  const targetFilePath = path.join(PUBLIC_DIR, pathname);
  serveStaticFile(req, res, targetFilePath);
}

const server = http.createServer(handleRequest);

// Handle raw socket errors to prevent process crashes
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Enterprise HTTP Keep-Alive & Timeouts (AWS ALB/Nginx compatible)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful Shutdown Management
function gracefulShutdown(signal) {
  global.isShuttingDown = true;
  console.log(`\n[Cric Scorer Pro] Received ${signal}. Draining active connections...`);
  const cluster = require('cluster');
  
  if (cluster.isPrimary || cluster.isMaster) {
    let workers = Object.values(cluster.workers);
    let workersAlive = workers.length;
    if (workersAlive === 0) process.exit(0);
    
    console.log(`[Cluster] Waiting for ${workersAlive} workers to gracefully shut down...`);
    workers.forEach(worker => worker.process.kill(signal));
    
    cluster.on('exit', () => {
      if (--workersAlive === 0) {
        console.log('[Cluster] All workers shut down cleanly.');
        process.exit(0);
      }
    });
  } else {
    // Workers close their HTTP server
    server.closeIdleConnections ? server.closeIdleConnections() : null;
    server.close(() => {
      console.log(`[Worker ${process.pid}] Server shut down cleanly.`);
      process.exit(0);
    });
  }

  setTimeout(() => {
    console.error('[Cric Scorer Pro] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  const cluster = require('cluster');
  
  if (cluster.isPrimary || cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`========================================================`);
    console.log(`🏏 Cric Scorer Pro — Enterprise Production Server v${APP_VERSION}`);
    console.log(`========================================================`);
    console.log(`🚀 Starting cluster with ${numCPUs} workers...`);
    
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    
    cluster.on('exit', (worker) => {
      if (global.isShuttingDown) return;
      console.warn(`[Cluster] Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  } else {
    server.listen(PORT, HOST, () => {
      if (cluster.worker.id === 1) {
        console.log(`🌐 Server running at: http://${HOST}:${PORT}`);
        console.log(`📱 Landing Page:     http://localhost:${PORT}/`);
        console.log(`💻 Flutter Web App:  http://localhost:${PORT}/web/`);
        console.log(`⬇️ APK Download:     http://localhost:${PORT}/download`);
        console.log(`🩺 Healthcheck:      http://localhost:${PORT}/healthz`);
        console.log(`========================================================`);
      }
      console.log(`[Worker ${process.pid}] Started.`);
    });
  }
}

module.exports = { server, handleRequest, parseRangeHeader, generateETag, isFresh };
