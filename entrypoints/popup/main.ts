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

class ContainerManager {
  private appDiv: HTMLElement | null = null;
  private containers: any[] = [];
  private currentHostname: string | null = null;
  private currentProfiles: Profile[] = [];
  private lastSelectedId: string | null = null;

  async init() {
    this.appDiv = document.querySelector<HTMLDivElement>('#app')!;
    await this.loadData();
    await this.render();
    this.setupEventListeners();
  }

  async getCurrentTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async loadData() {
    const currentTab = await this.getCurrentTab();
    if (currentTab.url) {
      try {
        const url = new URL(currentTab.url);
        this.currentHostname = url.hostname;
      } catch {
        this.currentHostname = null;
      }
    } else {
      this.currentHostname = null;
    }

    try {
      this.containers = await browser.contextualIdentities.query({});
    } catch (err) {
      console.error('Failed to query containers:', err);
      this.containers = [];
    }

    if (this.currentHostname) {
      this.currentProfiles = await getProfilesForHostname(this.currentHostname);
      const lastMap = await lastSelected.getValue();
      this.lastSelectedId = lastMap[this.currentHostname] ?? null;
    } else {
      this.currentProfiles = [];
      this.lastSelectedId = null;
    }
  }

  async render() {
    if (!this.appDiv) return;

    this.appDiv.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'container';

    const header = document.createElement('header');
    header.innerHTML = `
      <img src="${browser.runtime.getURL('/logo.png')}" class="logo" alt="Logo" />
      <h1>Account-Based Containers</h1>
    `;
    container.appendChild(header);

    if (!this.currentHostname) {
      container.appendChild(document.createElement('p')).textContent = 'No hostname detected.';
      this.appDiv.appendChild(container);
      return;
    }

    const hostnameDisplay = document.createElement('div');
    hostnameDisplay.className = 'hostname-display';
    hostnameDisplay.textContent = `Website: ${this.currentHostname}`;
    container.appendChild(hostnameDisplay);

    const createSection = document.createElement('section');
    createSection.className = 'create-container-section';
    createSection.innerHTML = `
      <h2>Create New Account</h2>
      <div class="form-group">
        <label for="accountName">Account Name:</label>
        <input type="text" id="accountName" placeholder="e.g. Work" />
      </div>
      <button id="createContainerBtn" type="button">Create</button>
      <div id="createMessage" class="message"></div>
    `;
    container.appendChild(createSection);

    const listSection = document.createElement('section');
    listSection.className = 'containers-list';
    listSection.innerHTML = `<h2>Available Accounts</h2>`;

    for (const profile of this.currentProfiles) {
      const isActive = profile.id === (this.lastSelectedId ?? DEFAULT_CONTAINER_ID);
      const containerData = this.containers.find((c: any) => c.cookieStoreId === profile.id);
      const color = containerData?.color || 'gray';

      const profileDiv = document.createElement('div');
      profileDiv.className = 'container-item';
      profileDiv.innerHTML = `
        <div class="container-header" style="border-left: 4px solid ${color};">
          <h3>${escapeHtml(profile.name)}</h3>
        </div>
        <div class="container-actions">
          <button class="switch-btn" data-profile-id="${profile.id}">Switch</button>
          <button class="rename-btn" data-profile-id="${profile.id}">Rename</button>
          <button class="delete-btn" data-profile-id="${profile.id}" ${profile.isDefault ? 'disabled' : ''}>Delete</button>
        </div>
        ${isActive ? '<div class="status-badge">Current</div>' : ''}
      `;
      listSection.appendChild(profileDiv);
    }

    container.appendChild(listSection);
    this.appDiv.appendChild(container);
  }

