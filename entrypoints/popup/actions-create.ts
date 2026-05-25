import {
  accounts,
  hostnameAccounts,
  lastSelected,
  formatContainerName,
  synthesizeDefaultAccount,
  type Account,
} from '@/utils/storage';
import { showError } from './error';
import type { AppData } from './types';

export async function handleCreate(data: AppData): Promise<void> {
  if (!data.hostname) return;

  try {
    const hostname = data.hostname;
    const accountName = `Account ${data.currentAccounts.length}`;
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

    const [currentAccounts, currentHostnameMap] = await Promise.all([
      accounts.getValue(),
      hostnameAccounts.getValue(),
    ]);

    const accountIds = currentHostnameMap[hostname] ?? [];
    const hasStoredDefault = accountIds.some((id) => currentAccounts[id]?.isDefault);

    const accountUpdates: Record<string, Account> = {
      ...currentAccounts,
      [newAccount.id]: newAccount,
    };

    const newHostnameMap = { ...currentHostnameMap };
    newHostnameMap[hostname] = [...accountIds, newAccount.id];

    if (!hasStoredDefault) {
      const defaultAccount = synthesizeDefaultAccount(hostname);
      accountUpdates[defaultAccount.id] = defaultAccount;
      newHostnameMap[hostname] = [defaultAccount.id, ...newHostnameMap[hostname]];
    }

    const lastMap = await lastSelected.getValue();
    lastMap[hostname] = newAccount.id;
    await Promise.all([
      accounts.setValue(accountUpdates),
      hostnameAccounts.setValue(newHostnameMap),
      lastSelected.setValue(lastMap),
    ]);

    const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    await browser.runtime.sendMessage({
      type: 'createTab',
      url: `https://${hostname}`,
      cookieStoreId: newContainer.cookieStoreId,
      index: currentTab.index,
      oldTabId: currentTab.id,
    });
    window.close();
  } catch (err) {
    console.error('Failed to create container:', err);
    showError(`Error creating container: ${err}`);
  }
}
