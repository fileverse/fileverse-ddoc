import { ICollaborationConfig } from '../../../package/types';

export const collabStore = {
  getCollabConf: () => {
    const collabConfig = localStorage.getItem('collabConfig');
    const config = collabConfig ? JSON.parse(collabConfig) : null;

    return config;
  },
  setCollabConf: (collabConfig: ICollaborationConfig) => {
    localStorage.setItem('collabConfig', JSON.stringify(collabConfig));
  },
  clearCollabConf: () => {
    localStorage.removeItem('collabConfig');
  },
};