  setupEventListeners() {
    const createBtn = document.querySelector('#createContainerBtn');
    const nameInput = document.querySelector('#accountName') as HTMLInputElement;
    const createMessage = document.querySelector('#createMessage') as HTMLDivElement;

    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const accountName = nameInput.value.trim();
        if (!accountName) {
          createMessage.textContent = 'Please enter an account name';
          createMessage.className = 'message error';
          return;
        }

        try {
          const hostname = this.currentHostname!;
          const containerName = formatContainerName(accountName, hostname);

          const containerColors = ['blue', 'turquoise', 'green', 'yellow', 'orange', 'red', 'pink', 'purple'];
          const nextColor = containerColors[this.containers.length % containerColors.length];

          const newContainer = await browser.contextualIdentities.create({
            name: containerName,
            color: nextColor,
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
          const hasStoredDefault = profileIds.some(id => currentProfiles[id]?.isDefault);

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

          const currentTab = await this.getCurrentTab();
          await browser.tabs.create({ url: `https://${hostname}`, cookieStoreId: newContainer.cookieStoreId });
          if (currentTab.id) await browser.tabs.remove(currentTab.id);
          window.close();
        } catch (err) {
          createMessage.textContent = `Error creating container: ${err}`;
          createMessage.className = 'message error';
        }
      });
    }

    if (this.appDiv) {
      this.appDiv.addEventListener('click', async (e) => {
        const switchBtn = (e.target as HTMLElement).closest('.switch-btn') as HTMLElement | null;
        if (switchBtn) {
          const profileId = switchBtn.dataset.profileId;
          if (!profileId || !this.currentHostname) return;

          const map = { [this.currentHostname]: profileId };
          await lastSelected.setValue(map);

          const cookieStoreId = profileId === DEFAULT_CONTAINER_ID ? undefined : profileId;
          const currentTab = await this.getCurrentTab();
          await browser.tabs.create({ url: `https://${this.currentHostname}`, cookieStoreId });
          if (currentTab.id) await browser.tabs.remove(currentTab.id);
          window.close();
        }

        const renameBtn = (e.target as HTMLElement).closest('.rename-btn') as HTMLElement | null;
        if (renameBtn) {
          const profileId = renameBtn.dataset.profileId;
          if (!profileId || !this.currentHostname) return;

          const profile = this.currentProfiles.find(p => p.id === profileId);
          if (!profile) return;

          const newName = prompt('Enter new profile name:', profile.name);
          if (newName !== null && newName.trim() !== '' && newName !== profile.name) {
            const trimmed = newName.trim();

            const currentProfiles = await profiles.getValue();
            currentProfiles[profileId] = { ...currentProfiles[profileId], name: trimmed };
            await profiles.setValue(currentProfiles);

            if (!profile.isDefault) {
              const containerName = formatContainerName(trimmed, this.currentHostname);
              await browser.contextualIdentities.update(profileId, { name: containerName });
            }

            await this.loadData();
            await this.render();
          }
        }

        const deleteBtn = (e.target as HTMLElement).closest('.delete-btn') as HTMLElement | null;
        if (deleteBtn) {
          const profileId = deleteBtn.dataset.profileId;
          if (!profileId || !this.currentHostname) return;

          if (confirm('Delete this profile? This will remove its container.')) {
            await browser.contextualIdentities.remove(profileId);

            const [currentProfiles, currentHostnameMap, lastMap] = await Promise.all([
              profiles.getValue(),
              hostnameProfiles.getValue(),
              lastSelected.getValue(),
            ]);

            const { [profileId]: _removed, ...remainingProfiles } = currentProfiles;

            const hostname = this.currentHostname;
            const oldIds = currentHostnameMap[hostname] ?? [];
            const newIds = oldIds.filter(id => id !== profileId);

            const newHostnameMap = { ...currentHostnameMap };
            if (newIds.length === 0) {
              delete newHostnameMap[hostname];
            } else {
              newHostnameMap[hostname] = newIds;
            }

            const hasDefault = newIds.some(id => remainingProfiles[id]?.isDefault);
            if (!hasDefault) {
              delete remainingProfiles[DEFAULT_CONTAINER_ID];
            }

            const { [hostname]: _last, ...remainingLast } = lastMap;

            await Promise.all([
              profiles.setValue(remainingProfiles),
              hostnameProfiles.setValue(newHostnameMap),
              lastSelected.setValue(remainingLast),
            ]);

            await this.loadData();
            await this.render();
          }
        }
      });
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

let app: ContainerManager;
document.addEventListener('DOMContentLoaded', () => {
  app = new ContainerManager();
  app.init().catch(err => console.error('Failed to start app:', err));
});
