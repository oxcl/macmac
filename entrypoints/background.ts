import { registerService, type ProxyServiceKey } from '@webext-core/proxy-service';
import { StorageService } from '@/services/storage';
import {
  TAB_SERVICE_KEY,
  type TabService,
  type TabBinding,
  getHostname,
  isFirefox,
} from '@/services/tabs';
import {
  FirefoxContainerApi,
  ChromeContainerApi,
  hasBlockingWebRequest,
  type ContainerApi,
  type ContainerService,
} from '@/services/container-api';
const CONTAINER_SERVICE_KEY = 'container-service' as ProxyServiceKey<ContainerService>;
import { CookieStore } from '@/services/cookie-store';

const tabBindings = new Map<number, TabBinding>();
const pendingSwitches = new Set<number>();

let containerApi: ContainerApi;
let cookieStore: CookieStore | null = null;

function initContainerApi(): void {
  if (isFirefox()) {
    containerApi = new FirefoxContainerApi(tabBindings, pendingSwitches);
  } else {
    cookieStore = new CookieStore(StorageService.cookieJars);
    containerApi = new ChromeContainerApi(
      tabBindings,
      cookieStore,
      StorageService.chromeContainerMeta
    );
  }
}

function registerNewTab(tab: Browser.tabs.Tab, url: string, cookieStoreId: string): void {
  if (!tab.id) return;
  const hostname = getHostname(url);
  if (!hostname) return;
  tabBindings.set(tab.id, { hostname, cookieStoreId });
  pendingSwitches.add(tab.id);
}

const tabServiceImpl: TabService = {
  async openInContainer(url, cookieStoreId, index, replaceCurrentTabId) {
    const createProps: Record<string, unknown> = { url, index };
    if (isFirefox()) {
      createProps.cookieStoreId = cookieStoreId;
    }
    const newTab = await browser.tabs.create(createProps as Browser.tabs.CreateProperties);
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

function protocolCheck(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'about:') return true;
    if (isFirefox() && parsed.protocol === 'moz-extension:') return true;
    if (!isFirefox() && (parsed.protocol === 'chrome-extension:' || parsed.protocol === 'chrome:'))
      return true;
    return false;
  } catch {
    return true;
  }
}

export default defineBackground(() => {
  initContainerApi();
  registerService(TAB_SERVICE_KEY, tabServiceImpl);

  const containerServiceImpl: ContainerService = {
    query: () => containerApi.query(),
    create: (name, color, icon) => containerApi.create(name, color, icon),
    update: (id, details) => containerApi.update(id, details),
    remove: (id) => containerApi.remove(id),
  };
  registerService(CONTAINER_SERVICE_KEY, containerServiceImpl);

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

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    if (pendingSwitches.has(details.tabId)) {
      pendingSwitches.delete(details.tabId);
      // For Chrome MV3: swap cookies for the pending tab navigation
      if (!isFirefox() && !hasBlockingWebRequest() && cookieStore) {
        const binding = tabBindings.get(details.tabId);
        const hostname = getHostname(details.url);
        if (
          binding &&
          hostname &&
          binding.hostname === hostname &&
          binding.cookieStoreId !== StorageService.DEFAULT_CONTAINER_ID
        ) {
          await cookieStore.restoreForHostname(binding.cookieStoreId, hostname);
        }
      }
      return;
    }

    try {
      if (protocolCheck(details.url)) return;

      const url = new URL(details.url);
      const hostname = url.hostname;
      if (!hostname) return;

      const binding = tabBindings.get(details.tabId);

      // Sticky tab — same hostname navigation, skip
      if (binding && binding.hostname === hostname) return;

      // Navigating away from previous hostname — cleanup
      if (binding && binding.hostname !== hostname) {
        await containerApi.onNavigateAway(details.tabId, binding.hostname, binding.cookieStoreId);
        tabBindings.delete(details.tabId);
      }

      const tab = await browser.tabs.get(details.tabId);
      const map = await StorageService.lastSelected.getValue();
      const accountId = map[hostname];

      if (!accountId) {
        await containerApi.applyDefault(tab, details.url, hostname);
        return;
      }

      await containerApi.applyAccount(tab, details.url, hostname, accountId);
    } catch (err) {
      console.error('[background] Error switching tab:', err);
    }
  });

  // Chrome-specific: cookie change sync for MV3
  if (!isFirefox() && !hasBlockingWebRequest() && cookieStore) {
    chrome.cookies.onChanged.addListener((changeInfo) => {
      const hostname = getHostname(
        `${changeInfo.cookie.secure ? 'https' : 'http'}://${changeInfo.cookie.domain.replace(/^\./, '')}${changeInfo.cookie.path}`
      );
      if (!hostname) return;

      // Find which tab is associated with this change by checking the active tab
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (!tabs[0]?.id) return;
          const binding = tabBindings.get(tabs[0].id);
          if (binding && binding.hostname === hostname) {
            cookieStore!.onCookieChanged(changeInfo, {
              accountId: binding.cookieStoreId,
              hostname,
            });
          }
        })
        .catch(() => {});
    });
  }

  updateBadgeForActiveTab();
});
