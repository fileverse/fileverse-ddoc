import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { IComment } from '../extensions/comment';

const DB_NAME = 'fileverse_comments';
const COMMENTS_KEY = 'comments';

export class CommentsService {
  private static instance: CommentsService;
  private doc: Y.Doc;
  private persistence: IndexeddbPersistence;
  private comments: Y.Map<IComment>;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.doc = new Y.Doc();
    this.persistence = new IndexeddbPersistence(DB_NAME, this.doc);
    this.comments = this.doc.getMap(COMMENTS_KEY);

    // Listen for changes
    this.comments.observe(() => {
      this.notifyListeners();
    });

    // Handle sync status
    this.persistence.on('synced', () => {
      console.log('Comments synced with IndexedDB');
    });
  }

  static getInstance(): CommentsService {
    if (!CommentsService.instance) {
      CommentsService.instance = new CommentsService();
    }
    return CommentsService.instance;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  async getThread(threadId: string): Promise<IComment | undefined> {
    return this.comments.get(threadId);
  }

  getAllThreads(): IComment[] {
    return Array.from(this.comments.values());
  }

  createThread(comment: IComment): IComment {
    this.comments.set(comment.id, comment);
    return comment;
  }

  updateThread(threadId: string, updates: Partial<IComment>): IComment | null {
    const thread = this.comments.get(threadId);
    if (thread) {
      const updated = { ...thread, ...updates };
      this.comments.set(threadId, updated);
      return updated;
    }
    return null;
  }

  addReply(threadId: string, reply: IComment): IComment | null {
    const thread = this.comments.get(threadId);
    if (thread) {
      const updated = {
        ...thread,
        replies: [...thread.replies, reply],
      };
      this.comments.set(threadId, updated);
      return updated;
    }
    return null;
  }

  deleteThread(threadId: string): void {
    this.comments.delete(threadId);
  }

  // Optional: Clear all comments
  clearAll(): void {
    this.comments.clear();
  }

  // Optional: Get sync status
  isSynced(): boolean {
    return this.persistence.synced;
  }

  // Optional: Destroy instance (useful for cleanup)
  destroy(): void {
    this.persistence.destroy();
    this.doc.destroy();
  }
}

export const commentsService = CommentsService.getInstance();
