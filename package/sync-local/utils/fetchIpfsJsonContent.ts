import { IPFS_GATEWAYS } from '../constants';

export async function fetchIpfsJsonContent(cid: string) {
  const fetchPromises = IPFS_GATEWAYS.map((gateway) => {
    const url = `${gateway}/ipfs/${cid}`;
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          return Promise.reject(
            new Error(
              `Failed to fetch from ${gateway}: ${response.statusText}`,
            ),
          );
        }
        return response.json();
      })
      .catch((error) => {
        return Promise.reject(
          new Error(`Error fetching from ${gateway}: ${error.message}`),
        );
      });
  });
  try {
    // @ts-expect-error - Promise.any is not supported in the current version of TypeScript
    const result = await Promise.any(fetchPromises);
    return result;
  } catch (error) {
    throw new Error('All fetch attempts failed');
  }
}
