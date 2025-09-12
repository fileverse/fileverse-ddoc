/* eslint-disable @typescript-eslint/no-explicit-any */
import { BubbleMenuProps, Editor } from '@tiptap/react';
import { SetStateAction } from 'react';
import {
  InlineCommentData,
  IpfsImageFetchPayload,
  IpfsImageUploadResponse,
} from '../../types';
import { Reminder } from '../../extensions/reminder-block/types';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: any;
}

export type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  activeCommentId: string | null;
  isPreviewMode: boolean;
  disableInlineComment: boolean;
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
  commentDrawerOpen?: boolean;
  setCommentDrawerOpen?: React.Dispatch<SetStateAction<boolean>>;
  isCollabDocumentPublished?: boolean | undefined;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  ipfsImageFetchFn?: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>;
  onReminderCreate?: (reminder: Reminder, type: string) => void;
  isConnected?: boolean;
  isCollabDocOwner?: boolean;
  enableCollaboration?: boolean;
};

export interface NodeSelectorProps {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
}
