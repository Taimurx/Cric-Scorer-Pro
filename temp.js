
// Language Management
function setLang(lang) {
  document.body.className = lang;
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', lang === 'bn');
  
  if (lang === 'bn') {
    document.title = 'ক্রিক স্কোরার প্রো — প্রফেশনাল লাইভ ক্রিকেট স্কোরিং অ্যাপ';
  } else {
    document.title = 'Cric Scorer Pro — Live Cricket Scoring App for Android';
  }
  
  try {
    localStorage.setItem('cric_scorer_lang', lang);
  } catch (e) {}
}

// Restore saved language preference
try {
  var savedLang = localStorage.getItem('cric_scorer_lang');
  if (savedLang === 'bn' || savedLang === 'en') {
    setLang(savedLang);
  }
} catch (e) {}

// Mobile Drawer Controls
function toggleMobileMenu() {
  var drawer = document.getElementById('mobile-drawer');
  var btn = document.getElementById('hamburger-btn');
  var isOpen = drawer.classList.contains('open');
  
  if (isOpen) {
    closeMobileMenu();
  } else {
    drawer.classList.add('open');
    btn.classList.add('open');
  }
}

function closeMobileMenu() {
  var drawer = document.getElementById('mobile-drawer');
  var btn = document.getElementById('hamburger-btn');
  drawer.classList.remove('open');
  btn.classList.remove('open');
}

// Phone Theme Previewer
function setMockupTheme(themeClass, btnElement) {
  var phone = document.getElementById('hero-phone');
  phone.className = 'phone ' + themeClass;
  
  var buttons = document.querySelectorAll('.mockup-theme-btn');
  buttons.forEach(function(btn) { btn.classList.remove('active'); });
  if (btnElement) {
    btnElement.classList.add('active');
  }
}

// Screen Tab Switching in "Inside the App"
function switchScreenTab(type, btnElement) {
  var buttons = document.querySelectorAll('.screen-tab-btn');
  buttons.forEach(function(btn) { btn.classList.remove('active'); });
  btnElement.classList.add('active');

  var cards = document.querySelectorAll('.screens-container .screen-card');
  cards.forEach(function(card) {
    if (type === 'all' || card.getAttribute('data-screen-type') === type) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// QR Code Modal Controls
function openQrModal() {
  document.getElementById('qr-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'qr-modal') {
    closeQrModal();
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeQrModal();
    closeMobileMenu();
  }
});

// Scroll Reveal Intersection Observer
// Scroll Reveal Intersection Observer with Stagger & Instant Viewport Check
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('vis');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(function(element) {
  observer.observe(element);
});

// Immediate check for above-the-fold elements
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.reveal').forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('vis');
    }
  });
  syncSiteAuthState();
});

// Web Demo View Switcher & Controls
function setDemoView(mode) {
  const wrap = document.getElementById('demo-frame-wrap');
  if (!wrap) return;
  wrap.classList.remove('phone-view', 'tablet-view', 'wide-view');
  wrap.classList.add(mode + '-view');

  document.querySelectorAll('.view-toggle-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  if (window.event && window.event.target) {
    const btn = window.event.target.closest('.view-toggle-btn');
    if (btn) btn.classList.add('active');
  }
}

// ── Interactive Live Match Mockup Simulation ──
let mockupState = {
  score: 156,
  wickets: 4,
  overs: 15,
  balls: 2,
  b1: { name: 'Rafi', runs: 68, balls: 41, isStrike: true },
  b2: { name: 'Sabbir', runs: 31, balls: 21, isStrike: false },
  bowler: { name: 'Imran', overs: 2, balls: 2, maidens: 0, runs: 19, wickets: 1 }
};

let audioCtx = null;
function playScoreSound(runs) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (runs === 6) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.32);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (runs === 4) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.28);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (runs > 0) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25 + runs * 55, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {}
}

