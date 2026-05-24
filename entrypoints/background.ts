import { lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';

const manualTabIds = new Set<number>();

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: { type: string; tabId?: number }) => {
    if (message.type === 'skipAutoSwitch' && message.tabId !== undefined) {
      manualTabIds.add(message.tabId);
    }
  });

  browser.tabs.onUpdated.addListener(
    async (tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        try {
          if (manualTabIds.has(tabId)) {
            manualTabIds.delete(tabId);
            return;
          }

          const url = new URL(tab.url);
          const hostname = url.hostname;

          const map = await lastSelected.getValue();
          const containerId = map[hostname];

          if (!containerId) {
            return;
          }

          await browser.tabs.update(tabId, { cookieStoreId: containerId });
        } catch (err) {
          console.error('Error in background script:', err);
        }
      }
    }
  );
});
