import { Editor } from '@tiptap/react';
import { SetStateAction } from 'react';

export interface ToCItemType {
  id: string;
  level: number;
  textContent: string;
  itemIndex: number;
  isActive?: boolean;
}

export type ToCProps = {
  items: ToCItemType[];
  setItems: (
    items: ToCItemType[] | ((prev: ToCItemType[]) => ToCItemType[]),
  ) => void;
  editor: Editor;
  orientation?: 'portrait' | 'landscape';
};

export type ToCItemProps = {
  item: ToCItemType;
  onItemClick: (e: React.MouseEvent, id: string) => void;
  onItemRemove: (e: React.MouseEvent, id: string) => void;
  index: number;
  orientation?: 'portrait' | 'landscape';
};

export interface DocumentOutlineProps {
  editor: Editor;
  hasToC: boolean;
  items: ToCItemType[];
  setItems: (
    items: ToCItemType[] | ((prev: ToCItemType[]) => ToCItemType[]),
  ) => void;
  showTOC: boolean | undefined;
  setShowTOC: React.Dispatch<SetStateAction<boolean>> | undefined;
  isPreviewMode: boolean;
  orientation?: 'portrait' | 'landscape';
}
