import { createProxyService } from '@webext-core/proxy-service';
import { lastSelected, DEFAULT_CONTAINER_ID } from '@/utils/storage';
import { TAB_SERVICE_KEY } from '@/utils/tab-service';
import { getCurrentTab } from '@/utils/tabs';
import type { AppData } from './types';
import { checkSupportReminder } from './actions-support';

const tabService = createProxyService(TAB_SERVICE_KEY);

export async function handleOpenInNewTab(accountId: string, data: AppData): Promise<void> {
  if (!data.hostname) return;

  const lastMap = await lastSelected.getValue();
  lastMap[data.hostname] = accountId;
  await lastSelected.setValue(lastMap);

  const currentTab = await getCurrentTab();
  const url = `https://${data.hostname}`;

  if (accountId === DEFAULT_CONTAINER_ID) {
    await tabService.openInDefault(url, currentTab.index, currentTab.id);
  } else {
    await tabService.openInContainer(url, accountId, currentTab.index, currentTab.id);
  }

  await checkSupportReminder();
  window.close();
}

export async function handleOpenInTabWithoutSwitch(
  accountId: string,
  data: AppData
): Promise<void> {
  if (!data.hostname) return;

  const lastMap = await lastSelected.getValue();
  lastMap[data.hostname] = accountId;
  await lastSelected.setValue(lastMap);

  const currentTab = await getCurrentTab();
  const url = `https://${data.hostname}`;

  if (accountId === DEFAULT_CONTAINER_ID) {
    await tabService.openInDefault(url, currentTab.index + 1);
  } else {
    await tabService.openInContainer(url, accountId, currentTab.index + 1);
  }

  window.close();
}
