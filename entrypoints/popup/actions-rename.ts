import {
  accounts,
  hostnameAccounts,
  DEFAULT_CONTAINER_ID,
  formatContainerName,
  type Account,
} from '@/utils/storage';
import { t } from '@/utils/i18n';
import { showConfirm, showPrompt } from './modal';
import type { AppData } from './types';

export async function handleRename(accountId: string, data: AppData): Promise<void> {
  const account = data.currentAccounts.find((p) => p.id === accountId);
  if (!account || !data.hostname) return;

  const result = await showPrompt(account.name);
  if (!result.confirmed || !result.value) return;

  const trimmed = result.value.trim();
  if (trimmed === '' || trimmed === account.name) return;

  if (trimmed === 'Default' && !account.isDefault) {
    await showConfirm(t('nameReserved'));
    return;
  }

  if (trimmed.length > 50) {
    await showConfirm(t('nameTooLong'));
    return;
  }

  if (/[()]/.test(trimmed)) {
    await showConfirm(t('nameNoParens'));
    return;
  }

  const duplicate = data.currentAccounts.find(
    (p) => p.id !== accountId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    await showConfirm(t('nameDuplicate', trimmed));
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
