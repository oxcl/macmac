import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: [
      'contextualIdentities',
      'cookies',
      'tabs',
      'storage',
      'webNavigation',
      '<all_urls>',
    ],
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
