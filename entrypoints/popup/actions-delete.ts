import { accounts, hostnameAccounts, lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';
import { tabService } from '@/utils/tab-service-client';
import { getCurrentTab, toHttpsUrl } from '@/utils/tabs';
import { t } from '@/utils/i18n';
import { showConfirm } from './modal';
import type { AppData } from './types';

export async function handleDelete(accountId: string, data: AppData): Promise<boolean> {
  const result = await showConfirm(t('deleteConfirm'));
  if (!result.confirmed) return false;

  await browser.contextualIdentities.remove(accountId);
  tabService.cleanupBindingsForContainer(accountId);

  const [currentAccounts, currentHostnameMap, lastMap] = await Promise.all([
    accounts.getValue(),
    hostnameAccounts.getValue(),
    lastSelected.getValue(),
  ]);

  const { [accountId]: _removed, ...remainingAccounts } = currentAccounts;

  if (data.hostname) {
    const hostname = data.hostname;
    const oldIds = currentHostnameMap[hostname] ?? [];
    const newIds = oldIds.filter((id) => id !== accountId);

    const newHostnameMap = { ...currentHostnameMap };
    if (newIds.length === 0) {
      delete newHostnameMap[hostname];
    } else {
      newHostnameMap[hostname] = newIds;
    }

    const hasDefault = newIds.some((id) => remainingAccounts[id]?.isDefault);
    if (!hasDefault) {
      delete remainingAccounts[DEFAULT_CONTAINER_ID];
    }

    const { [hostname]: _last, ...remainingLast } = lastMap;

    await Promise.all([
      accounts.setValue(remainingAccounts),
      hostnameAccounts.setValue(newHostnameMap),
      lastSelected.setValue(remainingLast),
    ]);

    const wasActive = data.lastSelectedId === accountId;
    if (wasActive) {
      const currentTab = await getCurrentTab();
      if (currentTab.id) {
        await tabService.openInDefault(toHttpsUrl(hostname), currentTab.index, currentTab.id);
      }
      window.close();
      return true;
    }
  }
  return false;
}
