import { JSONContent } from '@tiptap/core';
import Dexie, { Table } from 'dexie';

export interface IComment {
  by: string;
  text: string;
  createdAt: number;
  highlightedTextContent: string;
}

export interface IDdoc {
  ddocId: string;
  createAt: number;
  content: JSONContent;
  comment: IComment[];
}

export class DdocDatabase extends Dexie {
  ddocs!: Table<IDdoc, string>;

  constructor() {
    super('ddoc-demo');
    this.version(1).stores({
      ddocs: 'ddocId, createdAt',
    });
  }
}

export const db = new DdocDatabase();

export const getDdocById = async (ddocId: string) => {
  return await db.ddocs.get({ ddocId });
};
export const updateDdocById = async (id: string, data: Partial<IDdoc>) => {
  return await db.ddocs
    .where('ddocId')
    .equals(id)
    .modify({ ...data });
};

export const addCommentByDdocId = async (id: string, _comment: IComment) => {
  return getDdocById(id).then(async (data) => {
    if (!data) return;
    const { comment } = data;
    const newComment = [...comment, _comment];
    return await updateDdocById(id, { comment: newComment });
  });
};

export const createDdoc = async (data: IDdoc) => {
  return await db.ddocs.add(data);
};
