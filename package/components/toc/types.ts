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
};

export type ToCItemProps = {
  item: ToCItemType;
  onItemClick: (e: React.MouseEvent, id: string) => void;
  onItemRemove: (e: React.MouseEvent, id: string) => void;
  index: number;
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
}
