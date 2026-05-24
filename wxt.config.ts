import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['contextualIdentities', 'cookies'],
    host_permissions: ['*://*.github.com/*', '*://*.google.com/*'], // Example, can be expanded
  },
});
