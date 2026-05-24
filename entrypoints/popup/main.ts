/// <reference path="../../types/global.d.ts" />

import './style.css';
import {
  profiles,
  hostnameProfiles,
  lastSelected,
  DEFAULT_CONTAINER_ID,
  getDefaultProfile,
  getProfilesForHostname,
  formatContainerName,
  type Profile,
} from '@/utils/storage';

interface AppData {
  hostname: string | null;
  containers: Browser.contextualIdentities.ContextualIdentity[];
  currentProfiles: Profile[];
  lastSelectedId: string | null;
}

// --- Data ---

async function loadData(): Promise<AppData> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  let hostname: string | null = null;
  if (currentTab.url) {
    try {
      hostname = new URL(currentTab.url).hostname;
    } catch {
      hostname = null;
    }
  }

  let containers: Browser.contextualIdentities.ContextualIdentity[] = [];
  try {
    containers = await browser.contextualIdentities.query({});
  } catch (err) {
    console.error('Failed to query containers:', err);
  }

  let currentProfiles: Profile[] = [];
  let lastSelectedId: string | null = null;

  if (hostname) {
    currentProfiles = await getProfilesForHostname(hostname);
    const lastMap = await lastSelected.getValue();
    lastSelectedId = lastMap[hostname] ?? null;
  }

  return { hostname, containers, currentProfiles, lastSelectedId };
}

// --- Rendering ---

function escapeHtml(str: string): string {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!
  );
}

function getContainerColor(color: string): string {
  const colors: Record<string, string> = {
    blue: '#60a5fa',
    turquoise: '#2dd4bf',
    green: '#4ade80',
    yellow: '#facc15',
    orange: '#fb923c',
    red: '#f87171',
    pink: '#f472b6',
    purple: '#a78bfa',
    toolbar: '#7c7c7d',
    gray: '#9ca3af',
  };
  return colors[color] || colors.toolbar;
}

function renderContainerList(data: AppData): void {
  const containerItems = document.getElementById('container-items')!;
  containerItems.innerHTML = '';

  for (const profile of data.currentProfiles) {
    const isActive = profile.id === (data.lastSelectedId ?? DEFAULT_CONTAINER_ID);
    const containerData = data.containers.find((c) => c.cookieStoreId === profile.id);
    const color = containerData?.color || 'gray';
    const colorHex = getContainerColor(color);

    const profileDiv = document.createElement('div');
    profileDiv.className = `container-item${isActive ? ' active' : ''}${profile.isDefault ? ' default-item' : ''}`;
    profileDiv.dataset.profileId = profile.id;

    const hostnameDisplay = data.hostname
      ? `<div class="container-hostname">${escapeHtml(data.hostname)}</div>`
      : '';

    profileDiv.innerHTML = `
      <div class="container-content">
        <div class="container-color" style="background: ${colorHex};"></div>
        <div class="container-info">
          <div class="container-name">${escapeHtml(profile.name)}</div>
          ${hostnameDisplay}
        </div>
        <div class="container-actions">
          <button class="action-btn rename-btn" data-profile-id="${profile.id}" title="Rename">
            <img src="/icon/rename.svg" alt="Rename">
          </button>
          <button class="action-btn delete-btn" data-profile-id="${profile.id}" ${profile.isDefault ? 'disabled' : ''} title="Delete">
            <img src="/icon/delete.svg" alt="Delete">
          </button>
        </div>
      </div>
      ${isActive ? '<div class="active-indicator"></div>' : ''}
    `;
    containerItems.appendChild(profileDiv);
  }
}

// --- Modal ---

type ModalResult = { confirmed: false } | { confirmed: true; value?: string };

function showConfirm(message: string): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay')!;
    const title = document.getElementById('modal-title')!;
    const body = document.getElementById('modal-body')!;
    const cancelBtn = document.getElementById('modal-cancel')!;
    const confirmBtn = document.getElementById('modal-confirm')!;

    title.textContent = 'Confirm';
    body.textContent = message;
    overlay.classList.remove('hidden');

    function cleanup() {
      overlay.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function onCancel() {
      cleanup();
      resolve({ confirmed: false });
    }
    function onConfirm() {
      cleanup();
      resolve({ confirmed: true });
    }
    function onOverlayClick(e: MouseEvent) {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ confirmed: false });
      }
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}

