const fs = require('fs');
let content = fs.readFileSync('privacy.html', 'utf8');

const newContact = `      <div class="contact-box">
        <div class="contact-item">
          <span>✉️</span>
          <strong>Email Support:</strong>
          <a class="contact-btn" href="mailto:support@cric-scorer-pro.app">
            support@cric-scorer-pro.app
          </a>
        </div>
        <div class="contact-item">
          <span>📱</span>
          <strong>Application:</strong>
          <span>Cric Scorer Pro</span>
        </div>
      </div>`;

let parts = content.split('<!-- ================= BANGLA ================= -->');

parts[0] = parts[0].replace(/<div class="contact-box">[\s\S]*?Cric Scorer Pro \(Android\)<\/span>\s*<\/div>\s*<\/div>/, newContact);

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

parts[1] = parts[1].replace(/<div class="contact-box">[\s\S]*?Cric Scorer Pro \(Android\)<\/span>\s*<\/div>\s*<\/div>/, newContactBN);

fs.writeFileSync('privacy.html', parts.join('<!-- ================= BANGLA ================= -->'));
