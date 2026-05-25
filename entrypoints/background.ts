import { registerService } from '@webext-core/proxy-service';
import { StorageService } from '@/services/storage';
import { TAB_SERVICE_KEY, type TabService, type TabBinding, getHostname } from '@/services/tabs';

// Tracks which container each tab is currently bound to. When the popup opens
// a tab in a specific container, it registers the binding here so the
// auto-switch logic knows the tab is already in the right container and won't
// try to switch it again on same-hostname navigations.
const tabBindings = new Map<number, TabBinding>();

// Tab IDs that were just created by the service (e.g. via openInContainer or
// openInDefault). The next onBeforeNavigate event for these tabs is ignored to
// prevent the auto-switch logic from firing on the very navigation that the
// service itself initiated, which would cause an infinite loop of tab creation.
const pendingSwitches = new Set<number>();

function registerNewTab(tab: Browser.tabs.Tab, url: string, cookieStoreId: string): void {
  if (!tab.id) return;
  const hostname = getHostname(url);
  if (!hostname) return;
  tabBindings.set(tab.id, { hostname, cookieStoreId });
  pendingSwitches.add(tab.id);
}

const tabServiceImpl: TabService = {
  async openInContainer(url, cookieStoreId, index, replaceCurrentTabId) {
    const newTab = await browser.tabs.create({ url, cookieStoreId, index });
    registerNewTab(newTab, url, cookieStoreId);
    if (replaceCurrentTabId) browser.tabs.remove(replaceCurrentTabId);
  },

  async openInDefault(url, index, replaceCurrentTabId) {
    const newTab = await browser.tabs.create({ url, index });
    registerNewTab(newTab, url, StorageService.DEFAULT_CONTAINER_ID);
    if (replaceCurrentTabId) browser.tabs.remove(replaceCurrentTabId);
  },

  async openInAccount(url, accountId, index, replaceCurrentTabId) {
    if (accountId === StorageService.DEFAULT_CONTAINER_ID) {
      await this.openInDefault(url, index, replaceCurrentTabId);
    } else {
      await this.openInContainer(url, accountId, index, replaceCurrentTabId);
    }
  },

  cleanupBindingsForContainer(cookieStoreId) {
    for (const [tabId, binding] of tabBindings) {
      if (binding.cookieStoreId === cookieStoreId) {
        tabBindings.delete(tabId);
      }
    }
  },

  getTabBinding(tabId) {
    return Promise.resolve(tabBindings.get(tabId) ?? null);
  },
};

async function updateBadge(tabId: number): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url) {
      browser.browserAction.setBadgeText({ tabId, text: '' });
      return;
    }
    const hostname = getHostname(tab.url);
    if (!hostname) {
      browser.browserAction.setBadgeText({ tabId, text: '' });
      return;
    }
    const accounts = await StorageService.getAccountsForHostname(hostname);
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
    const existing = await StorageService.supportReminder.getValue();
    if (!existing) {
      await StorageService.supportReminder.setValue({
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

  // the moat of the extension. the auto switching logic is here.
  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    if (pendingSwitches.has(details.tabId)) {
      // this means the background script is handling some internal tab manipulation. this is a signal
      // that the event must skip handling this tab as it's being handled already.
      pendingSwitches.delete(details.tabId);
      return;
    }

    try {
      const url = new URL(details.url);
      if (url.protocol === 'about:' || url.protocol === 'moz-extension:') return;

      const hostname = url.hostname;
      if (!hostname) return;

      // don't handle navigation in tabs when navigating within the same host
      // this makes the tabs sticky meaning that they won't suddenly switch context
      // when user switches the account on another tab.
      const binding = tabBindings.get(details.tabId);
      if (binding && binding.hostname === hostname) return;

      if (binding && binding.hostname !== hostname) {
        tabBindings.delete(details.tabId);
      }

      const tab = await browser.tabs.get(details.tabId);
      const map = await StorageService.lastSelected.getValue();
      const containerId = map[hostname];
      const isDefault =
        !tab.cookieStoreId || tab.cookieStoreId === StorageService.DEFAULT_CONTAINER_ID;

      // if the current tab is inside a container but user has navigated to a page that
      // is using the default firefox container switch out of the container and open with default

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
