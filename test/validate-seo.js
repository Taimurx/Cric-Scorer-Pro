const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');
const htmlFiles = [
  'index.html',
  'privacy.html',
  'web/index.html',
  'web/dls-calculator.html',
  'web/overlay.html'
];

let totalBlocks = 0;
for (const file of htmlFiles) {
  const filePath = path.join(baseDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  
  console.log(`Checking ${file}: found ${matches.length} JSON-LD block(s)`);
  assert.ok(matches.length > 0, `File ${file} must have at least one JSON-LD block`);
  
  for (let i = 0; i < matches.length; i++) {
    totalBlocks++;
    const jsonText = matches[i][1].trim();
    const parsed = JSON.parse(jsonText);
    const identifier = parsed['@type'] || (parsed['@graph'] ? `@graph (${parsed['@graph'].length} entities)` : 'unknown');
    console.log(`  ✓ Block #${i + 1} valid JSON-LD: ${identifier}`);
  }
}

// Validate sitemap.xml
const sitemapPath = path.join(baseDir, 'sitemap.xml');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemapContent.includes('<urlset'), 'sitemap.xml must have urlset');
assert.ok(sitemapContent.includes('dls-calculator.html'), 'sitemap.xml must include dls-calculator');
assert.ok(sitemapContent.includes('overlay.html'), 'sitemap.xml must include overlay');
console.log('✓ sitemap.xml validation passed');

// Validate robots.txt
const robotsPath = path.join(baseDir, 'robots.txt');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert.ok(robotsContent.includes('Sitemap:'), 'robots.txt must include Sitemap link');
console.log('✓ robots.txt validation passed');

console.log(`\n🎉 Success! All ${totalBlocks} JSON-LD schema blocks, sitemap, and robots are 100% valid.`);
