/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu, BubbleMenuProps, isNodeSelection } from '@tiptap/react';
import cn from 'classnames';
import { useState } from 'react';
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link,
  Strikethrough,
  Underline,
  AlignLeft,
} from 'lucide-react';
import { NodeSelector } from './node-selector';
import { ColorSelector } from './color-selector';
import {
  LinkPopup,
  useEditorToolbar,
  TextHighlighter,
  EditorAlignment,
} from './editor-utils';
import { IEditorTool } from '../hooks/use-visibility';

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
      icon: <Bold size={20} />,
    },
    {
      name: 'Italic',
      isActive: () => props.editor.isActive('italic'),
      command: () => props.editor.chain().focus().toggleItalic().run(),
      icon: <Italic size={20} />,
    },
    {
      name: 'Underline',
      isActive: () => props.editor.isActive('underline'),
      command: () => props.editor.chain().focus().toggleUnderline().run(),
      icon: <Underline size={20} />,
    },
    {
      name: 'Strikethrough',
      isActive: () => props.editor.isActive('strike'),
      command: () => props.editor.chain().focus().toggleStrike().run(),
      icon: <Strikethrough size={20} />,
    },
    {
      name: 'Alignment',
      isActive: () => toolVisibilty === IEditorTool.ALIGNMENT,
      command: () => setToolVisibility(IEditorTool.ALIGNMENT),
      icon: <AlignLeft size={20} />,
    },
    {
      name: 'Code',
      isActive: () => props.editor.isActive('codeBlock'),
      command: () => props.editor.chain().focus().toggleCodeBlock().run(),
      icon: <Code size={20} />,
    },
    {
      name: 'Link',
      isActive: () => props.editor.isActive('link'),
      command: () => setIsLinkPopupOpen(!isLinkPopupOpen),
      icon: <Link size={20} />,
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

  const { toolRef, setToolVisibility, toolVisibilty } = useEditorToolbar({
    editor: props.editor,
  });
  const shouldShow = ({ editor }) => {
    const { from, to } = editor.state.selection;
    const isImageSelected =
      editor.state.doc.nodeAt(from)?.type.name === 'resizableMedia';
    if (!isImageSelected) {
      return;
    }
    const isCodeBlockSelected = editor.isActive('codeBlock');

    if (from === to || isImageSelected || isCodeBlockSelected) {
      return false;
    }

    let hasYellowHighlight = false;
    editor.state.doc.nodesBetween(from, to, node => {
      if (node.marks) {
        node.marks.forEach(mark => {
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
      className="hidden lg:flex gap-2 overflow-hidden rounded-[12px] h-[52px] min-w-[550px] w-full py-2 px-4 bg-white items-center shadow-lg"
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
        <div
          key={index}
          className="flex items-center"
        >
          <button
            onClick={item.command}
            className={cn('min-w-fit w-8 h-8 px-2 rounded', {
              'bg-yellow-300': item.isActive(),
            })}
          >
            {item.icon}
          </button>
          {(index === 4 || index === 6) && (
            <div className="w-1.5 h-4 bg-gray-300 mx-2"></div>
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
      <button
        onClick={() => setToolVisibility(IEditorTool.HIGHLIGHT)}
        className={cn('min-w-fit w-8 h-8 px-2', {
          'bg-yellow-300': toolVisibilty === IEditorTool.HIGHLIGHT,
        })}
      >
        <Highlighter size={20} />
      </button>
      {toolVisibilty === IEditorTool.ALIGNMENT && (
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
      {toolVisibilty === IEditorTool.HIGHLIGHT && (
        <TextHighlighter
          setVisibility={setToolVisibility}
          editor={props.editor as Editor}
          elementRef={toolRef}
        />
      )}
    </BubbleMenu>
  );
};
