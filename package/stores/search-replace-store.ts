import { create } from 'zustand';

type StoreActions = {
  setSearchTerm: (val: string) => void;
  setReplaceTerm: (val: string) => void;
  setShowReplacePopover: (val: boolean) => void;
  toggleShowReplacePopover: () => void;
};
type Store = {
  showSearchReplacePopover: boolean;
  searchTerm: string;
  replaceTerm: string;
  actions: StoreActions;
};

export const useSearchReplaceStore = create<Store>()((set) => ({
  showSearchReplacePopover: false,
  searchTerm: '',
  replaceTerm: '',
  actions: {
    setSearchTerm: (val) => set({ searchTerm: val }),
    setReplaceTerm: (val) => set({ replaceTerm: val }),
    setShowReplacePopover: (val) =>
      set({
        showSearchReplacePopover: val,
      }),
    toggleShowReplacePopover: () =>
      set((state) => ({
        showSearchReplacePopover: !state.showSearchReplacePopover,
      })),
  },
}));
