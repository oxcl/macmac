import { lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';
import type { AppData } from './types';
import { checkSupportReminder } from './actions-support';

export async function handleOpenInNewTab(accountId: string, data: AppData): Promise<void> {
  if (!data.hostname) return;

  const lastMap = await lastSelected.getValue();
  lastMap[data.hostname] = accountId;
  await lastSelected.setValue(lastMap);

  const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  const cookieStoreId = accountId === DEFAULT_CONTAINER_ID ? undefined : accountId;
  await browser.runtime.sendMessage({
    type: 'createTab',
    url: `https://${data.hostname}`,
    cookieStoreId,
    index: currentTab.index,
    oldTabId: currentTab.id,
  });

  await checkSupportReminder();

  window.close();
}

export async function handleOpenInTabWithoutSwitch(
  accountId: string,
  data: AppData
): Promise<void> {
  if (!data.hostname) return;

  const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  const cookieStoreId = accountId === DEFAULT_CONTAINER_ID ? undefined : accountId;
  await browser.runtime.sendMessage({
    type: 'createTab',
    url: `https://${data.hostname}`,
    cookieStoreId,
    index: currentTab.index + 1,
    oldTabId: undefined,
  });
  window.close();
}
