import type { ProxyServiceKey } from '@webext-core/proxy-service';

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
  cleanupBindingsForContainer(cookieStoreId: string): void;
  getTabBinding(tabId: number): TabBinding | null;
}

export const TAB_SERVICE_KEY = 'tab-service' as ProxyServiceKey<TabService>;