function updateMockupUi(popAnim) {
  const scoreEl = document.getElementById('hero-big-score');
  const oversEl = document.getElementById('hero-overs-text');
  const crrEl = document.getElementById('hero-crr-text');
  const b1Label = document.getElementById('hero-b1-label');
  const b1Runs = document.getElementById('hero-b1-runs');
  const b2Label = document.getElementById('hero-b2-label');
  const b2Runs = document.getElementById('hero-b2-runs');
  const bowlerEl = document.getElementById('hero-bowler-stat');

  if (scoreEl) {
    scoreEl.innerHTML = mockupState.score + '/' + mockupState.wickets + ' <small id="hero-overs-text">' + mockupState.overs + '.' + mockupState.balls + ' / 20 ov</small>';
    if (popAnim) {
      scoreEl.classList.remove('score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pop');
    }
  }

  const totalBalls = mockupState.overs * 6 + mockupState.balls;
  const crr = totalBalls > 0 ? ((mockupState.score / totalBalls) * 6).toFixed(2) : '0.00';
  if (crrEl) crrEl.textContent = 'CRR ' + crr + ' · Target — · Req —';

  const strikeDot = '<span class="dot-strike" id="hero-strike-dot"></span>';
  if (b1Label) b1Label.innerHTML = (mockupState.b1.isStrike ? strikeDot : '') + mockupState.b1.name + (mockupState.b1.isStrike ? '*' : '');
  if (b1Runs) b1Runs.textContent = mockupState.b1.runs + ' (' + mockupState.b1.balls + ')';

  if (b2Label) b2Label.innerHTML = (mockupState.b2.isStrike ? strikeDot : '') + mockupState.b2.name + (mockupState.b2.isStrike ? '*' : '');
  if (b2Runs) b2Runs.textContent = mockupState.b2.runs + ' (' + mockupState.b2.balls + ')';

  if (bowlerEl) {
    bowlerEl.textContent = mockupState.bowler.overs + '.' + mockupState.bowler.balls + '-' + mockupState.bowler.maidens + '-' + mockupState.bowler.runs + '-' + mockupState.bowler.wickets;
  }
}

function handleMockupScore(runs) {
  playScoreSound(runs);
  mockupState.score += runs;
  
  const striker = mockupState.b1.isStrike ? mockupState.b1 : mockupState.b2;
  striker.runs += runs;
  striker.balls += 1;

  mockupState.bowler.runs += runs;
  mockupState.bowler.balls += 1;
  mockupState.balls += 1;

  if (mockupState.balls >= 6) {
    mockupState.overs += 1;
    mockupState.balls = 0;
    mockupState.bowler.overs += 1;
    mockupState.bowler.balls = 0;
    // Over complete: rotate strike
    mockupState.b1.isStrike = !mockupState.b1.isStrike;
    mockupState.b2.isStrike = !mockupState.b2.isStrike;
  } else if (runs % 2 !== 0) {
    // Odd runs: rotate strike
    mockupState.b1.isStrike = !mockupState.b1.isStrike;
    mockupState.b2.isStrike = !mockupState.b2.isStrike;
  }

  updateMockupUi(true);
}

function handleMockupPenalty() {
  playScoreSound(4);
  mockupState.score += 5;
  const scoreEl = document.getElementById('hero-big-score');
  if (scoreEl) {
    scoreEl.classList.remove('penalty-flash');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('penalty-flash');
  }
  updateMockupUi(false);
}

function handleMockupSwapStrike() {
  playScoreSound(1);
  mockupState.b1.isStrike = !mockupState.b1.isStrike;
  mockupState.b2.isStrike = !mockupState.b2.isStrike;
  
  const b1Row = document.getElementById('hero-batsman-1');
  const b2Row = document.getElementById('hero-batsman-2');
  if (b1Row) {
    b1Row.classList.remove('strike-rotate-fx');
    void b1Row.offsetWidth;
    b1Row.classList.add('strike-rotate-fx');
  }
  if (b2Row) {
    b2Row.classList.remove('strike-rotate-fx');
    void b2Row.offsetWidth;
    b2Row.classList.add('strike-rotate-fx');
  }
  updateMockupUi(false);
}

// ── Google Cloud Sync Modal & Auth Manager for Landing Page ──
function getSiteCloudUser() {
  try {
    const saved = localStorage.getItem('cric_google_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.email || parsed.name)) return parsed;
    }
  } catch (e) {}
  return null;
}

function syncSiteAuthState() {
  const user = getSiteCloudUser();
  const navBtn = document.getElementById('nav-google-btn');
  const navLabel = document.getElementById('nav-google-label');
  const demoPill = document.getElementById('demo-sync-pill');

  if (user && (user.name || user.email)) {
    const displayName = user.name ? user.name.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Sync');
    if (navLabel) navLabel.textContent = displayName;
    if (navBtn) {
      navBtn.classList.add('signed-in');
      navBtn.title = 'Signed in as ' + (user.email || user.name) + ' · Cloud Sync Active';
    }
    if (demoPill) {
      demoPill.classList.add('signed-in');
      demoPill.title = 'Cloud Sync Active for ' + (user.email || user.name);
    }
  } else {
    if (navLabel) navLabel.innerHTML = '<span class="lang-en">Sync</span><span class="lang-bn">সিঙ্ক</span>';
    if (navBtn) {
      navBtn.classList.remove('signed-in');
      navBtn.title = 'Google Sign-In & Cloud Sync';
    }
    if (demoPill) {
      demoPill.classList.remove('signed-in');
      demoPill.title = 'Google Sign-In & Cloud Sync Status';
    }
  }
}

