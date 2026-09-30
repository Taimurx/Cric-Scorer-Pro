const fs = require('fs');
let content = fs.readFileSync('privacy.html', 'utf8');

const newContactBN = `      <div class="contact-box">
        <div class="contact-item">
          <span>✉️</span>
          <strong>ইমেইল সাপোর্ট:</strong>
          <a class="contact-btn" href="mailto:support@cric-scorer-pro.app">
            support@cric-scorer-pro.app
          </a>
        </div>
        <div class="contact-item">
          <span>📱</span>
          <strong>অ্যাপ্লিকেশন:</strong>
          <span>Cric Scorer Pro</span>
        </div>
      </div>`;

content = content.replace(/<div class="contact-box">[\s\S]*?\(অ্যান্ড্রয়েড\)<\/span>\s*<\/div>\s*<\/div>/, newContactBN);

fs.writeFileSync('privacy.html', content);
