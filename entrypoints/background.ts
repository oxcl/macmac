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

  // Firefox supports async listeners for onBeforeRequest, but the standard
  // WebExtension types only allow sync returns. Cast to accept Promise returns.
  (
    browser.webRequest.onBeforeRequest.addListener as (
      callback: (
        details: Browser.webRequest.OnBeforeRequestDetails
      ) =>
        | Browser.webRequest.BlockingResponse
        | undefined
        | Promise<Browser.webRequest.BlockingResponse | undefined>,
      filter: Browser.webRequest.RequestFilter,
      extraInfoSpec: string[]
    ) => void
  )(
    async (details) => {
      if (details.frameId !== 0 || details.tabId === -1) {
        return {};
      }

      if (manualTabIds.has(details.tabId)) {
        manualTabIds.delete(details.tabId);
        return {};
      }

      try {
        const url = new URL(details.url);
        if (url.protocol === 'about:' || url.protocol === 'moz-extension:') {
          return {};
        }

        const hostname = url.hostname;
        const tab = await browser.tabs.get(details.tabId);

        const map = await lastSelected.getValue();
        const containerId = map[hostname];

        const isDefault = !tab.cookieStoreId || tab.cookieStoreId === 'firefox-default';

        if (!containerId) {
          if (isDefault) return {};
          const newTab = await browser.tabs.create({
            url: details.url,
            index: tab.index,
          });
          if (newTab.id) manualTabIds.add(newTab.id);
          browser.tabs.remove(details.tabId);
          return { cancel: true };
        }

        if (tab.cookieStoreId === containerId) {
          return {};
        }

        const newTab = await browser.tabs.create({
          url: details.url,
          cookieStoreId: containerId,
          index: tab.index,
        });
        if (newTab.id) manualTabIds.add(newTab.id);
        browser.tabs.remove(details.tabId);
        return { cancel: true };
      } catch (err) {
        console.error('[background] Error switching tab:', err);
        return {};
      }
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
    ['blocking']
  );
});
