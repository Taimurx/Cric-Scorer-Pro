const fs = require('fs');

function main() {
    let content = fs.readFileSync('privacy.html', 'utf8');

    // Simple replacements
    content = content.replace(/2\.0\.10/g, '2.0.11');
    content = content.replace(/Vercel \/ Netlify/g, 'Vercel');
    content = content.replace(/100% offline/g, 'offline');

    // EN Contact Replacement
    const oldContactEN = `      <div class="contact-box">
        <div class="contact-item">
          <span>💬</span>
          <strong>WhatsApp Support:</strong>
          <span>+880 1934-000086</span>
          <a class="contact-btn" href="https://wa.me/8801934000086" target="_blank" rel="noopener">
            Chat on WhatsApp &rarr;
          </a>
        </div>
        <div class="contact-item">
          <span>🌐</span>
          <strong>Developer Facebook:</strong>
          <a class="contact-btn fb" href="https://www.facebook.com/TaimurShakiB" target="_blank" rel="noopener">
            facebook.com/TaimurShakiB
          </a>
        </div>
        <div class="contact-item">
          <span>📱</span>
          <strong>Application:</strong>
          <span>Cric Scorer Pro (Android)</span>
        </div>
      </div>`;

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

    content = content.replace(oldContactEN, newContactEN);

    // BN Contact Replacement
    const oldContactBN = `      <div class="contact-box">
        <div class="contact-item">
          <span>💬</span>
          <strong>হোয়াটসঅ্যাপ সাপোর্ট:</strong>
          <span>+880 1934-000086</span>
          <a class="contact-btn" href="https://wa.me/8801934000086" target="_blank" rel="noopener">
            হোয়াটসঅ্যাপে মেসেজ দিন &rarr;
          </a>
        </div>
        <div class="contact-item">
          <span>🌐</span>
          <strong>ডেভেলপার ফেসবুক:</strong>
          <a class="contact-btn fb" href="https://www.facebook.com/TaimurShakiB" target="_blank" rel="noopener">
            facebook.com/TaimurShakiB
          </a>
        </div>
        <div class="contact-item">
          <span>📱</span>
          <strong>অ্যাপ্লিকেশন:</strong>
          <span>ক্রিক স্কোরার প্রো (অ্যান্ড্রয়েড)</span>
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

    content = content.replace(oldContactBN, newContactBN);

    fs.writeFileSync('privacy.html', content);
}

main();
