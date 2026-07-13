import { Editor } from '@tiptap/core';

// Font-size and line-height helpers, extracted verbatim from
// components/editor-utils.tsx so hooks can use them without importing the
// toolbar module (avoids a components ↔ hooks import cycle).

export const FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 32, 36, 48, 60, 72, 96,
] as const;

export const getFontSizeOptions = (editor?: Editor) => {
  return FONT_SIZES.map((size) => ({
    title: `${size}`,
    value: `${size}px`,
    label: size.toString(),
    command: (editor: Editor) => {
      editor.chain().focus().setFontSize(`${size}px`).run();
    },
    isActive: () => editor?.isActive('fontSize', { size: `${size}px` }),
  }));
};

export const getCurrentFontSize = (
  editor: Editor | null,
  currentSize: string,
) => {
  if (!editor) return '';
  return currentSize ? currentSize.replace('px', '') : '';
};

// Line height conversion helpers: UI shows numbers (1, 1.15, 1.5, etc.) but stores as percentages (120%, 138%, 180%, etc.)
// Formula: percentage = uiValue * 120
const LINE_HEIGHT_BASE = 120; // 1 in UI = 120% in storage

export const uiValueToPercentage = (uiValue: string): string => {
  const num = parseFloat(uiValue);
  return `${Math.round(num * LINE_HEIGHT_BASE)}%`;
};

export const percentageToUiValue = (percentage: string): string => {
  const num = parseFloat(percentage.replace('%', ''));
  return (num / LINE_HEIGHT_BASE).toString();
};

export const LINE_HEIGHT_OPTIONS = [
  { value: '120%', label: '1', uiValue: '1', description: '' },
  { value: '138%', label: '1.15', uiValue: '1.15', description: '(Default)' },
  { value: '180%', label: '1.5', uiValue: '1.5', description: '' },
  { value: '240%', label: '2', uiValue: '2', description: '' },
  { value: '300%', label: '2.5', uiValue: '2.5', description: '' },
  { value: '360%', label: '3', uiValue: '3', description: '' },
];

export const getLineHeightOptions = () => LINE_HEIGHT_OPTIONS;

export const getCurrentLineHeight = (
  editor: Editor | null,
  currentLineHeight?: string,
) => {
  if (!editor) return '1.15';
  // currentLineHeight is stored as percentage, find matching label
  if (currentLineHeight && currentLineHeight.includes('%')) {
    const option = LINE_HEIGHT_OPTIONS.find(
      (opt) => opt.value === currentLineHeight,
    );
    return option ? option.label : percentageToUiValue(currentLineHeight);
  }
  return currentLineHeight || '1.15';
};
