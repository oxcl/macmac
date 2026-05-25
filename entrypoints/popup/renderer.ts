import { DEFAULT_CONTAINER_ID } from '@/utils/storage';
import type { AppData } from './types';
import { clearError } from './error';
import { loadAppData } from './renderer-data';
import { renderContainerList } from './renderer-dom';
import { handleCreate } from './actions-create';
import { handleOpenInNewTab, handleOpenInTabWithoutSwitch } from './actions-open';
import { handleRename } from './actions-rename';
import { handleDelete } from './actions-delete';

let currentData: AppData;
let listenersReady = false;

async function onContainerClick(e: Event): Promise<void> {
  const target = e.target as HTMLElement;

  const renameBtn = target.closest('.rename-btn') as HTMLElement | null;
  if (renameBtn) {
    e.stopPropagation();
    const accountId = renameBtn.dataset.accountId;
    if (accountId) {
      await handleRename(accountId, currentData);
      await init();
    }
    return;
  }

  const deleteBtn = target.closest('.delete-btn') as HTMLElement | null;
  if (deleteBtn) {
    e.stopPropagation();
    const accountId = deleteBtn.dataset.accountId;
    if (accountId) {
      await handleDelete(accountId, currentData);
      await init();
    }
    return;
  }

  const newTabBtn = target.closest('.newtab-btn') as HTMLElement | null;
  if (newTabBtn) {
    e.stopPropagation();
    const accountId = newTabBtn.dataset.accountId;
    if (accountId) {
      handleOpenInTabWithoutSwitch(accountId, currentData);
    }
    return;
  }

  const containerItem = target.closest('.container-item') as HTMLElement | null;
  if (containerItem) {
    const accountId = containerItem.dataset.accountId;
    const activeId = currentData.lastSelectedId ?? DEFAULT_CONTAINER_ID;
    if (accountId && accountId !== activeId) handleOpenInNewTab(accountId, currentData);
  }
}

export async function init(): Promise<void> {
  clearError();
  currentData = await loadAppData();

  const hostnameDisplay = document.getElementById('hostname-display')!;
  const noHostname = document.getElementById('no-hostname')!;
  const createSection = document.getElementById('create-section')!;
  const containersSection = document.getElementById('containers-section')!;

  if (currentData.hostname) {
    hostnameDisplay.textContent = `Website: ${currentData.hostname}`;
    hostnameDisplay.classList.remove('hidden');
    noHostname.classList.add('hidden');
    createSection.classList.remove('hidden');
    containersSection.classList.remove('hidden');
    renderContainerList(currentData);
  } else {
    hostnameDisplay.classList.add('hidden');
    noHostname.classList.remove('hidden');
    createSection.classList.add('hidden');
    containersSection.classList.add('hidden');
  }

  if (!listenersReady) {
    document
      .getElementById('createContainerBtn')!
      .addEventListener('click', () => handleCreate(currentData));
    containersSection.addEventListener('click', onContainerClick);
    listenersReady = true;
  }
}
