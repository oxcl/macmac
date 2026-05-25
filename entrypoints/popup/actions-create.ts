import {
  lastSelected,
  formatContainerName,
  synthesizeDefaultAccount,
  getAccountAndHostnameMaps,
  upsertAccount,
  addAccountToHostname,
  type Account,
} from '@/utils/storage';
import { tabService } from '@/utils/tab-service-client';
import { getCurrentTab, toHttpsUrl } from '@/utils/tabs';
import { t } from '@/utils/i18n';
import { showError } from './error';
import type { AppData } from './types';

export async function handleCreate(data: AppData): Promise<void> {
  if (!data.hostname) return;

  try {
    const hostname = data.hostname;
    const accountName = `${t('accountPrefix')}${data.currentAccounts.length + 1}`;
    const containerName = formatContainerName(accountName, hostname);

    const newContainer = await browser.contextualIdentities.create({
      name: containerName,
      color: 'toolbar',
      icon: 'circle',
    });

    const newAccount: Account = {
      id: newContainer.cookieStoreId,
      name: accountName,
      hostnames: [hostname],
      isDefault: false,
    };

    const [currentAccounts, currentHostnameMap] = await getAccountAndHostnameMaps();
    const accountIds = currentHostnameMap[hostname] ?? [];
    const hasStoredDefault = accountIds.some((id) => currentAccounts[id]?.isDefault);

    await upsertAccount(newAccount);
    await addAccountToHostname(hostname, newAccount.id);

    if (!hasStoredDefault) {
      const defaultAccount = synthesizeDefaultAccount(hostname);
      await upsertAccount(defaultAccount);
      await addAccountToHostname(hostname, defaultAccount.id);
    }

    await lastSelected.setValue({
      ...(await lastSelected.getValue()),
      [hostname]: newAccount.id,
    });

    const currentTab = await getCurrentTab();
    await tabService.openInAccount(
      toHttpsUrl(hostname),
      newContainer.cookieStoreId,
      currentTab.index,
      currentTab.id
    );

    window.close();
  } catch (err) {
    console.error('Failed to create container:', err);
    showError(`${t('errorCreating')}${err}`);
  }
}
