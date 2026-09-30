const fs = require('fs');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Official Releases & APK Downloads - Cric Scorer Pro</title>
<meta name="description" content="Download Cric Scorer Pro APKs securely. Verify checksums and view release notes.">
<meta name="robots" content="index, follow">

<style>
  :root {
    --bg: #F9FAFB;
    --surface: #FFFFFF;
    --text: #1F2937;
    --text-muted: #4B5563;
    --primary: #E0567B;
    --primary-dark: #C0395D;
    --divider: #E5E7EB;
    --radius: 12px;
    --font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font);
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }
  .container {
    max-width: 800px;
    margin: 40px auto;
    background: var(--surface);
    padding: 40px 48px;
    border-radius: var(--radius);
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  }
  @media (max-width: 768px) {
    .container { margin: 16px; padding: 24px; }
  }
  header { margin-bottom: 40px; text-align: center; }
  .logo { width: 80px; height: 80px; border-radius: 20px; margin-bottom: 16px; }
  h1 { font-size: 2rem; font-weight: 800; color: #1E1744; margin-bottom: 8px; }
  .meta { color: var(--text-muted); font-size: 0.95rem; }
  
  .release-card {
    border: 1px solid var(--divider);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 24px;
    background: #FAFAFA;
  }
  .release-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--divider);
  }
  .release-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1E1744;
  }
  .release-badge {
    background: #E0567B;
    color: white;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .release-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .checksum-box {
    background: #111827;
    color: #10B981;
    font-family: monospace;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    word-break: break-all;
    margin-bottom: 20px;
  }
  .changelog {
    margin-bottom: 24px;
  }
  .changelog ul {
    padding-left: 20px;
    margin-top: 8px;
    font-size: 0.95rem;
  }
  .download-btn {
    display: inline-block;
    background: var(--primary);
    color: white;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 30px;
    font-weight: 600;
    transition: background 0.2s;
  }
  .download-btn:hover {
    background: var(--primary-dark);
  }
  .virustotal-link {
    display: inline-block;
    margin-left: 16px;
    font-size: 0.9rem;
    color: #3B82F6;
    text-decoration: none;
    font-weight: 500;
  }
  .virustotal-link:hover { text-decoration: underline; }
  
  .footer { text-align: center; margin-top: 48px; font-size: 0.9rem; color: var(--text-muted); }
  .footer a { color: var(--primary); text-decoration: none; font-weight: 600; }
</style>
</head>
<body>

<div class="container">
  <header>
    <img src="icon.png" alt="Cric Scorer Pro Logo" class="logo">
    <h1>Releases & Downloads</h1>
    <div class="meta">
      <p>Securely download and verify APKs for sideloading.</p>
    </div>
  </header>

  <div class="release-card">
    <div class="release-header">
      <div class="release-title">Cric Scorer Pro v2.0.11</div>
      <div class="release-badge">Latest</div>
    </div>
    
    <div class="release-meta">
      <div><strong>Date:</strong> Sep 17, 2026</div>
      <div><strong>Size:</strong> 52.3 MB</div>
      <div><strong>Min Android:</strong> 7.0 (Nougat)</div>
      <div><strong>Target Android:</strong> 14.0</div>
    </div>

    <div class="changelog">
      <strong>What's New:</strong>
      <ul>
        <li>Added DLS Calculator engine</li>
        <li>Improved offline mode reliability</li>
        <li>Broadcast overlay updates</li>
      </ul>
    </div>

    <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 8px;">SHA-256 Checksum:</div>
    <div class="checksum-box">57F44CAFD2E838DB61164BCA54C8CEB0B76D3559D70CDE8CEC3A825E05B6130B</div>

    <div>
      <a href="/cricket_pro.apk" download class="download-btn">Download APK</a>
      <a href="https://www.virustotal.com/gui/file/57f44cafd2e838db61164bca54c8ceb0b76d3559d70cde8cec3a825e05b6130b" target="_blank" rel="noopener" class="virustotal-link">Verify on VirusTotal &rarr;</a>
    </div>
  </div>

  <div class="footer">
    <p>&copy; 2026 Cric Scorer Pro. All Rights Reserved.</p>
    <p style="margin-top: 8px;">
      <a href="/">Home</a> &nbsp;&middot;&nbsp; 
      <a href="/privacy.html">Privacy Policy</a> &nbsp;&middot;&nbsp;
      <a href="/terms.html">Terms of Use</a>
    </p>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync('releases.html', html);
