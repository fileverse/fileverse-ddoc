import { createPublicClient, Hex, http, isAddress, PublicClient } from 'viem';
import { mainnet } from 'viem/chains';

export const getAddressName = async (
  address: string,
  ensProviderUrl: string,
): Promise<{ name: string; isEns: boolean; resolved: boolean }> => {
  const response = {
    name: address,
    isEns: false,
    resolved: false,
  };
  if (!ensProviderUrl)
    throw new Error('cannot fetch ens name without a provider url');
  if (!isAddress(address)) return response;
  try {
    const ensName = await resolveEnsAddress(address, ensProviderUrl);
    if (ensName) {
      response.name = ensName;
      response.isEns = true;
      response.resolved = true;
    } else {
      response.name = address;
      response.isEns = false;
      response.resolved = true;
    }
  } catch (error) {
    console.log(error);
  }
  return response;
};

export const resolveEnsAddress = async (
  address: string,
  ensProviderUrl: string,
) => {
  const client = MainnetPublicClient.getClient(ensProviderUrl);
  const ensName = await client.getEnsName({ address: address as Hex });

  return ensName;
};

export const getTrimmedName = (name: string, length: number, limit: number) => {
  if (name?.length > limit) {
    const first = name.substring(0, length);
    const last = name.substring(name?.length - length);
    return `${first}...${last}`;
  }
  return name;
};

class MainnetPublicClient {
  static client: PublicClient | undefined;

  static getClient(url: string) {
    if (this.client) return this.client;

    this.client = createPublicClient({
      transport: http(url),
      chain: mainnet,
    });
    return this.client;
  }
}
