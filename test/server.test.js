const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Vercel Static Asset & Configuration Integrity Suite', async (t) => {
  await t.test('1. vercel.json is valid and contains Security Headers', () => {
    const vercelPath = path.join(ROOT_DIR, 'vercel.json');
    assert.ok(fs.existsSync(vercelPath), 'vercel.json should exist');
    
    const vercelData = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    assert.ok(vercelData.rewrites, 'Should have rewrites');
    assert.ok(vercelData.headers, 'Should have security headers');
    
    const globalHeaders = vercelData.headers.find(h => h.source === '/(.*)');
    assert.ok(globalHeaders, 'Should have global headers applied');
    assert.ok(globalHeaders.headers.some(h => h.key === 'Content-Security-Policy'), 'Should enforce CSP globally');
  });

  await t.test('2. Core HTML entrypoints exist', () => {
    const requiredFiles = ['web/index.html', 'web/dls-calculator.html', 'web/overlay.html', 'privacy.html'];
    for (const file of requiredFiles) {
      assert.ok(fs.existsSync(path.join(ROOT_DIR, file)), file + ' is missing');
    }
  });

  await t.test('3. Cricket Engine JavaScript is valid and evaluates without syntax errors', () => {
    const enginePath = path.join(ROOT_DIR, 'web/js/cricket-engine.js');
    assert.ok(fs.existsSync(enginePath), 'cricket-engine.js is missing');
    
    // Load and evaluate the engine to catch fatal syntax errors
    const engineCode = fs.readFileSync(enginePath, 'utf8');
    assert.doesNotThrow(() => {
      // Create a mock global scope for the engine
      const sandbox = { window: { addEventListener: () => {} }, document: { addEventListener: () => {} } };
      const fn = new Function('globalThis', 'window', 'document', engineCode);
      fn(sandbox, sandbox.window, sandbox.document);
    }, 'Cricket Engine should compile without throwing errors');
  });
});
