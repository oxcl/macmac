import { createProxyService } from '@webext-core/proxy-service';
import { getAccountsForHostname, lastSelected, type Account } from '@/utils/storage';
import { TAB_SERVICE_KEY } from '@/utils/tab-service';
import { getCurrentTab, getHostname } from '@/utils/tabs';
import { t } from '@/utils/i18n';
import type { AppData } from './types';
import { showError } from './error';

const tabService = createProxyService(TAB_SERVICE_KEY);

export async function loadAppData(): Promise<AppData> {
  const currentTab = await getCurrentTab();
  const hostname = currentTab.url ? getHostname(currentTab.url) : null;

  let containers: Browser.contextualIdentities.ContextualIdentity[] = [];
  try {
    containers = await browser.contextualIdentities.query({});
  } catch (err) {
    console.error('Failed to query containers:', err);
    showError(t('failedContainers'));
  }

  let currentAccounts: Account[] = [];
  let lastSelectedId: string | null = null;

  if (hostname) {
    currentAccounts = await getAccountsForHostname(hostname);

    const binding = currentTab.id ? await tabService.getTabBinding(currentTab.id) : null;

    if (binding && binding.hostname === hostname) {
      lastSelectedId = binding.cookieStoreId;
    } else {
      const lastMap = await lastSelected.getValue();
      lastSelectedId = lastMap[hostname] ?? null;
    }
  }

  return { hostname, containers, currentAccounts, lastSelectedId };
}
