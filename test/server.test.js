const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Load the server instance
const server = require('../server.js');

let baseUrl;
let testServer;

test.before((t, done) => {
  // Bind to dynamic port for testing
  testServer = server.listen(0, '127.0.0.1', () => {
    const port = testServer.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

test.after((t, done) => {
  testServer.close(done);
});

function makeRequest(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port: testServer.address().port,
      path: reqPath,
      ...options
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('1. GET /healthz returns 200 OK and valid health telemetry', async () => {
  const res = await makeRequest('/healthz');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  
  const data = JSON.parse(res.body.toString('utf8'));
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(data.service, 'cric-scorer-pro');
  assert.strictEqual(data.version, '2.0.11');
  assert.ok(typeof data.uptimeSeconds === 'number');
});

test('2. GET / returns 200 OK with HTML and Enterprise Security Headers', async () => {
  const res = await makeRequest('/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.strictEqual(res.headers['accept-ranges'], 'bytes');
  assert.ok(res.headers['etag']);
});

test('3. Byte Range Request (HTTP 206) handles chunked download of APK properly', async () => {
  const res = await makeRequest('/cricket_pro.apk', {
    headers: {
      'Range': 'bytes=0-1023'
    }
  });

  assert.strictEqual(res.statusCode, 206);
  assert.strictEqual(res.headers['content-range'], 'bytes 0-1023/54829581');
  assert.strictEqual(res.headers['content-length'], '1024');
  assert.strictEqual(res.body.length, 1024);
  assert.strictEqual(res.headers['content-disposition'], 'attachment; filename=cricket_pro.apk');
});

test('4. Streaming Gzip compression works when Accept-Encoding is supplied', async () => {
  const res = await makeRequest('/index.html', {
    headers: {
      'Accept-Encoding': 'gzip'
    }
  });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
  assert.strictEqual(res.headers['vary'], 'Accept-Encoding');
  assert.ok(res.body.length > 0);
});

test('5. Path Traversal Protection returns 403 Forbidden', async () => {
  const res = await makeRequest('/../../server.js');
  assert.strictEqual(res.statusCode, 403);
});

test('6. Malformed URI sequence returns 400 without crashing server', async () => {
  const res = await makeRequest('/%c0%af%fe%ff');
  assert.strictEqual(res.statusCode, 400);
});

test('7. Clean URL rewrite: /download redirects 302 to /cricket_pro.apk', async () => {
  const res = await makeRequest('/download');
  assert.strictEqual(res.statusCode, 302);
  assert.strictEqual(res.headers['location'], '/cricket_pro.apk');
});

test('8. Non-existent path returns 404', async () => {
  const res = await makeRequest('/non-existent-page-random-12345');
  assert.strictEqual(res.statusCode, 404);
});

test('9. Flutter Web Offline Service Worker is accessible and configured', async () => {
  const res = await makeRequest('/web/flutter_service_worker.js');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /javascript/);
  assert.ok(res.body.toString('utf8').includes('cric-scorer-v2.0.11-offline'));
});
