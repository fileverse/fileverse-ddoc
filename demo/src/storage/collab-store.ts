/** Minimal shape for persisting collab connection info across reloads. */
export interface StoredCollabConfig {
  roomKey: string;
  roomId: string;
  wsUrl: string;
  isOwner: boolean;
  username: string;
  isEns?: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
}

export const collabStore = {
  getCollabConf: (): StoredCollabConfig | null => {
    const raw = localStorage.getItem('collabConfig');
    return raw ? JSON.parse(raw) : null;
  },
  setCollabConf: (config: StoredCollabConfig) => {
    localStorage.setItem('collabConfig', JSON.stringify(config));
  },
  clearCollabConf: () => {
    localStorage.removeItem('collabConfig');
  },
};
