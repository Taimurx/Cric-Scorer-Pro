/**
 * Cric Scorer Pro — Unified Cross-Site Theme Manager (Web Suite Asset)
 * Supports: Sunrise, Ocean, Midnight, Stadium Green, Sunlight Contrast, Royal Violet
 * Handles persistence, cross-tab synchronization, browser theme-color meta tags, and hero mockup syncing.
 */
(function(window) {
  'use strict';

  var THEMES = [
  { id: 'sunrise', nameEn: 'Sunrise', nameBn: 'সূর্যোদয়', icon: '🌅', color: '#E0567B', metaColor: '#E0567B', vars: {'--bg':'#FFFAF0', '--text':'#333333', '--primary':'#FF5722', '--accent':'#FF9800', '--btn-bg':'#FFE0B2', '--btn-active':'#FFCC80', '--border-color':'rgba(255, 152, 0, 0.4)'} },
  { id: 'ocean', nameEn: 'Ocean', nameBn: 'সাগর', icon: '🌊', color: '#0284C7', metaColor: '#0284C7', vars: {'--bg':'#F0F8FF', '--text':'#0F172A', '--primary':'#0284C7', '--accent':'#38BDF8', '--btn-bg':'#E0F2FE', '--btn-active':'#BAE6FD', '--border-color':'rgba(2, 132, 199, 0.3)'} },
  { id: 'midnight', nameEn: 'Midnight', nameBn: 'মাঝরাত', icon: '🌌', color: '#10B981', metaColor: '#0B0F19', vars: {'--bg':'#0B0F19', '--text':'#F8FAFC', '--primary':'#10B981', '--accent':'#34D399', '--btn-bg':'#1E293B', '--btn-active':'#334155', '--border-color':'rgba(16, 185, 129, 0.3)'} },
  { id: 'stadium', nameEn: 'Stadium Green', nameBn: 'স্টেডিয়াম', icon: '🏟️', color: '#10B981', metaColor: '#081C15', vars: {'--bg':'#081C15', '--text':'#E2E8F0', '--primary':'#10B981', '--accent':'#F59E0B', '--btn-bg':'#1B4332', '--btn-active':'#2D6A4F', '--border-color':'rgba(16, 185, 129, 0.3)'} },
  { id: 'sunlight', nameEn: 'Sunlight Contrast', nameBn: 'সূর্যালোক', icon: '☀️', color: '#D97706', metaColor: '#FFFFFF', vars: {'--bg':'#FFFFFF', '--text':'#000000', '--primary':'#D97706', '--accent':'#F59E0B', '--btn-bg':'#FEF3C7', '--btn-active':'#FDE68A', '--border-color':'rgba(217, 119, 6, 0.3)'} },
  { id: 'royal', nameEn: 'Royal Violet', nameBn: 'রাজকীয়', icon: '👑', color: '#8B5CF6', metaColor: '#120F1F', vars: {'--bg':'#120F1F', '--text':'#F3E8FF', '--primary':'#8B5CF6', '--accent':'#EC4899', '--btn-bg':'#2E1065', '--btn-active':'#4C1D95', '--border-color':'rgba(139, 92, 246, 0.3)'} }
];

  var STORAGE_KEY = 'cps_theme';
  var DEFAULT_THEME = 'sunrise';

  var ThemeManager = {
    themes: THEMES,

    getTheme: function() {
      try {
        var storage = (window && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
        var saved = storage ? (storage.getItem(STORAGE_KEY) || storage.getItem('flutter.cricket_theme_v3')) : null;
        if (saved && THEMES.some(function(t) { return t.id === saved; })) {
          return saved;
        }
      } catch (e) {
        console.warn('ThemeManager: LocalStorage access denied', e);
      }
      return DEFAULT_THEME;
    },

    setTheme: function(themeId, triggerSource) {
      if (!THEMES.some(function(t) { return t.id === themeId; })) {
        themeId = DEFAULT_THEME;
      }

      try {
        var storage = (window && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
        if (storage) {
          storage.setItem(STORAGE_KEY, themeId);
          storage.setItem('flutter.cricket_theme_v3', '"' + themeId + '"');
          storage.setItem('flutter.selected_theme', '"' + themeId + '"');
        }
      } catch (e) { /* ignore */ }

      var doc = (typeof document !== 'undefined') ? document : (window && window.document);
      var activeThemeObj = THEMES.find(function(t) { return t.id === themeId; });

      if (doc) {
        // Apply data-theme and variables on documentElement (HTML root)
        if (doc.documentElement && doc.documentElement.setAttribute) {
          doc.documentElement.setAttribute('data-theme', themeId);
          if (activeThemeObj && activeThemeObj.vars) {
            for (var key in activeThemeObj.vars) {
              doc.documentElement.style.setProperty(key, activeThemeObj.vars[key]);
            }
          }
        }
        if (doc.body && doc.body.setAttribute) {
          doc.body.setAttribute('data-theme', themeId);
        }

        // Update mobile browser address bar meta color
        var metaThemeColor = doc.querySelector ? doc.querySelector('meta[name="theme-color"]') : null;
        if (metaThemeColor && activeThemeObj && metaThemeColor.setAttribute) {
          metaThemeColor.setAttribute('content', activeThemeObj.metaColor);
        }

        // Update phone mockup in hero section if present
        var heroPhone = doc.getElementById ? doc.getElementById('hero-phone') : null;
        if (heroPhone) {
          heroPhone.className = 'phone theme-' + themeId;
        }

        // Update active state of mockup buttons
        var mockupBtns = doc.querySelectorAll ? doc.querySelectorAll('.mockup-theme-btn') : [];
        if (mockupBtns && mockupBtns.forEach) {
          mockupBtns.forEach(function(btn) {
            var btnTheme = btn.getAttribute ? (btn.getAttribute('data-theme-id') || btn.getAttribute('onclick')) : '';
            if (btnTheme && btnTheme.indexOf(themeId) !== -1) {
              if (btn.classList) btn.classList.add('active');
            } else {
              if (btn.classList) btn.classList.remove('active');
            }
          });
        }

        // Update active state of navbar / dock theme items
        var navThemeBtns = doc.querySelectorAll ? doc.querySelectorAll('.theme-picker-item, .dock-theme-item') : [];
        if (navThemeBtns && navThemeBtns.forEach) {
          navThemeBtns.forEach(function(btn) {
            if (btn.getAttribute && btn.getAttribute('data-theme') === themeId) {
              if (btn.classList) btn.classList.add('active');
            } else {
              if (btn.classList) btn.classList.remove('active');
            }
          });
        }

        // Update dock theme icon if present
        var dockIcon = doc.getElementById ? doc.getElementById('dock-theme-icon') : null;
        if (dockIcon && activeThemeObj) {
          dockIcon.textContent = activeThemeObj.icon;
        }

        // Update navbar toggle button icon if present
        var currentThemeIcon = doc.getElementById ? doc.getElementById('nav-theme-current-icon') : null;
        if (currentThemeIcon && activeThemeObj) {
          currentThemeIcon.textContent = activeThemeObj.icon;
        }
      }

      // Dispatch event for any custom listeners
      try {
        if (window && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cps-theme-changed', {
            detail: { theme: themeId, themeObj: activeThemeObj, source: triggerSource || 'direct' }
          }));
        }
      } catch (e) { /* ignore */ }

      return themeId;
    },

    init: function() {
      var current = this.getTheme();
      this.setTheme(current, 'init');

      // Listen for cross-tab or cross-page changes
      if (window && window.addEventListener) {
        window.addEventListener('storage', function(e) {
          if ((e.key === STORAGE_KEY || e.key === 'flutter.cricket_theme_v3') && e.newValue) {
            ThemeManager.setTheme(e.newValue, 'storage');
          }
        });
      }
    }
  };

  // Immediate execution if DOM is ready, or on DOMContentLoaded
  var doc = (typeof document !== 'undefined') ? document : (window && window.document);
  if (doc) {
    if (doc.readyState === 'loading') {
      if (doc.addEventListener) {
        doc.addEventListener('DOMContentLoaded', function() {
          ThemeManager.init();
        });
      }
    } else {
      ThemeManager.init();
    }
  }

  // Attach to window if available
  if (window) {
    window.CpsThemeManager = ThemeManager;
    window.setMockupTheme = function(themeClassOrId) {
      var themeId = themeClassOrId.replace(/^theme-/, '');
      ThemeManager.setTheme(themeId, 'mockup');
    };
    window.setAppTheme = function(themeId) {
      ThemeManager.setTheme(themeId, 'app');
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
