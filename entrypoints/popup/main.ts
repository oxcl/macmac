import './style.css';

// Helper to get container UUID from storage
async function getContainerUUID(containerId: string): Promise<string> {
  const key = `identitiesState@@_firefox-container-${containerId}`;
  const storage = await browser.storage.local.get(key);
  return storage[key]?.macAddonUUID || '';
}

// Format domain from URL
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Main popup application
class ContainerManager {
  private appDiv = document.querySelector<HTMLDivElement>('#app')!;
  private containers: browser.contextualIdentities.ContextualIdentity[] = [];
  private assignments: Map<string, Assignment> = new Map();

  async init() {
    await this.loadData();
    await this.render();
    this.setupEventListeners();
  }

  async loadData() {
    // Load containers
    try {
      this.containers = await browser.contextualIdentities.query({});
    } catch (err) {
      console.error('Failed to query containers:', err);
      this.containers = [];
    }

    // Load site assignments from storage
    try {
      const storage = await browser.storage.local.get(null);
      this.assignments = new Map();
      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith('siteContainerMap@@_')) {
          const domain = key.replace('siteContainerMap@@_', '');
          if (value && typeof value === 'object' && 'userContextId' in value) {
            this.assignments.set(domain, value as Assignment);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      this.assignments.clear();
    }
  }

  async render() {
    this.appDiv.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'container';
    
    // Header
    const header = document.createElement('header');
    header.innerHTML = `
      <img src="${browser.runtime.getURL('wxt.svg')}" class="logo" alt="WXT logo" />
      <h1>Account-Based Containers</h1>
    `;
    container.appendChild(header);

    // Create container form
    const createSection = document.createElement('section');
    createSection.className = 'create-container-section';
    createSection.innerHTML = `
      <h2>Create New Container</h2>
      <div class="form-group">
        <label for="containerName">Name:</label>
        <input type="text" id="containerName" placeholder="e.g. Work" />
      </div>
      <div class="form-group">
        <label for="containerColor">Color:</label>
        <select id="containerColor">
          <option value="blue">Blue</option>
          <option value="red">Red</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="purple">Purple</option>
        </select>
      </div>
      <button id="createContainerBtn" type="button">Create Container</button>
      <div id="createMessage" class="message"></div>
    `;
    container.appendChild(createSection);

    // Containers list
    const listSection = document.createElement('section');
    listSection.className = 'containers-list';
    listSection.innerHTML = `<h2>Containers</h2>`;
    
    if (this.containers.length === 0) {
      listSection.innerHTML += `<p>No containers found. Create one!</p>`;
    } else {
      for (const containerData of this.containers) {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'container-item';
        containerDiv.innerHTML = `
          <div class="container-header" style="border-left: 8px solid ${containerData.color || 'gray'};">
            <h3>${containerData.name}</h3>
            <span class="container-id">ID: ${containerData.cookieStoreId}</span>
          </div>
          <div class="container-assignments">
            <h4>Assigned Websites:</h4>
            <ul class="assignment-list" data-container-id="${containerData.cookieStoreId.replace('firefox-container-', '')}">
              ${this.getAssignmentsForContainer(containerData.cookieStoreId).map(assign => `
                <li>
                  <span class="domain">${assign.domain}</span>
                  <button class="remove-assignment" data-domain="${assign.domain}">Remove</button>
                </li>
              `).join('')}
            </ul>
            <div class="add-assignment">
              <input type="text" class="website-url" placeholder="Enter URL (e.g. https://github.com)" />
              <button class="add-assignment-btn" data-container-id="${containerData.cookieStoreId.replace('firefox-container-', '')}">Add Assignment</button>
            </div>
          </div>
        `;
        listSection.appendChild(containerDiv);
      }
    }
    container.appendChild(listSection);

    // Global stats
    const statsSection = document.createElement('section');
    statsSection.className = 'stats';
    statsSection.innerHTML = `
      <h2>Statistics</h2>
      <p>Total Containers: ${this.containers.length}</p>
      <p>Total Assignments: ${this.assignments.size}</p>
    `;
    container.appendChild(statsSection);

    this.appDiv.appendChild(container);
  }

  getAssignmentsForContainer(containerId: string): AssignmentInfo[] {
    return Array.from(this.assignments.entries())
      .filter(([, assign]) => assign.userContextId === containerId.replace('firefox-container-', ''))
      .map(([domain, assign]) => ({ domain, neverAsk: assign.neverAsk }));
  }

  async setupEventListeners() {
    // Create container button
    const createBtn = document.querySelector('#createContainerBtn');
    const nameInput = document.querySelector('#containerName') as HTMLInputElement;
    const colorSelect = document.querySelector('#containerColor') as HTMLSelectElement;
    const createMessage = document.querySelector('#createMessage') as HTMLDivElement;

    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const color = colorSelect.value;
        if (!name) {
          createMessage.textContent = 'Please enter a name';
          createMessage.className = 'message error';
          return;
        }

        try {
          const newContainer = await browser.contextualIdentities.create({
            name,
            color,
            icon: 'default', // Could add icon selection later
          });
          createMessage.textContent = `Container "${name}" created successfully!`;
          createMessage.className = 'message success';
          nameInput.value = '';
          await this.loadData();
          await this.render();
        } catch (err) {
          createMessage.textContent = `Error creating container: ${err}`;
          createMessage.className = 'message error';
        }
      });
    }

    // Add assignment buttons (delegated)
    this.appDiv.addEventListener('click', async (e) => {
      const addBtn = (e.target as HTMLElement).closest('.add-assignment-btn');
      if (addBtn) {
        const btn = addBtn as HTMLButtonElement;
        const containerId = btn.dataset.containerId;
        const input = btn.previousElementSibling as HTMLInputElement;
        const url = input.value.trim();
        const domain = getDomain(url);
        if (!domain) {
          alert('Please enter a valid URL');
          return;
        }

        try {
          // Get container UUID
          const fullContainerId = `firefox-container-${containerId}`;
          const containerUUID = await getContainerUUID(containerId);
          if (!containerUUID) {
            alert('Could not find container UUID. Ensure the container exists.');
            return;
          }

          // Save assignment
          await browser.storage.local.set({
            [`siteContainerMap@@_${domain}`]: {
              userContextId: containerId,
              neverAsk: true,
              identityMacAddonUUID: containerUUID,
            },
          });

          input.value = '';
          await this.loadData();
          await this.render();
        } catch (err) {
          alert(`Error assigning website: ${err}`);
        }
      }

      // Remove assignment buttons
      const removeBtn = (e.target as HTMLElement).closest('.remove-assignment');
      if (removeBtn) {
        const btn = removeBtn as HTMLButtonElement;
        const domain = btn.dataset.domain;
        try {
          await browser.storage.local.remove(`siteContainerMap@@_${domain}`);
          await this.loadData();
          await this.render();
        } catch (err) {
          alert(`Error removing assignment: ${err}`);
        }
      }
    });
  }
}

interface Assignment {
  userContextId: string;
  neverAsk?: boolean;
  identityMacAddonUUID?: string;
}

interface AssignmentInfo {
  domain: string;
  neverAsk: boolean;
}

// Initialize when popup loads
let app: ContainerManager;
document.addEventListener('DOMContentLoaded', () => {
  app = new ContainerManager();
  app.init().catch(err => console.error('Failed to start app:', err));
});
