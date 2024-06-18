import { getDefaultProvider } from 'ethers';
import { isAddress } from 'ethers';

export const getAddressName = async (
  address: string,
  ensProviderUrl: string
): Promise<{ name: string; isEns: boolean }> => {
  const response = {
    name: address,
    isEns: false
  };
  if (!ensProviderUrl)
    throw new Error('cannot fetch ens name without a provider url');
  if (!isAddress(address)) return response;
  try {
    const ensName = await resolveEnsAddress(address, ensProviderUrl);
    if (ensName) {
      response.name = ensName;
      response.isEns = true;
    }
  } catch (error) {
    console.log(error);
  }
  return response;
};

export const resolveEnsAddress = async (
  address: string,
  ensProviderUrl: string
) => {
  const provider = getEnsProvider(ensProviderUrl);

  const ensName = await provider.lookupAddress(address);

  return ensName;
};

export const getEnsProvider = (network: string) => {
  const provider = getDefaultProvider(network);
  return provider;
};
