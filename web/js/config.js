/**
 * Cric Scorer Pro — Centralized Client Configuration
 */
(function(global) {
  'use strict';

  const Config = {
    apiBaseUrl: 'https://cric-scorer-pro.app/api',
    appUrl: 'https://cric-scorer-pro.app',
    features: {
      enableAudio: true,
      enableVoiceCommentary: true,
      enableOfflineSync: true,
    },
    auth: {
      googleClientId: '889324711628-h52akp3rti8rffg4r1mhre14ahmgubq7.apps.googleusercontent.com'
    }
  };

  global.CpsConfig = Config;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
  }
})(typeof window !== 'undefined' ? window : globalThis);
