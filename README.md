# MacMac 🦊

Account-based container management for Firefox.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with WXT](https://img.shields.io/badge/built%20with-WXT-0052cc)](https://wxt.dev)

## ✨ Features

- **Account-based isolation** — Each container represents one account on a website. Your sessions, cookies, and data stay completely separate between accounts on the same site.
- **Automatic container switching** — Visit a site and MacMac routes you to the right container without any clicks.
- **Per-site memory** — Your last used account for each site persists across sessions.
- **Popup interface** — Manage all your accounts for the current site in one place.
- **Open without switching** — Open another account in a new tab without changing your default. Useful for quickly checking a second account.
- **Full lifecycle from the popup** — Create, rename, delete, and open accounts in new tabs.

## 🧠 How it works

Open the popup on any website and click **Create New Account**. MacMac creates an unnamed container (auto-named "Account 1", "Account 2", etc.), opens the site in it, and you log in. You can rename the account later from the popup.

Each container is named `AccountName (hostname)` internally — e.g., `Account 1 (facebook.com)` — which binds it to that site.

## 🛠️ Implementation 
Under the hood, three storage keys handle everything:
- `accounts` — account metadata (id, name, hostnames)
- `hostnameAccounts` — hostname-to-account lookup
- `lastSelected` — per-hostname preference for which account to use

When you navigate to a site, the background script checks `lastSelected`. If an account is mapped, the tab switches to it. If not, the default (no-container) identity is used.

## 📖 Usage

**Creating an account:** click the toolbar icon, click **+ Create New Account**. A new unnamed container is created and activated. Log into your account, then rename it from the popup if you want.

**Switching accounts:** click any account card in the popup. Your choice is saved for future visits.

**Opening without switching:** click the new-tab icon on an account card to open the site in that container without changing your default mapping.

## 🛠️ Development

```bash
bun install           # install deps + WXT postinstall
bun run dev           # dev server with hot reload
bun run compile       # type-check
bun run lint          # lint
bun run build:firefox # production build
```

## 🤝 Contributing

PRs and issues welcome. Open a discussion for feature requests or bugs.

## ⭐ Support

If MacMac is useful to you, consider giving the repo a star on [GitHub](https://github.com/oxcl/macmac) or making a [donation](https://oxcl.github.io/macmac/#donate).
