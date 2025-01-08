/* eslint-disable @typescript-eslint/no-explicit-any */
import { BubbleMenuProps, Editor } from '@tiptap/react';
import { IComment } from '../../extensions/comment';
import { SetStateAction } from 'react';
import { InlineCommentData } from '../../types';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: any;
}

export type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  isPreviewMode: boolean;
  onError?: (errorString: string) => void;
  zoomLevel: string;
  setIsCommentSectionOpen?: (isOpen: boolean) => void;
  inlineCommentData?: InlineCommentData;
  setInlineCommentData?: React.Dispatch<
    React.SetStateAction<InlineCommentData>
  >;
  walletAddress?: string;
  username?: string;
  onInlineComment?: () => void;
  setComment?: () => void;
  unsetComment?: () => void;
  comments?: IComment[];
  setComments?: (comments: IComment[]) => void;
  activeCommentId?: string;
  inlineCommentOpen?: boolean;
  setInlineCommentOpen?: React.Dispatch<SetStateAction<boolean>>;
};

export interface NodeSelectorProps {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
}
