export interface Profile {
  id: string;
  name: string;
  hostnames: string[];
  isDefault: boolean;
}

export const profiles = storage.defineItem<Record<string, Profile>>('local:profiles', {
  fallback: {},
});

export const hostnameProfiles = storage.defineItem<Record<string, string[]>>('local:hostnameProfiles', {
  fallback: {},
});

export const lastSelected = storage.defineItem<Record<string, string>>('local:lastSelected', {
  fallback: {},
});

export const DEFAULT_CONTAINER_ID = 'firefox-default';

export function getDefaultProfile(hostname: string): Profile {
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

export async function getProfilesForHostname(hostname: string): Promise<Profile[]> {
  const [allProfiles, hostnameMap] = await Promise.all([
    profiles.getValue(),
    hostnameProfiles.getValue(),
  ]);

  const profileIds = hostnameMap[hostname] ?? [];

  if (profileIds.length === 0) {
    return [getDefaultProfile(hostname)];
  }

  const result: Profile[] = [];
  let hasDefault = false;

  for (const id of profileIds) {
    const profile = allProfiles[id];
    if (profile) {
      result.push(profile);
      if (profile.isDefault) hasDefault = true;
    }
  }

  if (!hasDefault) {
    result.unshift(getDefaultProfile(hostname));
  }

  return result;
}
