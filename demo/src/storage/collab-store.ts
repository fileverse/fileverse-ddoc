export interface CollabConfig {
  roomKey: string;
  collaborationId: string;
  username: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  wsUrl: string;
}
export const collabStore = {
  getCollabConf: () => {
    const collabConfig = localStorage.getItem('collabConfig');
    const config = collabConfig ? JSON.parse(collabConfig) : null;

    return config;
  },
  setCollabConf: (collabConfig: CollabConfig) => {
    localStorage.setItem('collabConfig', JSON.stringify(collabConfig));
  },
  clearCollabConf: () => {
    localStorage.removeItem('collabConfig');
  },
};
