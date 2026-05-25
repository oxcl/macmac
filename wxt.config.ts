import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    homepage_url: 'https://oxcl.github.io/macmac',
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
