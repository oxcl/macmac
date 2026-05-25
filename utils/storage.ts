export interface Account {
  id: string;
  name: string;
  hostnames: string[];
  isDefault: boolean;
}

// key value store of <account-id, account-object>
export const accounts = storage.defineItem<Record<string, Account>>('local:accounts', {
  fallback: {},
});

// lookup table for <hostname, array of account ids>
export const hostnameAccounts = storage.defineItem<Record<string, string[]>>(
  'local:hostnameAccounts',
  {
    fallback: {},
  }
);

// <host-name, account-id>
export const lastSelected = storage.defineItem<Record<string, string>>('local:lastSelected', {
  fallback: {},
});

export interface SupportReminder {
  installedAt: number;
  lastDismissedAt: number | null;
  dismissCount: number;
}

export const supportReminder = storage.defineItem<SupportReminder | null>('local:supportReminder', {
  fallback: null,
});

export const language = storage.defineItem<string>('local:language', {
  fallback: '',
});

export const DEFAULT_CONTAINER_ID = 'firefox-default';

// When there's only one hostname or no registered container for this
// hostname, we synthesize a virtual "Default (no container)" account
// for the UI. This is not backed by a real contextualIdentity.
export function synthesizeDefaultAccount(hostname: string): Account {
  return {
    id: DEFAULT_CONTAINER_ID,
    name: 'Default',
    hostnames: [hostname],
    isDefault: true,
  };
}

export function formatContainerName(name: string, hostname: string): string {
  return `${name} (${hostname})`;
}

export async function getAccountsForHostname(hostname: string): Promise<Account[]> {
  const [allAccounts, hostnameMap] = await Promise.all([
    accounts.getValue(),
    hostnameAccounts.getValue(),
  ]);

  const accountIds = hostnameMap[hostname] ?? [];

  if (accountIds.length === 0) {
    return [synthesizeDefaultAccount(hostname)];
  }

  const result: Account[] = [];
  let hasDefault = false;

  for (const id of accountIds) {
    const account = allAccounts[id];
    if (account) {
      result.push(account);
      if (account.isDefault) hasDefault = true;
    }
  }

  if (!hasDefault) {
    result.unshift(synthesizeDefaultAccount(hostname));
  }

  return result;
}

export async function getAccountAndHostnameMaps(): Promise<
  [Record<string, Account>, Record<string, string[]>]
> {
  return Promise.all([accounts.getValue(), hostnameAccounts.getValue()]);
}

export async function setLastSelected(hostname: string, accountId: string): Promise<void> {
  const lastMap = await lastSelected.getValue();
  lastMap[hostname] = accountId;
  await lastSelected.setValue(lastMap);
}

export async function upsertAccount(account: Account): Promise<void> {
  const current = await accounts.getValue();
  current[account.id] = account;
  await accounts.setValue(current);
}

export async function addAccountToHostname(hostname: string, accountId: string): Promise<void> {
  const map = await hostnameAccounts.getValue();
  const ids = map[hostname] ?? [];
  if (!ids.includes(accountId)) {
    map[hostname] = [...ids, accountId];
    await hostnameAccounts.setValue(map);
  }
}

export async function removeAccountFromHostname(
  hostname: string,
  accountId: string
): Promise<void> {
  const map = await hostnameAccounts.getValue();
  const ids = map[hostname] ?? [];
  const newIds = ids.filter((id) => id !== accountId);

  const newMap = { ...map };
  if (newIds.length === 0) {
    delete newMap[hostname];
  } else {
    newMap[hostname] = newIds;
  }

  await hostnameAccounts.setValue(newMap);
}
