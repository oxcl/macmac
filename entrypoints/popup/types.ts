import type { Profile } from '@/utils/storage';

export interface AppData {
  hostname: string | null;
  containers: Browser.contextualIdentities.ContextualIdentity[];
  currentProfiles: Profile[];
  lastSelectedId: string | null;
}
