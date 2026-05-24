/// <reference path="../../types/global.d.ts" />

import './style.css';
import { 
  getHostnameFromContainerName, 
  parseContainerName, 
  formatContainerName, 
  sanitizeContainerName,
  lastSelectedKey 
} from '@/utils/containerUtils';

class ContainerManager {
  private appDiv: HTMLElement | null = null;
  private containers: any[] = [];
  private currentHostname: string | null = null;
  private lastSelectedContainerId: string | null = null;

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
    // Get current tab URL and hostname
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

    // Load all containers
    try {
      this.containers = await browser.contextualIdentities.query({});
    } catch (err) {
      console.error('Failed to query containers:', err);
      this.containers = [];
    }

    // Load last selected container for current hostname
    if (this.currentHostname) {
      const key = lastSelectedKey(this.currentHostname);
      const result = await browser.storage.local.get(key);
      this.lastSelectedContainerId = (result[key] as string) || null;
    } else {
      this.lastSelectedContainerId = null;
    }
  }

  async render() {
    if (!this.appDiv) return;

    this.appDiv.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'container';

    // Header
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

    // Current hostname display
    const hostnameDisplay = document.createElement('div');
    hostnameDisplay.className = 'hostname-display';
    hostnameDisplay.textContent = `Website: ${this.currentHostname}`;
    container.appendChild(hostnameDisplay);

    // Create new account button
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

    // Containers list
    const listSection = document.createElement('section');
    listSection.className = 'containers-list';
    listSection.innerHTML = `<h2>Available Accounts</h2>`;

    // Filter containers for current hostname
    const containersForHost = this.containers.filter(c => {
      const hostname = getHostnameFromContainerName(c.name);
      return hostname === this.currentHostname;
    });

    if (containersForHost.length === 0) {
      listSection.innerHTML += `<p>No accounts created yet.</p>`;
    } else {
      for (const containerData of containersForHost) {
        const parsed = parseContainerName(containerData.name);
        const isLastSelected = containerData.cookieStoreId === this.lastSelectedContainerId;

        const containerDiv = document.createElement('div');
        containerDiv.className = 'container-item';
        containerDiv.innerHTML = `
          <div class="container-header" style="border-left: 4px solid ${containerData.color || 'gray'};">
            <h3>${sanitizeContainerName(parsed.accountName || 'Unnamed')}</h3>
            <span class="container-id">ID: ${containerData.cookieStoreId}</span>
          </div>
          <div class="container-actions">
            <button class="switch-btn" data-container-id="${containerData.cookieStoreId}">Switch to this account</button>
            <button class="rename-btn" data-container-id="${containerData.cookieStoreId}">Rename</button>
            <button class="delete-btn" data-container-id="${containerData.cookieStoreId}">Delete</button>
          </div>
          ${isLastSelected ? '<div class="status-badge">Current</div>' : ''}
        `;
        listSection.appendChild(containerDiv);
      }
    }
    container.appendChild(listSection);

    this.appDiv.appendChild(container);
  }

  async setupEventListeners() {
    // Create container button
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
          // Sanitize and generate container name with hostname
          const sanitizedAccountName = sanitizeContainerName(accountName);
          const containerName = formatContainerName(this.currentHostname!, sanitizedAccountName);
          
          // Pick a color based on number of existing containers for this hostname
          const containerColors = ['blue', 'turquoise', 'green', 'yellow', 'orange', 'red', 'pink', 'purple'];
          const containersForHost = this.containers.filter(c => {
            const hostname = getHostnameFromContainerName(c.name);
            return hostname === this.currentHostname;
          });
          const nextColor = containerColors[containersForHost.length % containerColors.length];
          
          // Create container
          const newContainer = await browser.contextualIdentities.create({
            name: containerName,
            color: nextColor,
            icon: 'circle',
          });

          // Select this container as the default for this hostname
          const key = lastSelectedKey(this.currentHostname!);
          await browser.storage.local.set({ [key]: newContainer.cookieStoreId });

          // Open hostname root in new container tab and close old one
          const rootUrl = `https://${this.currentHostname}`;
          const currentTab = await this.getCurrentTab();
          await browser.tabs.create({ url: rootUrl, cookieStoreId: newContainer.cookieStoreId });
          if (currentTab.id) await browser.tabs.remove(currentTab.id);

          // Close popup - the new tab is now active
          window.close();
        } catch (err) {
          createMessage.textContent = `Error creating container: ${err}`;
          createMessage.className = 'message error';
        }
      });
    }

    // Delegate for switch, rename, delete buttons
    if (this.appDiv) {
      this.appDiv.addEventListener('click', async (e) => {
      const switchBtn = (e.target as HTMLElement).closest('.switch-btn') as HTMLElement | null;
      if (switchBtn) {
        const containerId = switchBtn.dataset.containerId;
        const container = this.containers.find(c => c.cookieStoreId === containerId);
        if (container && containerId) {
          // Update last selected
          const key = lastSelectedKey(this.currentHostname!);
          await browser.storage.local.set({ [key]: containerId });
          this.lastSelectedContainerId = containerId;
          
          // Open hostname root in new container tab and close old one
          const rootUrl = `https://${this.currentHostname}`;
          const currentTab = await this.getCurrentTab();
          await browser.tabs.create({ url: rootUrl, cookieStoreId: containerId });
          if (currentTab.id) await browser.tabs.remove(currentTab.id);
          
          // Close popup - the new tab is now active
          window.close();
        }
      }

      const renameBtn = (e.target as HTMLElement).closest('.rename-btn') as HTMLElement | null;
      if (renameBtn) {
        const containerId = renameBtn.dataset.containerId;
        const container = this.containers.find(c => c.cookieStoreId === containerId);
        if (container && containerId) {
          const parsed = parseContainerName(container.name);
          const newAccountName = prompt('Enter new account name:', parsed.accountName || '');
          if (newAccountName !== null && newAccountName !== parsed.accountName) {
            const sanitizedName = sanitizeContainerName(newAccountName);
            const newName = formatContainerName(parsed.hostname!, sanitizedName);
            await browser.contextualIdentities.update(containerId, {
              name: newName,
            });
            await this.loadData();
            await this.render();
          }
        }
      }

      const deleteBtn = (e.target as HTMLElement).closest('.delete-btn') as HTMLElement | null;
      if (deleteBtn) {
        const containerId = deleteBtn.dataset.containerId;
        const container = this.containers.find(c => c.cookieStoreId === containerId);
        if (container && containerId) {
          if (confirm('Delete this account? This will remove its container.')) {
            await browser.contextualIdentities.remove(containerId);
            // Clean up lastSelected if it pointed to this container
            if (this.currentHostname) {
              const key = lastSelectedKey(this.currentHostname);
              const result = await browser.storage.local.get(key);
              if (result[key] === containerId) {
                await browser.storage.local.remove(key);
                this.lastSelectedContainerId = null;
              }
            }
            await this.loadData();
            await this.render();
          }
        }
      }
    });
    }
  }
}

// Initialize when popup loads
let app: ContainerManager;
document.addEventListener('DOMContentLoaded', () => {
  app = new ContainerManager();
  app.init().catch(err => console.error('Failed to start app:', err));
});