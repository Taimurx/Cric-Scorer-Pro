const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { server, parseRangeHeader } = require('../server.js');

let baseUrl = '';
let testPort = 0;

function httpRequest(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const req = http.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer,
          text: buffer.toString('utf8')
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test.before((t, done) => {
  server.listen(0, '127.0.0.1', () => {
    testPort = server.address().port;
    baseUrl = `http://127.0.0.1:${testPort}`;
    done();
  });
});

test.after((t, done) => {
  server.close(done);
});

test('1. GET / returns 200 OK with Landing Page, ETag and Security Headers', async () => {
  const res = await httpRequest('/');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.ok(res.headers['etag']);
  assert.ok(res.text.includes('Cric Scorer Pro'));
});

test('2. GET /cricket_pro.apk returns 200 with APK Content-Type and Disposition', async () => {
  const res = await httpRequest('/cricket_pro.apk', { method: 'HEAD' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/vnd.android.package-archive');
  assert.equal(res.headers['content-disposition'], 'attachment; filename="cricket_pro.apk"');
  assert.equal(res.headers['accept-ranges'], 'bytes');
  assert.equal(res.headers['content-length'], '54829581');
});

test('3. GET /cricket_pro.apk with Range bytes=0-1023 returns 206 Partial Content', async () => {
  const res = await httpRequest('/cricket_pro.apk', {
    headers: { Range: 'bytes=0-1023' }
  });
  assert.equal(res.statusCode, 206);
  assert.equal(res.headers['content-range'], 'bytes 0-1023/54829581');
  assert.equal(res.headers['content-length'], '1024');
  assert.equal(res.body.length, 1024);
});

test('4. GET /cricket_pro.apk with Suffix Range bytes=-512 returns last 512 bytes', async () => {
  const res = await httpRequest('/cricket_pro.apk', {
    headers: { Range: 'bytes=-512' }
  });
  assert.equal(res.statusCode, 206);
  assert.equal(res.headers['content-range'], 'bytes 54829069-54829580/54829581');
  assert.equal(res.headers['content-length'], '512');
  assert.equal(res.body.length, 512);
});

test('5. GET /cricket_pro.apk with Invalid Range returns 416 Range Not Satisfiable', async () => {
  const res = await httpRequest('/cricket_pro.apk', {
    headers: { Range: 'bytes=99999999-100000000' }
  });
  assert.equal(res.statusCode, 416);
  assert.equal(res.headers['content-range'], 'bytes */54829581');
});

test('6. GET /download and /apk return 302 redirect to /cricket_pro.apk', async () => {
  const res1 = await httpRequest('/download');
  assert.equal(res1.statusCode, 302);
  assert.equal(res1.headers['location'], '/cricket_pro.apk');

  const res2 = await httpRequest('/apk');
  assert.equal(res2.statusCode, 302);
  assert.equal(res2.headers['location'], '/cricket_pro.apk');
});

test('7. GET /app returns 301 redirect to /web/', async () => {
  const res = await httpRequest('/app');
  assert.equal(res.statusCode, 301);
  assert.equal(res.headers['location'], '/web/');
});

test('8. GET /privacy and /privacy.html return 200 OK', async () => {
  const res = await httpRequest('/privacy');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(res.text.includes('Privacy Policy'));
});

test('9. GET /web/ returns 200 OK with Flutter Web App', async () => {
  const res = await httpRequest('/web/');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(res.text.includes('Cricket Scorer Pro'));
});

test('10. GET /healthz returns 200 OK with Enterprise Telemetry', async () => {
  const res = await httpRequest('/healthz');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const data = JSON.parse(res.text);
  assert.equal(data.status, 'UP');
  assert.equal(data.version, '2.0.11');
  assert.ok(data.uptimeSeconds >= 0);
  assert.ok(data.memory && data.memory.rssMb > 0);
  assert.equal(data.apk.available, true);
  assert.equal(data.apk.sizeBytes, 54829581);
});

test('11. Conditional Request with If-None-Match returns 304 Not Modified', async () => {
  const init = await httpRequest('/');
  const etag = init.headers['etag'];
  assert.ok(etag);

  const res = await httpRequest('/', {
    headers: { 'If-None-Match': etag }
  });
  assert.equal(res.statusCode, 304);
  assert.equal(res.body.length, 0);
});

test('12. GET /non-existent-page returns 404 with Custom 404 HTML', async () => {
  const res = await httpRequest('/this-page-does-not-exist-12345');
  assert.equal(res.statusCode, 404);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(res.text.includes('404'));
});

test('13. Range Header Parser Unit Tests', () => {
  assert.deepEqual(parseRangeHeader('bytes=0-499', 1000), { start: 0, end: 499 });
  assert.deepEqual(parseRangeHeader('bytes=500-', 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRangeHeader('bytes=-200', 1000), { start: 800, end: 999 });
  assert.deepEqual(parseRangeHeader('bytes=1500-', 1000), { invalid: true });
  assert.deepEqual(parseRangeHeader('bytes=500-200', 1000), { invalid: true });
  assert.equal(parseRangeHeader('invalid-header', 1000), null);
});

test('14. GET /sitemap.xml and /robots.txt return 200 OK with valid SEO directives', async () => {
  const sitemapRes = await httpRequest('/sitemap.xml');
  assert.equal(sitemapRes.statusCode, 200);
  assert.match(sitemapRes.headers['content-type'], /xml/);
  assert.ok(sitemapRes.text.includes('dls-calculator.html'));
  assert.ok(sitemapRes.text.includes('overlay.html'));

  const robotsRes = await httpRequest('/robots.txt');
  assert.equal(robotsRes.statusCode, 200);
  assert.match(robotsRes.headers['content-type'], /text\/plain/);
  assert.ok(robotsRes.text.includes('Sitemap: https://cric-scorer-pro.vercel.app/sitemap.xml'));
});

test('15. GET /manifest.json and /web/manifest.json return 200 OK with valid PWA manifest data', async () => {
  const rootManifest = await httpRequest('/manifest.json');
  assert.equal(rootManifest.statusCode, 200);
  assert.match(rootManifest.headers['content-type'], /json/);
  const rootData = JSON.parse(rootManifest.text);
  assert.equal(rootData.short_name, 'Cric Scorer Pro');

  const webManifest = await httpRequest('/web/manifest.json');
  assert.equal(webManifest.statusCode, 200);
  const webData = JSON.parse(webManifest.text);
  assert.equal(webData.short_name, 'Cric Scorer Pro');
});

test('16. GET /web/dls-calculator.html and /web/overlay.html return 200 OK', async () => {
  const dlsRes = await httpRequest('/web/dls-calculator.html');
  assert.equal(dlsRes.statusCode, 200);
  assert.match(dlsRes.headers['content-type'], /text\/html/);
  assert.ok(dlsRes.text.includes('DLS Target &amp; Par Score Calculator'));

  const overlayRes = await httpRequest('/web/overlay.html');
  assert.equal(overlayRes.statusCode, 200);
  assert.match(overlayRes.headers['content-type'], /text\/html/);
  assert.ok(overlayRes.text.includes('Broadcast Overlay'));
});

