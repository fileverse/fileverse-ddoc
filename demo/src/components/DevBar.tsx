import { useEffect, useState } from 'react';
import { Button } from '@fileverse/ui';
import { docStore } from '../storage/doc-store';

interface DevBarProps {
  docId: string;
  activeTabId: string;
  tabCount: number;
  characterCount: number;
  wordCount: number;
  enableCollaboration: boolean;
  lastSavedAt: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  return new Date(ts).toLocaleTimeString();
}

export function DevBar({
  docId,
  activeTabId,
  tabCount,
  characterCount,
  wordCount,
  enableCollaboration,
  lastSavedAt,
}: DevBarProps) {
  const [visible, setVisible] = useState(false);
  const [contentSize, setContentSize] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'd'
      ) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const update = () => setContentSize(docStore.getContentSize(docId));
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [visible, docId]);

  const handleClearData = () => {
    const confirmed = window.confirm(
      'Clear all data for this document? (localStorage + IndexedDB)',
    );
    if (!confirmed) return;
    docStore.clearContent(docId);
    try {
      indexedDB.deleteDatabase(docId);
    } catch (e) {
      console.warn('Failed to delete IndexedDB:', e);
    }
    window.location.reload();
  };

  if (!visible) return null;

  const Separator = () => (
    <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] h-8 color-bg-default border-t color-border-default flex items-center gap-3 px-4 text-[11px] font-mono color-text-secondary select-none">
      <span title="Document ID">
        <strong>doc:</strong> {docId.slice(0, 8)}
      </span>
      <Separator />
      <span title="Active Tab ID">
        <strong>tab:</strong> {activeTabId}
      </span>
      <Separator />
      <span title="Number of tabs">
        <strong>tabs:</strong> {tabCount}
      </span>
      <Separator />
      <span title="Character count">
        <strong>chars:</strong> {characterCount.toLocaleString()}
      </span>
      <Separator />
      <span title="Word count">
        <strong>words:</strong> {wordCount.toLocaleString()}
      </span>
      <Separator />
      <span title="Stored content size">
        <strong>size:</strong> {formatBytes(contentSize)}
      </span>
      <Separator />
      <span title="Collaboration status">
        <strong>collab:</strong>{' '}
        <span className={enableCollaboration ? 'text-green-500' : ''}>
          {enableCollaboration ? 'active' : 'off'}
        </span>
      </span>
      <Separator />
      <span title="Last saved to localStorage">
        <strong>saved:</strong> {formatTime(lastSavedAt)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          className="!h-5 !text-[10px] !px-2 text-red-500"
          onClick={handleClearData}
        >
          Clear Data
        </Button>
        <span className="opacity-50">Ctrl+Shift+D to hide</span>
      </div>
    </div>
  );
}
