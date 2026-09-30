const fs = require('fs');

function main() {
    let content = fs.readFileSync('index.html', 'utf8');

    // Remove reload button
    const reloadBtnRegex = /<!-- Reload Iframe -->[\s\S]*?<\/button>\s*/;
    content = content.replace(reloadBtnRegex, '');

    // Replace the iframe with a mock scoreboard
    const iframeRegex = /<iframe id="web-demo-iframe" src="\.\/web\/\?v=[\s\S]*?" title="Cric Scorer Pro Live Web App" loading="lazy"><\/iframe>/;
    
    const mockHtml = `<div class="mock-scoreboard" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; background: #120F1F; color: white; padding: 20px; text-align: center; border-radius: inherit;">
              <img src="icon.png" alt="Logo" style="width: 64px; height: 64px; margin-bottom: 24px; border-radius: 12px; opacity: 0.9;">
              <h3 style="margin-bottom: 8px; font-size: 1.5rem; font-weight: 700;">Live Match</h3>
              <div style="font-size: 2.5rem; font-weight: 800; color: #E0567B; margin-bottom: 4px; letter-spacing: -1px;">145<span style="color: #fff;">/2</span></div>
              <div style="font-size: 1.1rem; color: #9CA3AF; margin-bottom: 32px;">Overs: 18.4 &nbsp;&middot;&nbsp; CRR: 7.8</div>
              <a href="./web/" target="_blank" style="background: #E0567B; color: white; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 600; font-size: 1rem; box-shadow: 0 4px 14px rgba(224, 86, 123, 0.4); transition: transform 0.2s;">Open Full App</a>
              <p style="margin-top: 16px; font-size: 0.85rem; color: #6B7280;">Experience full ball-by-ball scoring</p>
            </div>`;
    
    content = content.replace(iframeRegex, mockHtml);

    // Remove reloadDemoIframe function entirely
    content = content.replace(/function reloadDemoIframe\(\) {[\s\S]*?}, 100\);\s*}/, '');

    // Remove the iframe postMessage commands inside updateGoogleSignInUI
    content = content.replace(/\/\/\s*If iframe is loaded, trigger inside iframe as well[\s\S]*?iframe\.contentWindow\.postMessage\({ type: 'CRIC_TRIGGER_GOOGLE_SIGNIN' }, '\*'\);\s*}\s*}/g, '}');
    content = content.replace(/\/\/\s*Notify iframe[\s\S]*?iframe\.contentWindow\.postMessage\({ type: 'CRIC_SYNC_AUTH_STATE' }, '\*'\);\s*}/g, '');
    content = content.replace(/const iframe = document\.getElementById\('web-demo-iframe'\);\s*if \(iframe && iframe\.contentWindow\) {\s*iframe\.contentWindow\.postMessage\({ type: 'CRIC_SYNC_AUTH_STATE' }, '\*'\);\s*}/g, '');

    fs.writeFileSync('index.html', content);
}

main();
