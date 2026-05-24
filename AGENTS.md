# AGENTS.md

Compact instructions for agents working on the MacMac Firefox extension.

## Project Overview

- **Goal**: Firefox extension that provides an account-based interface for container management.
- **Tech Stack**: WXT (Web Extension Toolkit) with TypeScript, vanilla DOM popup.
- **Key Features**: Automatic container switching based on hostname, container creation/renaming/deletion, persistent last-selected mapping.

## File Structure

```
/project-root
  /entrypoints
    /background.ts      # Background script (auto-switch logic)
    /popup
      index.html        # Popup HTML shell
      main.ts           # Popup logic (UI + container management)
      style.css         # Popup styles
  /utils
    storage.ts          # Storage definitions, profile types, helper functions
  /types
    global.d.ts         # Browser API type augmentations
  wxt.config.ts         # WXT configuration (permissions, warnings)
  package.json          # Scripts and dependencies
  README.md             # Project overview
```

## Developer Commands

### Installation

```bash
bun install
```

Installs dependencies. WXT will run `postinstall` script to prepare types.

### Development Server

```bash
bun run dev
```

Starts WXT dev server with hot reloading. Opens Firefox with extension installed (if Firefox is available). Use `bun run dev:firefox` to target Firefox explicitly (default is Chrome).

### Build

```bash
bun run build
```

Builds extension for production. Output to `.output/` directory.

### Build for Firefox

```bash
bun run build:firefox
```

### Zip for Distribution

```bash
bun run zip
```

Creates a store-ready zip in `.output/`.

### Test

No formal test suite. Verify functionality by:

1. Load extension in Firefox via `about:debugging`.
2. Use popup to create containers.
3. Navigate to websites to test auto-switch.

### Lint & Typecheck

```bash
bun run compile
bun run lint
```

Checks TypeScript types and runs ESLint.

## Code Conventions

### Browser API Usage

- Use `browser` global (WebExtensions API). Types are augmented in `types/global.d.ts` extending `@wxt-dev/browser` for `tabs`, `contextualIdentities`, and related APIs.
- For container operations: `browser.contextualIdentities.create/query/update/remove`.
- For tab operations: `browser.tabs.query/update/get`.
- For storage: WXT's `storage.defineItem` API (see `utils/storage.ts`).

### Container Naming

Containers must follow the format `name (hostname)` (e.g., `Work (facebook.com)`). This binds the container to the hostname. The extension uses `formatContainerName()` in `utils/storage.ts` to produce this format.

### Storage Schema

All storage uses WXT's `storage.defineItem` API with `local:` prefix:

- `local:profiles`: `Record<string, Profile>` — maps container ID to `Profile` object (`id`, `name`, `hostnames`, `isDefault`).
- `local:hostnameProfiles`: `Record<string, string[]>` — maps hostname to array of container IDs.
- `local:lastSelected`: `Record<string, string>` — maps hostname to the cookieStoreId of the last selected container. If absent or `null`, default container is used.

### Background Script Logic

- Listens to `tabs.onUpdated` with `status === 'complete'`.
- When navigating to a new hostname, checks `lastSelected` mapping.
- If a container is mapped, updates the tab's `cookieStoreId` to that container, **unless** the tab is in the `manualTabIds` Set (populated by `skipAutoSwitch` messages from the popup).
- Does not interfere with manual container switches via Firefox's UI.

### Popup Logic

- Displays containers for the current hostname (loaded from `hostnameProfiles` storage).
- Allows creating new containers (unnamed if no name provided).
- Allows renaming (preserving hostname prefix).
- Allows deleting containers (cleans up `lastSelected` if needed).
- Switching a container updates `lastSelected` and applies it immediately.

## Important Notes

- **TypeScript**: The project uses TypeScript with proper type augmentations for browser APIs in `types/global.d.ts`.
- **WXT**: Uses WXT framework; hot reloading is available during development.
- **Permissions**: Manifest includes `contextualIdentities`, `cookies`, `tabs`, and `storage`.
- **No Content Script**: The extension does not use a content script; all logic is in background and popup.
- **Automatic Switching**: Implemented via background script; no external extension is required.

## Testing Manually

1. Load the extension in Firefox via `about:debugging` > "Load Temporary Add-on".
2. Click the extension icon to open popup.
3. Create a container for the current website.
4. Navigate to that website in a new tab; it should open in the created container.
5. Switch to another container in the popup; subsequent navigations should use the new container.
6. Delete a container; ensure it's removed and mapping cleared.

## Debugging

- Check background script console: `about:debugging` > "Inspect" for the background page.
- Check popup console: right-click popup and select "Inspect".
- View `browser.storage.local` at `about:debugging` > "Inspect" > Storage tab.

## Common Pitfalls

- **Container Naming**: Always include hostname in parentheses; otherwise, the container won't be associated with any website.
- **Manual Container Switch**: If you manually switch a tab to a different container via Firefox's UI, the extension will not override it. This is intended behavior.
- **TypeScript Errors**: Type augmentations for browser APIs are in `types/global.d.ts`. If you encounter type errors, extend the module there.
- **WXT Build**: Ensure you run `bun run dev` from the project root, not subdirectories.

## References

- README.md for project overview.
- wxt.config.ts for configuration.
- package.json for scripts and dependencies.
- Entrypoints for code structure.

## Questions?

If you need further clarification, ask the user before proceeding.
