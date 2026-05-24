export function getHostnameFromContainerName(containerName: string): string | null {
  const match = containerName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return match[2];
  }
  return null;
}

export function parseContainerName(containerName: string): { hostname: string | null; accountName: string | null } {
  const match = containerName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { hostname: match[2], accountName: match[1] };
  }
  return { hostname: null, accountName: null };
}

export function formatContainerName(hostname: string, accountName: string): string {
  return `${accountName} (${hostname})`;
}

export function generateUnnamedName(hostname: string, index: number): string {
  return `unnamed ${index} (${hostname})`;
}

export function getNextUnnamedIndex(containerNames: string[], hostname: string): number {
  const namesForHost = containerNames
    .map(parseContainerName)
    .filter(parsed => parsed.hostname === hostname && parsed.accountName?.startsWith('unnamed'))
    .map(parsed => parsed.accountName)
    .filter(name => name !== null) as string[];
  
  let maxIndex = 0;
  for (const name of namesForHost) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      const index = parseInt(parts[parts.length - 1]);
      if (!isNaN(index) && index > maxIndex) {
        maxIndex = index;
      }
    }
  }
  return maxIndex + 1;
}

export function sanitizeContainerName(name: string): string {
  return name.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}

export function lastSelectedKey(hostname: string): string {
  return `lastSelected://${hostname}`;
}