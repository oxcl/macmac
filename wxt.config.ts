import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['contextualIdentities', 'cookies', 'tabs', 'storage'],
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
