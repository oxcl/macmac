import { DEFAULT_CONTAINER_ID, type Profile } from '@/utils/storage';
import type { AppData } from './types';

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

export function renderContainerList(data: AppData): void {
  const activeItems = document.getElementById('active-items')!;
  const otherItems = document.getElementById('other-items')!;
  const otherGroup = document.getElementById('other-group')!;
  activeItems.innerHTML = '';
  otherItems.innerHTML = '';

  const activeId = data.lastSelectedId ?? DEFAULT_CONTAINER_ID;
  const activeProfile = data.currentProfiles.find((p) => p.id === activeId);
  const otherProfiles = data.currentProfiles.filter((p) => p.id !== activeId);

  let delay = 0.15;

  function createItem(profile: Profile, isActive: boolean): HTMLDivElement {
    const containerData = data.containers.find((c) => c.cookieStoreId === profile.id);
    const color = containerData?.color || 'gray';
    const colorHex = getContainerColor(color);

    const div = document.createElement('div');
    div.className = `container-item${isActive ? ' active' : ''}${profile.isDefault ? ' default-item' : ''}`;
    div.dataset.profileId = profile.id;
    div.style.opacity = '0';
    div.style.animation = `fadeSlideIn 0.3s ease forwards`;
    div.style.animationDelay = `${delay}s`;
    delay += 0.04;

    div.innerHTML = `
      <div class="container-content">
        <div class="container-color" style="background: ${colorHex};"></div>
        <div class="container-name">${escapeHtml(profile.name)}</div>
        <div class="container-actions">
          <button class="action-btn rename-btn" data-profile-id="${profile.id}" title="Rename">
            <svg class="icon" viewBox="0 -960 960 960" fill="currentColor">
              <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
            </svg>
          </button>
          <button class="action-btn newtab-btn" data-profile-id="${profile.id}" title="Open in New Tab">
            <svg class="icon" viewBox="0 -960 960 960" fill="currentColor">
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240v80H200v560h560v-240h80v240q0 33-23.5 56.5T760-120H200Zm440-400v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z"/>
            </svg>
          </button>
          <button class="action-btn delete-btn" data-profile-id="${profile.id}" ${profile.isDefault ? 'disabled' : ''} title="Delete">
            <svg class="icon" viewBox="0 -960 960 960" fill="currentColor">
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
          </button>
        </div>
      </div>
      ${isActive ? '<div class="active-indicator"></div>' : ''}
    `;
    return div;
  }

  if (activeProfile) {
    activeItems.appendChild(createItem(activeProfile, true));
  }

  for (const profile of otherProfiles) {
    otherItems.appendChild(createItem(profile, false));
  }

  otherGroup.classList.toggle('hidden', otherProfiles.length === 0);
}
