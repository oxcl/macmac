export interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'no_restriction' | 'lax' | 'strict' | 'unspecified';
  expirationDate?: number;
}

export type CookieJars = Record<string, Record<string, StoredCookie[]>>;

interface StorageItemLike<T> {
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
}

function buildCookieUrl(cookie: { domain: string; path: string; secure: boolean }): string {
  const protocol = cookie.secure ? 'https' : 'http';
  const domain = cookie.domain.replace(/^\./, '');
  return `${protocol}://${domain}${cookie.path}`;
}

export class CookieStore {
  constructor(private store: StorageItemLike<CookieJars>) {}

  async saveForHostname(accountId: string, hostname: string): Promise<void> {
    const cookies = await chrome.cookies.getAll({ domain: hostname });
    const jars = await this.store.getValue();
    if (!jars[accountId]) jars[accountId] = {};
    jars[accountId][hostname] = cookies.map((c: chrome.cookies.Cookie) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate,
    }));
    await this.store.setValue(jars);
  }

  async restoreForHostname(accountId: string, hostname: string): Promise<void> {
    const existing = await chrome.cookies.getAll({ domain: hostname });
    for (const cookie of existing) {
      await chrome.cookies.remove({
        url: buildCookieUrl(cookie),
        name: cookie.name,
      });
    }

    const jars = await this.store.getValue();
    const hostnameCookies = jars[accountId]?.[hostname] ?? [];
    for (const cookie of hostnameCookies) {
      try {
        await chrome.cookies.set({
          url: buildCookieUrl(cookie),
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
        });
      } catch (e) {
        console.warn('[cookie-store] Failed to set cookie:', cookie.name, e);
      }
    }
  }

  async clearForHostname(hostname: string): Promise<void> {
    const existing = await chrome.cookies.getAll({ domain: hostname });
    for (const cookie of existing) {
      await chrome.cookies.remove({
        url: buildCookieUrl(cookie),
        name: cookie.name,
      });
    }
  }

  async onCookieChanged(
    changeInfo: chrome.cookies.CookieChangeInfo,
    binding: { accountId: string; hostname: string } | null
  ): Promise<void> {
    if (!binding) return;
    const jars = await this.store.getValue();
    if (!jars[binding.accountId]) jars[binding.accountId] = {};
    if (!jars[binding.accountId][binding.hostname]) {
      jars[binding.accountId][binding.hostname] = [];
    }
    const hostCookies = jars[binding.accountId][binding.hostname];
    const idx = hostCookies.findIndex(
      (c: StoredCookie) =>
        c.name === changeInfo.cookie.name &&
        c.domain === changeInfo.cookie.domain &&
        c.path === changeInfo.cookie.path
    );
    if (changeInfo.removed) {
      if (idx !== -1) hostCookies.splice(idx, 1);
    } else {
      const stored: StoredCookie = {
        name: changeInfo.cookie.name,
        value: changeInfo.cookie.value,
        domain: changeInfo.cookie.domain,
        path: changeInfo.cookie.path,
        secure: changeInfo.cookie.secure,
        httpOnly: changeInfo.cookie.httpOnly,
        sameSite: changeInfo.cookie.sameSite,
        expirationDate: changeInfo.cookie.expirationDate,
      };
      if (idx !== -1) {
        hostCookies[idx] = stored;
      } else {
        hostCookies.push(stored);
      }
    }
    await this.store.setValue(jars);
  }

  async getCookies(accountId: string, hostname: string): Promise<StoredCookie[]> {
    const jars = await this.store.getValue();
    return jars[accountId]?.[hostname] ?? [];
  }
}
