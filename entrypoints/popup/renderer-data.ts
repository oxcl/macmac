import { getAccountsForHostname, lastSelected, type Account } from '@/utils/storage';
import { t } from '@/utils/i18n';
import type { AppData } from './types';
import { showError } from './error';

export async function loadAppData(): Promise<AppData> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  let hostname: string | null = null;
  if (currentTab.url) {
    try {
      hostname = new URL(currentTab.url).hostname;
    } catch {
      hostname = null;
    }
  }

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
    const lastMap = await lastSelected.getValue();
    lastSelectedId = lastMap[hostname] ?? null;
  }

  return { hostname, containers, currentAccounts, lastSelectedId };
}
