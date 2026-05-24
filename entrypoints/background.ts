import { lastSelected } from '@/utils/storage';

const manualTabIds = new Set<number>();

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      message: {
        type: string;
        tabId?: number;
        url?: string;
        cookieStoreId?: string;
        index?: number;
        oldTabId?: number;
      },
      _sender,
      sendResponse
    ) => {
      if (message.type === 'skipAutoSwitch' && message.tabId !== undefined) {
        manualTabIds.add(message.tabId);
      } else if (message.type === 'createTab' && message.url) {
        (async () => {
          try {
            const newTab = await browser.tabs.create({
              url: message.url,
              cookieStoreId: message.cookieStoreId,
              index: message.index,
            });
            if (newTab.id) manualTabIds.add(newTab.id);
            if (message.oldTabId) browser.tabs.remove(message.oldTabId);
          } catch (err) {
            console.error('[background] Error creating tab:', err);
          }
        })();
        sendResponse();
      }
    }
  );

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    if (manualTabIds.has(details.tabId)) {
      manualTabIds.delete(details.tabId);
      return;
    }

    try {
      const url = new URL(details.url);
      if (url.protocol === 'about:' || url.protocol === 'moz-extension:') return;

      const hostname = url.hostname;
      if (!hostname) return;

      const tab = await browser.tabs.get(details.tabId);
      const map = await lastSelected.getValue();
      const containerId = map[hostname];
      const isDefault = !tab.cookieStoreId || tab.cookieStoreId === 'firefox-default';

      if (!containerId) {
        if (isDefault) return;
        const newTab = await browser.tabs.create({
          url: details.url,
          index: tab.index,
        });
        if (newTab.id) manualTabIds.add(newTab.id);
        browser.tabs.remove(details.tabId);
        return;
      }

      if (tab.cookieStoreId === containerId) return;

      const newTab = await browser.tabs.create({
        url: details.url,
        cookieStoreId: containerId,
        index: tab.index,
      });
      if (newTab.id) manualTabIds.add(newTab.id);
      browser.tabs.remove(details.tabId);
    } catch (err) {
      console.error('[background] Error switching tab:', err);
    }
  });
});
