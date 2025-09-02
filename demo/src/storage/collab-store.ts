export interface CollabConfig {
  roomKey: string;
  collaborationId: string;
  username: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
}
export const collabStore = {
  getCollabConf: () => {
    const collabConfig = localStorage.getItem('collabConfig');
    return collabConfig ? JSON.parse(collabConfig) : null;
  },
  setCollabConf: (collabConfig: CollabConfig) => {
    localStorage.setItem('collabConfig', JSON.stringify(collabConfig));
  },
  clearCollabConf: () => {
    localStorage.removeItem('collabConfig');
  },
};
