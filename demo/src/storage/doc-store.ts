const DOC_CONTENT_PREFIX = 'ddoc-content-';
const DOC_LIST_KEY = 'ddoc-doc-list';
const CURRENT_DOC_KEY = 'ddoc-current-doc';

interface DocEntry {
  id: string;
  title: string;
  createdAt: number;
  lastModifiedAt: number;
}

export const docStore = {
  // --- Document content (base64 Y.Doc state) ---

  getContent(docId: string): string | null {
    return localStorage.getItem(`${DOC_CONTENT_PREFIX}${docId}`);
  },

  setContent(docId: string, base64State: string): void {
    localStorage.setItem(`${DOC_CONTENT_PREFIX}${docId}`, base64State);
    const list = this.getDocList();
    const entry = list.find((d) => d.id === docId);
    if (entry) {
      entry.lastModifiedAt = Date.now();
      this.setDocList(list);
    }
  },

  clearContent(docId: string): void {
    localStorage.removeItem(`${DOC_CONTENT_PREFIX}${docId}`);
  },

  // --- Document registry ---

  getDocList(): DocEntry[] {
    const raw = localStorage.getItem(DOC_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  setDocList(list: DocEntry[]): void {
    localStorage.setItem(DOC_LIST_KEY, JSON.stringify(list));
  },

  addDoc(entry: DocEntry): void {
    const list = this.getDocList();
    list.push(entry);
    this.setDocList(list);
  },

  removeDoc(docId: string): void {
    const list = this.getDocList().filter((d) => d.id !== docId);
    this.setDocList(list);
    this.clearContent(docId);
  },

  updateDocTitle(docId: string, title: string): void {
    const list = this.getDocList();
    const entry = list.find((d) => d.id === docId);
    if (entry) {
      entry.title = title;
      this.setDocList(list);
    }
  },

  // --- Current doc tracking ---

  getCurrentDocId(): string | null {
    return localStorage.getItem(CURRENT_DOC_KEY);
  },

  setCurrentDocId(docId: string): void {
    localStorage.setItem(CURRENT_DOC_KEY, docId);
  },

  // --- Utilities ---

  clearAll(): void {
    const list = this.getDocList();
    for (const doc of list) {
      localStorage.removeItem(`${DOC_CONTENT_PREFIX}${doc.id}`);
    }
    localStorage.removeItem(DOC_LIST_KEY);
    localStorage.removeItem(CURRENT_DOC_KEY);
  },

  getContentSize(docId: string): number {
    const content = this.getContent(docId);
    if (!content) return 0;
    return Math.round(content.length * 0.75);
  },
};
