import { StorageService } from '@/services/storage';
import { tabService, getCurrentTab, toHttpsUrl } from '@/services/tabs';
import { containerService } from '@/services/container-api';
import { t } from '@/services/i18n';
import { showConfirm } from './modal';
import type { AppData } from './types';

export async function handleDelete(accountId: string, data: AppData): Promise<boolean> {
  const result = await showConfirm(t('deleteConfirm'));
  if (!result.confirmed) return false;

  await containerService.remove(accountId);
  tabService.cleanupBindingsForContainer(accountId);

  const [currentAccounts, currentHostnameMap, lastMap] = await Promise.all([
    StorageService.accounts.getValue(),
    StorageService.hostnameAccounts.getValue(),
    StorageService.lastSelected.getValue(),
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
      delete remainingAccounts[StorageService.DEFAULT_CONTAINER_ID];
    }

    const { [hostname]: _last, ...remainingLast } = lastMap;

    await Promise.all([
      StorageService.accounts.setValue(remainingAccounts),
      StorageService.hostnameAccounts.setValue(newHostnameMap),
      StorageService.lastSelected.setValue(remainingLast),
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
