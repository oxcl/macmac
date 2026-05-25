/// <reference path="../../types/global.d.ts" />

import './style.css';
import {
  getProfilesForHostname,
  lastSelected,
  DEFAULT_CONTAINER_ID,
  type Profile,
} from '@/utils/storage';
import { clearError, showError } from './error';
import { renderContainerList } from './renderer';
import { handleCreate, handleOpenInNewTab, handleRename, handleDelete, setReinit } from './actions';
import type { AppData } from './types';

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
    showError('Failed to query containers.');
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
  clearError();
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

setReinit(init);

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error('Failed to start app:', err);
    showError('Failed to start the app.');
  });
});
