import { lastSelected, getAccountsForHostname, supportReminder } from '@/utils/storage';

const manualTabIds = new Set<number>();

async function updateBadge(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url) {
      browser.browserAction.setBadgeText({ tabId, text: '' });
      return;
    }
    let hostname: string;
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      browser.browserAction.setBadgeText({ tabId, text: '' });
      return;
    }
    const accounts = await getAccountsForHostname(hostname);
    if (accounts.length > 1) {
      browser.browserAction.setBadgeText({ tabId, text: String(accounts.length) });
      browser.browserAction.setBadgeBackgroundColor({ tabId, color: '#0060df' });
    } else {
      browser.browserAction.setBadgeText({ tabId, text: '' });
    }
  } catch {
    browser.browserAction.setBadgeText({ tabId, text: '' });
  }
}

async function updateBadgeForActiveTab(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) await updateBadge(tabs[0].id);
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    const existing = await supportReminder.getValue();
    if (!existing) {
      await supportReminder.setValue({
        installedAt: Date.now(),
        lastDismissedAt: null,
        dismissCount: 0,
      });
    }
  });

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

  browser.tabs.onActivated.addListener((activeInfo) => {
    updateBadge(activeInfo.tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      updateBadge(tabId);
    }
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes['local:hostnameAccounts']) {
      updateBadgeForActiveTab();
    }
  });

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

  updateBadgeForActiveTab();
});
