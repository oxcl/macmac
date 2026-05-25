import type { Account } from '@/utils/storage';

export interface AppData {
  hostname: string | null;
  containers: Browser.contextualIdentities.ContextualIdentity[];
  currentAccounts: Account[];
  lastSelectedId: string | null;
}
