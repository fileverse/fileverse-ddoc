export const getHash = () =>
  typeof window !== 'undefined'
    ? decodeURIComponent(window.location.hash.replace('#', ''))
    : undefined;

export const getKeyFromURLParams = (searchParams: URLSearchParams) => {
  const urlHash = getHash();
  if (!urlHash) return searchParams.get('key');
  const params = new URLSearchParams(urlHash);
  return params.get('key');
};

export function generateDocId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function getDocIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('doc');
}

export function getTabIdFromURL(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get('tab') || undefined;
}

export function setURLParams(params: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState({}, '', url.toString());
}

export function buildDocTabURL(docId: string, tabId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('doc', docId);
  url.searchParams.set('tab', tabId);
  url.hash = '';
  return url.toString();
}
