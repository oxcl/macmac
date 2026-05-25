import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    homepage_url: 'https://oxcl.github.io/macmac',
    permissions: [
      'contextualIdentities',
      'tabs',
      'storage',
      'webNavigation',
    ],
    browser_specific_settings: {
      gecko: {
        id: "@oxcl.macmac",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    },
  },
});
