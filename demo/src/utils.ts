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