function showPrompt(message: string, defaultValue: string): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay')!;
    const title = document.getElementById('modal-title')!;
    const body = document.getElementById('modal-body')!;
    const cancelBtn = document.getElementById('modal-cancel')!;
    const confirmBtn = document.getElementById('modal-confirm')!;

    title.textContent = 'Rename Account';
    body.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    body.appendChild(input);
    overlay.classList.remove('hidden');
    input.focus();
    input.select();

    function cleanup() {
      overlay.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      input.removeEventListener('keydown', onInputKeydown);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function onCancel() {
      cleanup();
      resolve({ confirmed: false });
    }
    function onConfirm() {
      cleanup();
      resolve({ confirmed: true, value: input.value });
    }
    function onInputKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        cleanup();
        resolve({ confirmed: true, value: input.value });
      }
    }
    function onOverlayClick(e: MouseEvent) {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ confirmed: false });
      }
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    input.addEventListener('keydown', onInputKeydown);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}

// --- Event Handlers ---

async function handleCreate(data: AppData): Promise<void> {
  if (!data.hostname) return;

  const createMessage = document.getElementById('createMessage')!;

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
    createMessage.textContent = `Error creating container: ${err}`;
    createMessage.className = 'message error';
  }
}

async function handleOpenInNewTab(profileId: string, data: AppData): Promise<void> {
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

async function handleRename(profileId: string, data: AppData): Promise<void> {
  const profile = data.currentProfiles.find((p) => p.id === profileId);
  if (!profile || !data.hostname) return;

  const result = await showPrompt('Enter new profile name:', profile.name);
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
    await showConfirm(
      `A container named "${escapeHtml(trimmed)}" already exists for this website.`
    );
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

  await init();
}

async function handleDelete(profileId: string, data: AppData): Promise<void> {
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

  await init();
}

// --- Init ---

function setupEventListeners(data: AppData): void {
  const createBtn = document.getElementById('createContainerBtn')!;
  const containerItems = document.getElementById('container-items')!;

  createBtn.addEventListener('click', () => handleCreate(data));

  containerItems.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const renameBtn = target.closest('.rename-btn') as HTMLElement | null;
    if (renameBtn) {
      e.stopPropagation();
      const profileId = renameBtn.dataset.profileId;
      if (profileId) handleRename(profileId, data);
      return;
    }

    const deleteBtn = target.closest('.delete-btn') as HTMLElement | null;
    if (deleteBtn) {
      e.stopPropagation();
      const profileId = deleteBtn.dataset.profileId;
      if (profileId) handleDelete(profileId, data);
      return;
    }

    const containerItem = target.closest('.container-item') as HTMLElement | null;
    if (containerItem) {
      const profileId = containerItem.dataset.profileId;
      const activeId = data.lastSelectedId ?? DEFAULT_CONTAINER_ID;
      if (profileId && profileId !== activeId) handleOpenInNewTab(profileId, data);
    }
  });
}

async function init(): Promise<void> {
  const data = await loadData();

  const hostnameDisplay = document.getElementById('hostname-display')!;
  const noHostname = document.getElementById('no-hostname')!;
  const createSection = document.getElementById('create-section')!;
  const containersSection = document.getElementById('containers-section')!;

  if (data.hostname) {
    hostnameDisplay.textContent = `Website: ${data.hostname}`;
    hostnameDisplay.classList.remove('hidden');
    noHostname.classList.add('hidden');
    createSection.classList.remove('hidden');
    containersSection.classList.remove('hidden');
    renderContainerList(data);
  } else {
    hostnameDisplay.classList.add('hidden');
    noHostname.classList.remove('hidden');
    createSection.classList.add('hidden');
    containersSection.classList.add('hidden');
  }

  setupEventListeners(data);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => console.error('Failed to start app:', err));
});
