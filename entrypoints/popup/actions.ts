import {
  accounts,
  hostnameAccounts,
  lastSelected,
  supportReminder,
  DEFAULT_CONTAINER_ID,
  formatContainerName,
  synthesizeDefaultAccount,
  type Account,
  type SupportReminder,
} from '@/utils/storage';
import { showConfirm, showPrompt, showSupportModal, type SupportAction } from './modal';
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

    await Promise.all([
      accounts.setValue(accountUpdates),
      hostnameAccounts.setValue(newHostnameMap),
      lastSelected.setValue({ [hostname]: newAccount.id }),
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

const supportUrls: Record<SupportAction, string> = {
  github: '',
  rate: '',
  donate: '',
  'not-interested': '',
};

function isSupportReminderDue(reminder: SupportReminder): boolean {
  const now = Date.now();
  const daysMs = 24 * 60 * 60 * 1000;
  if (reminder.dismissCount === 0) {
    return now - reminder.installedAt >= 3 * daysMs;
  }
  const interval = Math.round(3 * Math.pow(1.5, reminder.dismissCount - 1));
  const last = reminder.lastDismissedAt ?? reminder.installedAt;
  return now - last >= interval * daysMs;
}

async function checkSupportReminder(): Promise<void> {
  let reminder = await supportReminder.getValue();
  if (!reminder) {
    await supportReminder.setValue({
      installedAt: Date.now(),
      lastDismissedAt: null,
      dismissCount: 0,
    });
    return;
  }
  if (!isSupportReminderDue(reminder)) return;

  const action = await showSupportModal();

  const nextReminder: SupportReminder = {
    ...reminder,
    lastDismissedAt: Date.now(),
    dismissCount: reminder.dismissCount + 1,
  };
  await supportReminder.setValue(nextReminder);

  const url = supportUrls[action];
  if (url) {
    await browser.tabs.create({ url, active: false });
  }
}

export async function handleOpenInNewTab(accountId: string, data: AppData): Promise<void> {
  if (!data.hostname) return;

  const lastMap = await lastSelected.getValue();
  lastMap[data.hostname] = accountId;
  await lastSelected.setValue(lastMap);

  const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  const cookieStoreId = accountId === DEFAULT_CONTAINER_ID ? undefined : accountId;
  await browser.runtime.sendMessage({
    type: 'createTab',
    url: `https://${data.hostname}`,
    cookieStoreId,
    index: currentTab.index,
    oldTabId: currentTab.id,
  });

  await checkSupportReminder();

  window.close();
}

export async function handleRename(accountId: string, data: AppData): Promise<void> {
  const account = data.currentAccounts.find((p) => p.id === accountId);
  if (!account || !data.hostname) return;

  const result = await showPrompt(account.name);
  if (!result.confirmed || !result.value) return;

  const trimmed = result.value.trim();
  if (trimmed === '' || trimmed === account.name) return;

  if (trimmed === 'Default') {
    await showConfirm('"Default" is a reserved name. Please choose another.');
    return;
  }

  if (trimmed.length > 50) {
    await showConfirm('Name must be 50 characters or less.');
    return;
  }

  if (/[()]/.test(trimmed)) {
    await showConfirm('Name cannot contain parentheses ( ).');
    return;
  }

  const duplicate = data.currentAccounts.find(
    (p) => p.id !== accountId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    await showConfirm(`A container named "${trimmed}" already exists for this website.`);
    return;
  }

  const [currentAccounts, currentHostnameMap] = await Promise.all([
    accounts.getValue(),
    hostnameAccounts.getValue(),
  ]);

  if (account.isDefault && accountId === DEFAULT_CONTAINER_ID) {
    const namedDefault: Account = {
      id: DEFAULT_CONTAINER_ID,
      name: trimmed,
      hostnames: [data.hostname!],
      isDefault: true,
    };

    const accountUpdates: Record<string, Account> = {
      ...currentAccounts,
      [DEFAULT_CONTAINER_ID]: namedDefault,
    };

    const newHostnameMap = { ...currentHostnameMap };
    const oldIds = newHostnameMap[data.hostname!] ?? [];
    if (!oldIds.includes(DEFAULT_CONTAINER_ID)) {
      newHostnameMap[data.hostname!] = [DEFAULT_CONTAINER_ID, ...oldIds];
    }

    await Promise.all([
      accounts.setValue(accountUpdates),
      hostnameAccounts.setValue(newHostnameMap),
    ]);
  } else {
    const existing = currentAccounts[accountId];
    currentAccounts[accountId] = {
      id: accountId,
      name: trimmed,
      hostnames: existing?.hostnames ?? [data.hostname],
      isDefault: existing?.isDefault ?? account.isDefault,
    };
    await accounts.setValue(currentAccounts);

    const containerName = formatContainerName(trimmed, data.hostname);
    await browser.contextualIdentities.update(accountId, {
      name: containerName,
    });
  }
}

export async function handleDelete(accountId: string, data: AppData): Promise<void> {
  const result = await showConfirm('Delete this account? This will remove its container.');
  if (!result.confirmed) return;

  await browser.contextualIdentities.remove(accountId);

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
  }
}
