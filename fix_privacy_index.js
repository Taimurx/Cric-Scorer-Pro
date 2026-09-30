const fs = require('fs');
let content = fs.readFileSync('privacy.html', 'utf8');

const target1Start = content.indexOf('<div class="contact-box">');
const target1End = content.indexOf('</div>\n    </div>', target1Start);

const target2Start = content.indexOf('<div class="contact-box">', target1End);
const target2End = content.indexOf('</div>\n    </div>', target2Start);

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

content = content.substring(0, target1Start) + newContactEN + content.substring(target1End, target2Start) + newContactBN + content.substring(target2End);

fs.writeFileSync('privacy.html', content);
