/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu, BubbleMenuProps, isNodeSelection } from '@tiptap/react';
import React from 'react';
import { NodeSelector } from './node-selector';
import {
  LinkPopup,
  useEditorToolbar,
  TextHighlighter,
  EditorAlignment,
  TextColor,
  ScriptsPopup,
} from './editor-utils';
import { IEditorTool } from '../hooks/use-visibility';
import ToolbarButton from '../common/toolbar-button';
import { DynamicDropdown } from '@fileverse/ui';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: any;
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  onError?: (errorString: string) => void;
};

export const EditorBubbleMenu = (props: EditorBubbleMenuProps) => {
  const items: BubbleMenuItem[] = [
    {
      name: 'Bold',
      isActive: () => props.editor.isActive('bold'),
      command: () => props.editor.chain().focus().toggleBold().run(),
      icon: 'Bold',
    },
    {
      name: 'Italic',
      isActive: () => props.editor.isActive('italic'),
      command: () => props.editor.chain().focus().toggleItalic().run(),
      icon: 'Italic',
    },
    {
      name: 'Underline',
      isActive: () => props.editor.isActive('underline'),
      command: () => props.editor.chain().focus().toggleUnderline().run(),
      icon: 'Underline',
    },
    {
      name: 'Strikethrough',
      isActive: () => props.editor.isActive('strike'),
      command: () => props.editor.chain().focus().toggleStrike().run(),
      icon: 'Strikethrough',
    },
    {
      name: 'Scripts',
      isActive: () => toolVisibility === IEditorTool.SCRIPTS,
      command: () => setToolVisibility(IEditorTool.SCRIPTS),
      icon: 'Superscript',
    },
    {
      name: 'Alignment',
      isActive: () => toolVisibility === IEditorTool.ALIGNMENT,
      command: () => setToolVisibility(IEditorTool.ALIGNMENT),
      icon: 'AlignLeft',
    },
    {
      name: 'Code',
      isActive: () => props.editor.isActive('code'),
      command: () => props.editor.chain().focus().toggleCode().run(),
      icon: 'Code',
    },
    {
      name: 'Link',
      isActive: () => props.editor.isActive('link'),
      command: () => { },
      icon: 'Link',
    },
  ];

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    shouldShow: ({ state, editor }) => {
      const { selection } = state;
      const { empty } = selection;

      // don't show bubble menu if:
      // - the selected node is an image
      // - the selection is empty
      // - the selection is a node selection (for drag handles)
      if (editor.isActive('image') || empty || isNodeSelection(selection)) {
        return false;
      }
      return true;
    },
    tippyOptions: {
      moveTransition: 'transform 0.15s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
    },
  };

  const { toolRef, setToolVisibility, toolVisibility } = useEditorToolbar({
    editor: props.editor,
  });
  const shouldShow = ({ editor }) => {
    const { from, to } = editor.state.selection;
    const isImageSelected =
      editor.state.doc.nodeAt(from)?.type.name === 'resizableMedia';
    const isIframeSelected =
      editor.state.doc.nodeAt(from)?.type.name === 'iframe';
    const isCodeBlockSelected = editor.isActive('codeBlock');
    const isPageBreak = editor.state.doc.nodeAt(from)?.type.name === 'pageBreak';
    if (
      from === to ||
      isImageSelected ||
      isCodeBlockSelected ||
      isIframeSelected || 
      isPageBreak
    ) {
      return false;
    }

    let hasYellowHighlight = false;
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'highlight' && mark.attrs.color === 'yellow') {
            hasYellowHighlight = true;
          }
        });
      }
    });

    return !hasYellowHighlight;
  };

  const renderContent = (item: BubbleMenuItem) => {
    switch (item.name) {
      case 'Alignment':
        return (
          <EditorAlignment
            setToolVisibility={setToolVisibility}
            editor={props.editor}
            elementRef={toolRef}
          />
        );
      case 'Link':
        return (
          <LinkPopup
            setToolVisibility={setToolVisibility}
            editor={props.editor}
            elementRef={toolRef}
            bubbleMenu={true}
            onError={props.onError}
          />
        );
      case 'Scripts':
        return (
          <ScriptsPopup
            setToolVisibility={setToolVisibility}
            editor={props.editor}
            elementRef={toolRef}
          />
        );
      default:
        return null;
    }
  };

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      shouldShow={shouldShow}
      className="hidden lg:flex gap-2 overflow-hidden rounded-lg h-[52px] min-w-fit w-full py-2 px-4 bg-white items-center shadow-elevation-1"
    >
      <NodeSelector editor={props.editor} elementRef={toolRef} />

      {items.map((item, index) => {
        if (
          item.name === 'Alignment' ||
          item.name === 'Link' ||
          item.name === 'Scripts'
        ) {
          return (
            <DynamicDropdown
              key={item.name}
              sideOffset={15}
              anchorTrigger={
                <ToolbarButton icon={item.icon} variant="ghost" size="md" />
              }
              content={renderContent(item)}
            />
          );
        } else if (item) {
          return (
            <div key={index} className="flex items-center">
              <ToolbarButton
                icon={item.icon}
                onClick={item.command}
                isActive={item.isActive()}
              />
              {(index === 3 || index === 5) && (
                <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
              )}
            </div>
          );
        } else {
          return null;
        }
      })}

      <DynamicDropdown
        key={IEditorTool.TEXT_COLOR}
        sideOffset={15}
        anchorTrigger={
          <ToolbarButton
            icon="Baseline"
            isActive={toolVisibility === IEditorTool.TEXT_COLOR}
          />
        }
        content={
          <TextColor
            setVisibility={setToolVisibility}
            editor={props.editor as Editor}
            elementRef={toolRef}
          />
        }
      />
      <DynamicDropdown
        key={IEditorTool.HIGHLIGHT}
        sideOffset={15}
        anchorTrigger={
          <ToolbarButton
            icon="Highlighter"
            isActive={toolVisibility === IEditorTool.HIGHLIGHT}
          />
        }
        content={
          <TextHighlighter
            setVisibility={setToolVisibility}
            editor={props.editor as Editor}
            elementRef={toolRef}
          />
        }
      />
    </BubbleMenu>
  );
};
