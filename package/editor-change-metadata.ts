export type EditorChangeSource = 'editor' | 'indexeddb-rehydration';

export interface EditorChangeMetadata {
  source: EditorChangeSource;
  shouldSync: boolean;
}

// Sync only real editor body edits.
export const EDITOR_CONTENT_CHANGE: EditorChangeMetadata = {
  source: 'editor',
  shouldSync: true,
};

// Treat IndexedDB replay on refresh as rehydration, not a sync trigger.
export const INDEXEDDB_REHYDRATION_CHANGE: EditorChangeMetadata = {
  source: 'indexeddb-rehydration',
  shouldSync: false,
};
