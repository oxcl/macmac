import { supportReminder, type SupportReminder } from '@/utils/storage';
import { showSupportModal, type SupportAction } from './modal';

const supportUrls: Record<SupportAction, string> = {
  github: '',
  rate: '',
  donate: '',
  'not-interested': '',
};

function isSupportReminderDue(reminder: SupportReminder): boolean {
  const now = Date.now();
  const daysMs = 24 * 60 * 60 * 1000;
  if (reminder.dismissCount === 0) {
    return now - reminder.installedAt >= 3 * daysMs;
  }
  const interval = Math.round(3 * Math.pow(1.5, reminder.dismissCount - 1));
  const last = reminder.lastDismissedAt ?? reminder.installedAt;
  return now - last >= interval * daysMs;
}

export async function checkSupportReminder(): Promise<void> {
  let reminder = await supportReminder.getValue();
  if (!reminder) {
    await supportReminder.setValue({
      installedAt: Date.now(),
      lastDismissedAt: null,
      dismissCount: 0,
    });
    return;
  }
  if (!isSupportReminderDue(reminder)) return;

  const action = await showSupportModal();

  const nextReminder: SupportReminder = {
    ...reminder,
    lastDismissedAt: Date.now(),
    dismissCount: reminder.dismissCount + 1,
  };
  await supportReminder.setValue(nextReminder);

  const url = supportUrls[action];
  if (url) {
    await browser.tabs.create({ url, active: false });
  }
}
