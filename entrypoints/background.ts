import { registerService } from '@webext-core/proxy-service';
import {
  lastSelected,
  getAccountsForHostname,
  supportReminder,
  DEFAULT_CONTAINER_ID,
} from '@/utils/storage';
import { TAB_SERVICE_KEY, type TabService, type TabBinding } from '@/utils/tab-service';

const tabBindings = new Map<number, TabBinding>();
const pendingSwitches = new Set<number>();

const tabServiceImpl: TabService = {
  async openInContainer(url, cookieStoreId, index, replaceCurrentTabId) {
    const newTab = await browser.tabs.create({ url, cookieStoreId, index });
    if (newTab.id) {
      const hostname = new URL(url).hostname;
      tabBindings.set(newTab.id, { hostname, cookieStoreId });
      pendingSwitches.add(newTab.id);
    }
    if (replaceCurrentTabId) browser.tabs.remove(replaceCurrentTabId);
  },

  async openInDefault(url, index, replaceCurrentTabId) {
    const newTab = await browser.tabs.create({ url, index });
    if (newTab.id) {
      const hostname = new URL(url).hostname;
      tabBindings.set(newTab.id, { hostname, cookieStoreId: DEFAULT_CONTAINER_ID });
      pendingSwitches.add(newTab.id);
    }
    if (replaceCurrentTabId) browser.tabs.remove(replaceCurrentTabId);
  },

  cleanupBindingsForContainer(cookieStoreId) {
    for (const [tabId, binding] of tabBindings) {
      if (binding.cookieStoreId === cookieStoreId) {
        tabBindings.delete(tabId);
      }
    }
  },

  getTabBinding(tabId) {
    return tabBindings.get(tabId) ?? null;
  },
};

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
  registerService(TAB_SERVICE_KEY, tabServiceImpl);

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

  browser.tabs.onActivated.addListener((activeInfo) => {
    updateBadge(activeInfo.tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      updateBadge(tabId);
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    tabBindings.delete(tabId);
    pendingSwitches.delete(tabId);
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes['local:hostnameAccounts']) {
      updateBadgeForActiveTab();
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    if (pendingSwitches.has(details.tabId)) {
      pendingSwitches.delete(details.tabId);
      return;
    }

    try {
      const url = new URL(details.url);
      if (url.protocol === 'about:' || url.protocol === 'moz-extension:') return;

      const hostname = url.hostname;
      if (!hostname) return;

      const binding = tabBindings.get(details.tabId);
      if (binding && binding.hostname === hostname) return;

      if (binding && binding.hostname !== hostname) {
        tabBindings.delete(details.tabId);
      }

      const tab = await browser.tabs.get(details.tabId);
      const map = await lastSelected.getValue();
      const containerId = map[hostname];
      const isDefault = !tab.cookieStoreId || tab.cookieStoreId === DEFAULT_CONTAINER_ID;

      if (!containerId) {
        if (isDefault) return;
        await tabServiceImpl.openInDefault(details.url, tab.index, details.tabId);
        return;
      }

      if (tab.cookieStoreId === containerId) {
        tabBindings.set(details.tabId, { hostname, cookieStoreId: containerId });
        return;
      }

      await tabServiceImpl.openInContainer(details.url, containerId, tab.index, details.tabId);
    } catch (err) {
      console.error('[background] Error switching tab:', err);
    }
  });

  updateBadgeForActiveTab();
});
