import { lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';

export default defineBackground(() => {
  browser.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        const hostname = url.hostname;

        const map = await lastSelected.getValue();
        const containerId = map[hostname];

        if (!containerId) {
          return;
        }

        const currentTab = await browser.tabs.get(tabId);
        const currentCookieStoreId = currentTab.cookieStoreId;

        if (currentCookieStoreId === containerId) {
          return;
        }

        if (currentCookieStoreId !== DEFAULT_CONTAINER_ID) {
          return;
        }

        await browser.tabs.update(tabId, { cookieStoreId: containerId });
      } catch (err) {
        console.error('Error in background script:', err);
      }
    }
  });
});
