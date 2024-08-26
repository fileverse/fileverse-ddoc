/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu, BubbleMenuProps, isNodeSelection } from '@tiptap/react';
import { useState } from 'react';
import { NodeSelector } from './node-selector';
import { ColorSelector } from './color-selector';
import {
  LinkPopup,
  useEditorToolbar,
  TextHighlighter,
  EditorAlignment,
} from './editor-utils';
import { IEditorTool } from '../hooks/use-visibility';
import ToolbarButton from '../common/toolbar-button';

export interface BubbleMenuItem {
  name: string;
  isActive: () => boolean;
  command: () => void;
  icon: any;
}

type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'>;

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
      name: 'Alignment',
      isActive: () => toolVisibility === IEditorTool.ALIGNMENT,
      command: () => setToolVisibility(IEditorTool.ALIGNMENT),
      icon: 'AlignLeft',
    },
    {
      name: 'Code',
      isActive: () => props.editor.isActive('codeBlock'),
      command: () => props.editor.chain().focus().toggleCodeBlock().run(),
      icon: 'Code',
    },
    {
      name: 'Link',
      isActive: () => props.editor.isActive('link'),
      command: () => setIsLinkPopupOpen(!isLinkPopupOpen),
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
      onHidden: () => {
        setIsNodeSelectorOpen(false);
        setIsColorSelectorOpen(false);
        setIsLinkPopupOpen(false);
      },
    },
  };

  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);
  const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false);

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

    if (
      from === to ||
      isImageSelected ||
      isCodeBlockSelected ||
      isIframeSelected
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
  return (
    <BubbleMenu
      {...bubbleMenuProps}
      shouldShow={shouldShow}
      className="hidden lg:flex gap-2 overflow-hidden rounded-[12px] h-[52px] min-w-[570px] w-full py-2 px-4 bg-white items-center shadow-lg"
    >
      <NodeSelector
        editor={props.editor}
        isOpen={isNodeSelectorOpen}
        setIsOpen={() => {
          setIsNodeSelectorOpen(!isNodeSelectorOpen);
          setIsColorSelectorOpen(false);
        }}
      />

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ToolbarButton
            icon={item.icon}
            onClick={item.command}
            isActive={item.isActive()}
          />
          {(index === 4 || index === 6) && (
            <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
          )}
        </div>
      ))}
      <ColorSelector
        editor={props.editor}
        isOpen={isColorSelectorOpen}
        setIsOpen={() => {
          setIsColorSelectorOpen(!isColorSelectorOpen);
          setIsNodeSelectorOpen(false);
        }}
      />
      <ToolbarButton
        icon="Highlighter"
        onClick={() => setToolVisibility(IEditorTool.HIGHLIGHT)}
        isActive={toolVisibility === IEditorTool.HIGHLIGHT}
      />
      {toolVisibility === IEditorTool.ALIGNMENT && (
        <EditorAlignment
          setToolVisibility={setToolVisibility}
          editor={props.editor}
          elementRef={toolRef}
        />
      )}
      {isLinkPopupOpen && (
        <LinkPopup
          setToolVisibility={setToolVisibility}
          editor={props.editor}
          elementRef={toolRef}
          bubbleMenu={true}
          setIsLinkPopupOpen={setIsLinkPopupOpen}
        />
      )}
      {toolVisibility === IEditorTool.HIGHLIGHT && (
        <TextHighlighter
          setVisibility={setToolVisibility}
          editor={props.editor as Editor}
          elementRef={toolRef}
        />
      )}
    </BubbleMenu>
  );
};
