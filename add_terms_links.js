const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(/<a href="privacy.html"><span class="lang-en">Privacy Policy<\/span><span class="lang-bn">প্রাইভেসি পলিসি<\/span><\/a>/g, `<a href="privacy.html"><span class="lang-en">Privacy Policy</span><span class="lang-bn">প্রাইভেসি পলিসি</span></a>
      <a href="terms.html"><span class="lang-en">Terms of Use</span><span class="lang-bn">ব্যবহারের শর্তাবলী</span></a>`);

fs.writeFileSync('index.html', content);

let privacy = fs.readFileSync('privacy.html', 'utf8');
privacy = privacy.replace(/<a href="\/privacy.html">Privacy Policy<\/a>/g, `<a href="/privacy.html">Privacy Policy</a> &nbsp;&middot;&nbsp; 
      <a href="/terms.html">Terms of Use</a>`);
fs.writeFileSync('privacy.html', privacy);
