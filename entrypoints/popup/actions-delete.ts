import { accounts, hostnameAccounts, lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';
import { t } from '@/utils/i18n';
import { showConfirm } from './modal';
import type { AppData } from './types';

export async function handleDelete(accountId: string, data: AppData): Promise<void> {
  const result = await showConfirm(t('deleteConfirm'));
  if (!result.confirmed) return;

  await browser.contextualIdentities.remove(accountId);
  await browser.runtime.sendMessage({ type: 'cleanupTabBindings', cookieStoreId: accountId });

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
      const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (currentTab.id) {
        await browser.tabs.create({
          url: `https://${hostname}`,
          index: currentTab.index,
        });
        browser.tabs.remove(currentTab.id);
      }
    }
  }
}
