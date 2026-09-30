const fs = require('fs');

let content = fs.readFileSync('privacy.html', 'utf8');

const regexEN = /<div class="contact-box">[\s\S]*?Cric Scorer Pro \(Android\)<\/span>\s*<\/div>\s*<\/div>/;
const regexBN = /<div class="contact-box">[\s\S]*?ক্রিক স্কোরার প্রো \(অ্যান্ড্রয়েড\)<\/span>\s*<\/div>\s*<\/div>/;

const newContactEN = `      <div class="contact-box">
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

content = content.replace(regexEN, newContactEN);
content = content.replace(regexBN, newContactBN);

fs.writeFileSync('privacy.html', content);
