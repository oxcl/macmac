import type { Account } from '@/services/storage';

export interface AppData {
  hostname: string | null;
  containers: Browser.contextualIdentities.ContextualIdentity[];
  currentAccounts: Account[];
  lastSelectedId: string | null;
}
