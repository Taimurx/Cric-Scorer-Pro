const fs = require('fs');

function main() {
    let content = fs.readFileSync('index.html', 'utf8');

    // Change all direct APK downloads to releases.html
    content = content.replace(/href="cricket_pro\.apk" download/g, 'href="releases.html"');

    // For the hero CTA row
    const playBadgeHtml = `<a href="https://play.google.com/store/apps/details?id=com.taimur.cricket_pro" target="_blank" rel="noopener" style="display:inline-block; margin-right: 8px;">
          <img alt="Get it on Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" height="52">
        </a>
        `;
    
    // Replace the first occurrence of <a class="btn btn-apk" href="releases.html"> with the badge + a secondary button
    const heroBtnMatch = `<a class="btn btn-apk" href="releases.html">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="lang-en">Download APK Free</span>
          <span class="lang-bn">ফ্রি APK ডাউনলোড</span>
        </a>`;
    // wait, I can just use a regex for the hero btn
    content = content.replace(/(<a class="btn btn-apk" href="releases\.html">[\s\S]*?<\/a>)/, playBadgeHtml + '\n$1');

    // The CTA band near the bottom
    const ctaBandRegex = /(<a class="btn white btn-apk" href="releases\.html">[\s\S]*?<\/a>)/;
    content = content.replace(ctaBandRegex, playBadgeHtml + '\n        $1');
    
    // In the CTA band, let's change the class of the APK button so it looks like a secondary
    content = content.replace(/<a class="btn white btn-apk" href="releases\.html">/, '<a class="btn ghost white btn-apk" href="releases.html">');

    // In the hero row, change the APK button to a secondary style by adding 'ghost'
    content = content.replace(/<a class="btn btn-apk" href="releases\.html">/, '<a class="btn ghost btn-apk" href="releases.html">');
    
    // Change "Download APK" text in hero to "Advanced: Sideload APK"
    content = content.replace(/<span class="lang-en">Download APK Free<\/span>/, '<span class="lang-en">Advanced: Sideload APK</span>');

    fs.writeFileSync('index.html', content);
}

main();
