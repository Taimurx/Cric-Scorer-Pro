const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Cric Scorer Pro — Unified ThemeManager Suite', async (t) => {
  const webScriptPath = path.join(ROOT_DIR, 'web', 'js', 'ThemeManager.js');

  await t.test('1. Web ThemeManager.js exists', () => {
    assert.ok(fs.existsSync(webScriptPath), 'web/js/ThemeManager.js should exist');
  });

  await t.test('2. Evaluates cleanly and provides all 6 themes', () => {
    const code = fs.readFileSync(webScriptPath, 'utf8');

    // Create a mock DOM & Window environment
    const storage = {};
    const mockLocalStorage = {
      getItem: (key) => storage[key] || null,
      setItem: (key, val) => { storage[key] = String(val); }
    };

    const mockDocument = {
      readyState: 'complete',
      documentElement: {
        attributes: {},
        style: { setProperty: function() {} },
        setAttribute: function(name, val) { this.attributes[name] = val; },
        getAttribute: function(name) { return this.attributes[name]; }
      },
      body: {
        attributes: {},
        setAttribute: function(name, val) { this.attributes[name] = val; },
        getAttribute: function(name) { return this.attributes[name]; }
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {}
    };

    const mockWindow = {
      localStorage: mockLocalStorage,
      document: mockDocument,
      addEventListener: () => {},
      dispatchEvent: () => {}
    };

    const fn = new Function('window', code);
    fn(mockWindow);

    assert.ok(mockWindow.CpsThemeManager, 'ThemeManager should be attached to window');
    assert.equal(mockWindow.CpsThemeManager.themes.length, 6, 'Should define exactly 6 themes');

    const themeIds = mockWindow.CpsThemeManager.themes.map(t => t.id);
    assert.deepEqual(themeIds, ['sunrise', 'ocean', 'midnight', 'stadium', 'sunlight', 'royal'], 'Should include all 6 supported theme IDs');
  });

  await t.test('3. Theme setting, validation and persistence works correctly', () => {
    const code = fs.readFileSync(webScriptPath, 'utf8');
    const storage = {};
    const mockDocument = {
      readyState: 'complete',
      documentElement: {
        attributes: {},
        style: { setProperty: function() {} },
        setAttribute: function(name, val) { this.attributes[name] = val; }
      },
      body: {
        attributes: {},
        setAttribute: function(name, val) { this.attributes[name] = val; }
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {}
    };
    const mockWindow = {
      localStorage: {
        getItem: (k) => storage[k] || null,
        setItem: (k, v) => { storage[k] = String(v); }
      },
      document: mockDocument,
      addEventListener: () => {},
      dispatchEvent: () => {}
    };

    const fn = new Function('window', code);
    fn(mockWindow);

    // Initial theme should be sunrise
    assert.equal(mockWindow.CpsThemeManager.getTheme(), 'sunrise');

    // Switch to midnight
    mockWindow.CpsThemeManager.setTheme('midnight');
    assert.equal(mockWindow.CpsThemeManager.getTheme(), 'midnight');
    assert.equal(storage['cps_theme'], 'midnight');
    assert.equal(storage['flutter.cricket_theme_v3'], '"midnight"');
    assert.equal(mockDocument.documentElement.attributes['data-theme'], 'midnight');

    // Switch to stadium
    mockWindow.CpsThemeManager.setTheme('stadium');
    assert.equal(mockWindow.CpsThemeManager.getTheme(), 'stadium');
    assert.equal(storage['flutter.cricket_theme_v3'], '"stadium"');
    assert.equal(mockDocument.documentElement.attributes['data-theme'], 'stadium');

    // Invalid theme falls back safely to sunrise
    mockWindow.CpsThemeManager.setTheme('invalid-color-theme');
    assert.equal(mockWindow.CpsThemeManager.getTheme(), 'sunrise');
    assert.equal(mockDocument.documentElement.attributes['data-theme'], 'sunrise');
  });
});
