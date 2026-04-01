import React, { useMemo, useRef } from 'react';
import {
  createCommentStore,
  CommentStoreContext,
  CommentStoreExternalDeps,
} from './comment-store';
import { useOnClickOutside } from 'usehooks-ts';

export interface CommentStoreProviderProps extends CommentStoreExternalDeps {
  children: React.ReactNode;
}

/**
 * Thin provider that:
 * 1. Creates a per-mount store instance
 * 2. Syncs React props into the store on every render
 * 3. Manages DOM refs (not in Zustand — refs are React concerns)
 * 4. Handles click-outside for comment dropdown
 */
export const CommentStoreProvider = ({
  children,
  ...props
}: CommentStoreProviderProps) => {
  // Create store once per mount — stable reference
  const store = useMemo(() => createCommentStore(), []);

  // Sync props into store on every render (not in useEffect — avoids stale reads)
  store.getState().syncExternalDeps(props);

  // --- DOM refs (not in Zustand — they're React/DOM concerns) ---
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler — close comment dropdown when clicking outside
  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    const state = store.getState();
    if (state.isCommentOpen) {
      state.setIsBubbleMenuSuppressed(true);
      state.setIsCommentOpen(false);
    }
  });

  return (
    <CommentStoreContext.Provider value={store}>
      <CommentRefsContext.Provider
        value={{
          commentsSectionRef,
          replySectionRef,
          portalRef,
          buttonRef,
          dropdownRef,
        }}
      >
        {children}
      </CommentRefsContext.Provider>
    </CommentStoreContext.Provider>
  );
};

// --- Refs context (separate from store — refs are stable, don't cause re-renders) ---

interface CommentRefsContextType {
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  replySectionRef: React.RefObject<HTMLDivElement>;
  portalRef: React.RefObject<HTMLDivElement>;
  buttonRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

const CommentRefsContext = React.createContext<CommentRefsContextType | null>(
  null
);

export const useCommentRefs = () => {
  const ctx = React.useContext(CommentRefsContext);
  if (!ctx) {
    throw new Error('useCommentRefs must be used within CommentStoreProvider');
  }
  return ctx;
};
