import { lastSelected } from '@/utils/storage';

const manualTabIds = new Set<number>();

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: { type: string; tabId?: number }) => {
    if (message.type === 'skipAutoSwitch' && message.tabId !== undefined) {
      manualTabIds.add(message.tabId);
    }
  });

  browser.tabs.onUpdated.addListener(
    async (tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) => {
      if (changeInfo.status === 'loading' && tab.url) {
        try {
          if (manualTabIds.has(tabId)) {
            manualTabIds.delete(tabId);
            return;
          }

          const url = new URL(tab.url);
          const hostname = url.hostname;

          const map = await lastSelected.getValue();
          const containerId = map[hostname];

          const isDefault = !tab.cookieStoreId || tab.cookieStoreId === 'firefox-default';

          if (!containerId) {
            if (isDefault) return;
            const newTab = await browser.tabs.create({ url: tab.url, index: tab.index });
            if (newTab.id) manualTabIds.add(newTab.id);
            await browser.tabs.remove(tabId);
            return;
          }

          if (tab.cookieStoreId === containerId) {
            return;
          }

          const newTab = await browser.tabs.create({
            url: tab.url,
            cookieStoreId: containerId,
            index: tab.index,
          });
          if (newTab.id) {
            manualTabIds.add(newTab.id);
          }
          await browser.tabs.remove(tabId);
        } catch (err) {
          console.error('[background] Error switching tab:', err);
        }
      }
    }
  );
});
