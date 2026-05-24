import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: [
      'contextualIdentities',
      'cookies',
      'tabs',
      'storage',
      'webRequestBlocking',
      '<all_urls>',
    ],
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
