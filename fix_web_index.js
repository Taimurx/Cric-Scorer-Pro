const fs = require('fs');

function main() {
    let content = fs.readFileSync('web/index.html', 'utf8');

    // 1. Add preload links
    const headInjectionPoint = '<meta charset="UTF-8">';
    const preloads = `<!-- Preload engine assets -->
  <link rel="preload" href="main.dart.js" as="script">
  <link rel="preload" href="canvaskit/canvaskit.js" as="script">
  <link rel="preload" href="canvaskit/canvaskit.wasm" as="fetch" crossorigin="anonymous">`;
    
    if (!content.includes('rel="preload" href="main.dart.js"')) {
        content = content.replace(headInjectionPoint, preloads + '\n  ' + headInjectionPoint);
    }

    // 2. Change watchdog text
    content = content.replace(/<p>Initializing CanvasKit engine &amp; local database\.<\/p>/, '<p>Engine failed to load. Please check your connection and retry.</p>');

    fs.writeFileSync('web/index.html', content);
}

main();