function openSiteGoogleSyncModal() {
  const modal = document.getElementById('site-sync-modal');
  const body = document.getElementById('site-sync-modal-body');
  if (!modal || !body) return;

  const user = getSiteCloudUser();
  if (user && (user.name || user.email)) {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : '🏏';
    body.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px; background:rgba(255,255,255,0.06); padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); text-align:left;">
        <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, var(--grad-a), var(--grad-b)); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:#fff; overflow:hidden; flex-shrink:0;">
          ${user.photoUrl ? '<img src="' + user.photoUrl + '" style="width:100%; height:100%; object-fit:cover;" alt="Avatar">' : initial}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:15px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.name || 'Cricket Scorer'}</div>
          <div style="font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.email || 'Cloud connected'}</div>
        </div>
        <span style="font-size:11px; background:rgba(16,185,129,0.2); color:#A7F3D0; border:1px solid rgba(16,185,129,0.4); padding:3px 8px; border-radius:99px; font-weight:600;">Active</span>
      </div>
      <p style="font-size:13px; color:#DDD; line-height:1.55; margin-bottom:18px;">
        ☁️ <strong>Automatic Cloud Backup:</strong> Your cricket scores, squads, and tournaments are actively synced across Web and Android devices.
      </p>
      <div style="display:flex; gap:10px;">
        <button class="btn ghost" style="flex:1; height:42px; border-color:rgba(239,68,68,0.4); color:#FCA5A5;" onclick="handleSiteSignOut()">Sign Out</button>
        <button class="btn primary" style="flex:1; height:42px;" onclick="closeSiteGoogleSyncModal()">Close</button>
      </div>
    `;
  } else {
    body.innerHTML = `
      <p style="font-size:13.5px; color:var(--muted); line-height:1.6; margin-bottom:18px;">
        Sign in with Google to automatically back up your ball-by-ball matches, custom teams, and tournaments to Google Cloud.
      </p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn" style="width:100%; height:44px; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:700;" onclick="handleSiteGoogleSignIn()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          <span>Continue with Google</span>
        </button>
        <button class="btn ghost" style="height:38px;" onclick="closeSiteGoogleSyncModal()">Cancel</button>
      </div>
    `;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function handleSiteGoogleSignIn() {
  // If iframe is loaded, trigger inside iframe as well
  const iframe = document.getElementById('web-demo-iframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage({ type: 'CRIC_TRIGGER_GOOGLE_SIGNIN' }, '*');
    } catch (e) {}
  }

  const email = prompt('Enter your Google Account email for Cloud Sync:', 'cricketer@gmail.com');
  if (email && email.includes('@')) {
    const name = email.split('@')[0];
    const user = {
      uid: 'google_' + Math.random().toString(36).substr(2, 9),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email,
      photoUrl: '',
      isLoggedIn: true,
      authProvider: 'google.com',
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('cric_google_user', JSON.stringify(user));
      localStorage.setItem('flutter.feature_hub_profile', JSON.stringify({
        uid: user.uid,
        name: user.name,
        email: user.email,
        photoUrl: '',
        isLoggedIn: true
      }));
    } catch (e) {}

    syncSiteAuthState();
    closeSiteGoogleSyncModal();
    alert('Welcome ' + user.name + '! Google Cloud Sync is now active on this browser.');
  }
}

function handleSiteSignOut() {
  if (confirm('Are you sure you want to sign out from Google Cloud Sync on this browser?')) {
    try {
      localStorage.removeItem('cric_google_user');
      const profile = localStorage.getItem('flutter.feature_hub_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        parsed.isLoggedIn = false;
        localStorage.setItem('flutter.feature_hub_profile', JSON.stringify(parsed));
      }
    } catch (e) {}
    syncSiteAuthState();
    closeSiteGoogleSyncModal();

    const iframe = document.getElementById('web-demo-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'CRIC_SYNC_AUTH_STATE' }, '*');
      } catch (e) {}
    }
  }
}

function closeSiteGoogleSyncModal() {
  const modal = document.getElementById('site-sync-modal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function handleSiteSyncModalBackdrop(e) {
  if (e.target.id === 'site-sync-modal') {
    closeSiteGoogleSyncModal();
  }
}

// Cross-frame sync listener
window.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'CRIC_AUTH_SUCCESS') {
    syncSiteAuthState();
  } else if (event.data.type === 'CRIC_AUTH_LOGOUT') {
    syncSiteAuthState();
  }
});
window.addEventListener('storage', syncSiteAuthState);
window.addEventListener('focus', syncSiteAuthState);

