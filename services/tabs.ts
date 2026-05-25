import type { ProxyServiceKey } from '@webext-core/proxy-service';
import { createProxyService } from '@webext-core/proxy-service';

export interface TabBinding {
  hostname: string;
  cookieStoreId: string;
}

export interface TabService {
  openInContainer(
    url: string,
    cookieStoreId: string,
    index: number,
    replaceCurrentTabId?: number
  ): Promise<void>;
  openInDefault(url: string, index: number, replaceCurrentTabId?: number): Promise<void>;
  openInAccount(
    url: string,
    accountId: string,
    index: number,
    replaceCurrentTabId?: number
  ): Promise<void>;
  cleanupBindingsForContainer(cookieStoreId: string): void;
  getTabBinding(tabId: number): Promise<TabBinding | null>;
}

export const TAB_SERVICE_KEY = 'tab-service' as ProxyServiceKey<TabService>;

export const tabService: TabService = createProxyService(TAB_SERVICE_KEY);

export async function getCurrentTab(): Promise<Browser.tabs.Tab> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export function toHttpsUrl(hostname: string): string {
  return `https://${hostname}`;
}
