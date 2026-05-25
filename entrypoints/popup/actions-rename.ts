import {
  DEFAULT_CONTAINER_ID,
  formatContainerName,
  getAccountAndHostnameMaps,
  upsertAccount,
  addAccountToHostname,
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

  if (account.isDefault && accountId === DEFAULT_CONTAINER_ID) {
    const namedDefault: Account = {
      id: DEFAULT_CONTAINER_ID,
      name: trimmed,
      hostnames: [data.hostname!],
      isDefault: true,
    };

    await upsertAccount(namedDefault);
    await addAccountToHostname(data.hostname!, DEFAULT_CONTAINER_ID);
  } else {
    const [currentAccounts] = await getAccountAndHostnameMaps();
    const existing = currentAccounts[accountId];
    const updated: Account = {
      id: accountId,
      name: trimmed,
      hostnames: existing?.hostnames ?? [data.hostname],
      isDefault: existing?.isDefault ?? account.isDefault,
    };
    await upsertAccount(updated);

    const containerName = formatContainerName(trimmed, data.hostname);
    await browser.contextualIdentities.update(accountId, {
      name: containerName,
    });
  }
}
