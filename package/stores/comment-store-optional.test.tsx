import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  CommentStoreContext,
  createCommentStore,
  useCommentStoreOptional,
} from './comment-store';

const selectAvailable = (s: { isInlineCommentAvailable: boolean }) =>
  s.isInlineCommentAvailable;

describe('useCommentStoreOptional', () => {
  it('returns undefined with no provider above it', () => {
    const { result } = renderHook(() =>
      useCommentStoreOptional(selectAvailable),
    );
    expect(result.current).toBeUndefined();
  });

  it('selects live state inside a provider and tracks updates', () => {
    const store = createCommentStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CommentStoreContext.Provider value={store}>
        {children}
      </CommentStoreContext.Provider>
    );
    const { result } = renderHook(
      () => useCommentStoreOptional(selectAvailable),
      { wrapper },
    );
    expect(result.current).toBe(false); // default
    act(() => store.getState().setIsInlineCommentAvailable(true));
    expect(result.current).toBe(true);
  });
});
