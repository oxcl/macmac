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
