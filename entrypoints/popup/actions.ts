import {
  profiles,
  hostnameProfiles,
  lastSelected,
  DEFAULT_CONTAINER_ID,
  formatContainerName,
  getDefaultProfile,
  type Profile,
} from '@/utils/storage';
import { showConfirm, showPrompt } from './modal';
import { showError } from './error';
import type { AppData } from './types';

let reinit: () => Promise<void> = async () => {};

export function setReinit(fn: () => Promise<void>): void {
  reinit = fn;
}

export async function handleCreate(data: AppData): Promise<void> {
  if (!data.hostname) return;

  try {
    const hostname = data.hostname;
    const accountName = `Account ${data.currentProfiles.length}`;
    const containerName = formatContainerName(accountName, hostname);

    const newContainer = await browser.contextualIdentities.create({
      name: containerName,
      color: 'toolbar',
      icon: 'circle',
    });

    const newProfile: Profile = {
      id: newContainer.cookieStoreId,
      name: accountName,
      hostnames: [hostname],
      isDefault: false,
    };

    const [currentProfiles, currentHostnameMap] = await Promise.all([
      profiles.getValue(),
      hostnameProfiles.getValue(),
    ]);

    const profileIds = currentHostnameMap[hostname] ?? [];
    const hasStoredDefault = profileIds.some((id) => currentProfiles[id]?.isDefault);

    const profileUpdates: Record<string, Profile> = {
      ...currentProfiles,
      [newProfile.id]: newProfile,
    };

    const newHostnameMap = { ...currentHostnameMap };
    newHostnameMap[hostname] = [...profileIds, newProfile.id];

    if (!hasStoredDefault) {
      const defaultProfile = getDefaultProfile(hostname);
      profileUpdates[defaultProfile.id] = defaultProfile;
      newHostnameMap[hostname] = [defaultProfile.id, ...newHostnameMap[hostname]];
    }

    await Promise.all([
      profiles.setValue(profileUpdates),
      hostnameProfiles.setValue(newHostnameMap),
      lastSelected.setValue({ [hostname]: newProfile.id }),
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

export async function handleOpenInNewTab(profileId: string, data: AppData): Promise<void> {
  if (!data.hostname) return;

  const lastMap = await lastSelected.getValue();
  lastMap[data.hostname] = profileId;
  await lastSelected.setValue(lastMap);

  const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  const cookieStoreId = profileId === DEFAULT_CONTAINER_ID ? undefined : profileId;
  await browser.runtime.sendMessage({
    type: 'createTab',
    url: `https://${data.hostname}`,
    cookieStoreId,
    index: currentTab.index,
    oldTabId: currentTab.id,
  });
  window.close();
}

export async function handleRename(profileId: string, data: AppData): Promise<void> {
  const profile = data.currentProfiles.find((p) => p.id === profileId);
  if (!profile || !data.hostname) return;

  const result = await showPrompt(profile.name);
  if (!result.confirmed || !result.value) return;

  const trimmed = result.value.trim();
  if (trimmed === '' || trimmed === profile.name) return;

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

  const duplicate = data.currentProfiles.find(
    (p) => p.id !== profileId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    await showConfirm(`A container named "${trimmed}" already exists for this website.`);
    return;
  }

  const [currentProfiles, currentHostnameMap] = await Promise.all([
    profiles.getValue(),
    hostnameProfiles.getValue(),
  ]);

  if (profile.isDefault && profileId === DEFAULT_CONTAINER_ID) {
    const namedDefault: Profile = {
      id: DEFAULT_CONTAINER_ID,
      name: trimmed,
      hostnames: [data.hostname!],
      isDefault: true,
    };

    const profileUpdates: Record<string, Profile> = {
      ...currentProfiles,
      [DEFAULT_CONTAINER_ID]: namedDefault,
    };

    const newHostnameMap = { ...currentHostnameMap };
    const oldIds = newHostnameMap[data.hostname!] ?? [];
    if (!oldIds.includes(DEFAULT_CONTAINER_ID)) {
      newHostnameMap[data.hostname!] = [DEFAULT_CONTAINER_ID, ...oldIds];
    }

    await Promise.all([
      profiles.setValue(profileUpdates),
      hostnameProfiles.setValue(newHostnameMap),
    ]);
  } else {
    const existing = currentProfiles[profileId];
    currentProfiles[profileId] = {
      id: profileId,
      name: trimmed,
      hostnames: existing?.hostnames ?? [data.hostname],
      isDefault: existing?.isDefault ?? profile.isDefault,
    };
    await profiles.setValue(currentProfiles);

    const containerName = formatContainerName(trimmed, data.hostname);
    await browser.contextualIdentities.update(profileId, {
      name: containerName,
    });
  }

  await reinit();
}

export async function handleDelete(profileId: string, data: AppData): Promise<void> {
  const result = await showConfirm('Delete this profile? This will remove its container.');
  if (!result.confirmed) return;

  await browser.contextualIdentities.remove(profileId);

  const [currentProfiles, currentHostnameMap, lastMap] = await Promise.all([
    profiles.getValue(),
    hostnameProfiles.getValue(),
    lastSelected.getValue(),
  ]);

  const { [profileId]: _removed, ...remainingProfiles } = currentProfiles;

  if (data.hostname) {
    const hostname = data.hostname;
    const oldIds = currentHostnameMap[hostname] ?? [];
    const newIds = oldIds.filter((id) => id !== profileId);

    const newHostnameMap = { ...currentHostnameMap };
    if (newIds.length === 0) {
      delete newHostnameMap[hostname];
    } else {
      newHostnameMap[hostname] = newIds;
    }

    const hasDefault = newIds.some((id) => remainingProfiles[id]?.isDefault);
    if (!hasDefault) {
      delete remainingProfiles[DEFAULT_CONTAINER_ID];
    }

    const { [hostname]: _last, ...remainingLast } = lastMap;

    await Promise.all([
      profiles.setValue(remainingProfiles),
      hostnameProfiles.setValue(newHostnameMap),
      lastSelected.setValue(remainingLast),
    ]);
  }

  await reinit();
}
