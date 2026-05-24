# MacMac for Firefox

## Overview

MacMac is a Firefox extension that provides an intuitive, account-based interface for managing Firefox containers. It allows you to create separate containers for different accounts on the same website (e.g., Work Email, Personal Email) and automatically switch to the appropriate container when visiting a site.

## Key Features

- **Account-Based Organization**: Create multiple containers per website, each representing an account (e.g., "Work", "Personal").
- **Automatic Switching**: Firefox automatically opens websites in the last selected container for that site.
- **Simple UI**: Popup interface to create, rename, switch, and delete accounts.
- **Persistent Selection**: Your last used account for each website is remembered across sessions.
- **No Complex Rules**: Uses a straightforward naming convention (`name (hostname)`) to bind containers to websites.

## How It Works

1. **Container Naming**: Each container is named `name (hostname)` (e.g., `Work (facebook.com)`). This binds the container to that hostname.
2. **Storage**: The extension stores profile mappings in `browser.storage.local` using three keys: `profiles` (container metadata), `hostnameProfiles` (hostname → container IDs), and `lastSelected` (hostname → last used container ID).
3. **Automatic Switching**: A background script listens for tab updates. When you navigate to a website, it checks the `lastSelected` mapping and switches the tab to that container automatically.
4. **Manual Override**: If you manually open a site in a different container (via Firefox's built-in container menu), the extension respects your choice and does not override it.

## Usage

### Installation

1. Clone the repository.
2. Run `bun install` and `bun run build:firefox`.
3. Open Firefox and navigate to `about:debugging`.
4. Click "This Firefox" and then "Load Temporary Add-on".
5. Select the `manifest.json` file from `.output/firefox-mv2/`.
6. The extension icon will appear in the toolbar.

### Creating an Account

1. Click the extension icon to open the popup.
2. Click "Create New Account".
3. Enter an account name (e.g., "Work").
4. The extension creates a new container for the current website and selects it as the default.

### Switching Accounts

- In the popup, click "Switch to this account" under any available container.
- The extension remembers your choice and automatically opens that website in the selected container in the future.

### Renaming an Account

- Click the "Rename" button next to a container and enter a new name.

### Deleting an Account

- Click the "Delete" button next to a container. This removes the container and clears any stored mapping for that hostname.

## Benefits

- **Privacy**: Keep different accounts separate with container isolation.
- **Convenience**: No need to manually switch containers each time; the extension remembers your preferences.
- **Simplicity**: Easy-to-use interface without complex rule configuration.
- **Flexibility**: Create as many accounts as you need per website.

## Technical Details

- **Permissions**: `contextualIdentities`, `cookies`, `tabs`, `storage`
- **Framework**: Built with WXT (Web Extension Toolkit) for hot reloading and TypeScript support.
- **APIs Used**: `browser.contextualIdentities`, `browser.tabs`, `browser.storage.local`

## Development

To hack on this extension:

```bash
bun install
bun run dev
```

This will start the development server with hot reloading. The extension will automatically reload when changes are made.

## License

This project is licensed under the MIT License.
