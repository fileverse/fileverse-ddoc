import { ReactNode } from 'react';
import { Editor, Range } from '@tiptap/core';

export interface CommandItemProps {
  title: string;
  description: string;
  icon: ReactNode;
  image?: string;
  disabled?: boolean;
}
export interface CommandProps {
  editor: Editor;
  range: Range;
}
