import React, { FC, useEffect, useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import Tippy from '@tippyjs/react';
import './styles.scss';
import { useEditingContext } from '../../../hooks/use-editing-context';
import cn from 'classnames';
import { Button, LucideIcon } from '@fileverse/ui';

interface CellButton {
  name: string;
  action: (editor: Editor) => boolean;
  icon: JSX.Element;
}

const cellButtonsConfig: CellButton[] = [
  {
    name: 'Add row above',
    action: (editor) => editor.chain().focus().addRowBefore().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22 14a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7h2v-2h4v2h2v-2h4v2h2v-2h4v2h2v-7M4 14h4v3H4v-3m6 0h4v3h-4v-3m10 0v3h-4v-3h4m-9-4h2V7h3V5h-3V2h-2v3H8v2h3v3Z"
        />
      </svg>
    ),
  },
  {
    name: 'Add row below',
    action: (editor) => editor.chain().focus().addRowAfter().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3h2v2h4V3h2v2h4V3h2v2h4V3h2v7M4 10h4V7H4v3m6 0h4V7h-4v3m10 0V7h-4v3h4m-9 4h2v3h3v2h-3v3h-2v-3H8v-2h3v-3Z"
        />
      </svg>
    ),
  },
  {
    name: 'Add left column',
    action: (editor) => editor.chain().focus().addColumnBefore().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M13 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9V2h-9m7 8v4h-7v-4h7m0 6v4h-7v-4h7m0-12v4h-7V4h7M9 11H6V8H4v3H1v2h3v3h2v-3h3v-2Z"
        />
      </svg>
    ),
  },
  {
    name: 'Add right column',
    action: (editor) => editor.chain().focus().addColumnAfter().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M11 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H2V2h9m-7 8v4h7v-4H4m0 6v4h7v-4H4M4 4v4h7V4H4m11 7h3V8h2v3h3v2h-3v3h-2v-3h-3v-2Z"
        />
      </svg>
    ),
  },
  {
    name: 'Remove row',
    action: (editor) => editor.chain().focus().deleteRow().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M9.41 13L12 15.59L14.59 13L16 14.41L13.41 17L16 19.59L14.59 21L12 18.41L9.41 21L8 19.59L10.59 17L8 14.41L9.41 13M22 9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3M4 9h4V6H4v3m6 0h4V6h-4v3m6 0h4V6h-4v3Z"
        />
      </svg>
    ),
  },
  {
    name: 'Remove column',
    action: (editor) => editor.chain().focus().deleteColumn().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M4 2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 8v4h7v-4H4m0 6v4h7v-4H4M4 4v4h7V4H4m13.59 8L15 9.41L16.41 8L19 10.59L21.59 8L23 9.41L20.41 12L23 14.59L21.59 16L19 13.41L16.41 16L15 14.59L17.59 12Z"
        />
      </svg>
    ),
  },
  {
    name: 'Toggle header row',
    action: (editor) => editor.chain().focus().toggleHeaderRow().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4M4 14h4v-4H4v4m6 0h4v-4h-4v4m6 0h4v-4h-4v4Z"
        />
      </svg>
    ),
  },
  {
    name: 'Toggle header column',
    action: (editor) => editor.chain().focus().toggleHeaderColumn().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 8v4h8v-4H8m0 6v4h8v-4H8M8 4v4h8V4H8Z"
        />
      </svg>
    ),
  },
  {
    name: 'Toggle header cell',
    action: (editor) => editor.chain().focus().toggleHeaderCell().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M21 19a1 1 0 0 1-1 1h-1v-2h2v1m-6 1v-2h2v2h-2m-4 0v-2h2v2h-2m-4 0v-2h2v2H7m-3 0a1 1 0 0 1-1-1v-1h2v2H4M19 4H5a2 2 0 0 0-2 2v2h18V6c0-1.11-.89-2-2-2M5 14H3v2h2v-2m0-4H3v2h2v-2m16 0h-2v2h2v-2m0 4h-2v2h2v-2m-10 2v-2h2v2h-2m0-4v-2h2v2h-2"
        />
      </svg>
    ),
  },
  {
    name: 'Remove table',
    action: (editor) => editor.chain().focus().deleteTable().run(),
    icon: (
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12.35 20H10v-3h2.09c.12-.72.37-1.39.72-2H10v-3h4v1.54c.58-.54 1.25-.93 2-1.19V12h4v.35c.75.26 1.42.65 2 1.19V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h9.54c-.54-.58-.93-1.25-1.19-2M16 7h4v3h-4V7m-6 0h4v3h-4V7M8 20H4v-3h4v3m0-5H4v-3h4v3m0-5H4V7h4v3m6.46 5.88l1.42-1.42L18 16.59l2.12-2.13l1.42 1.42L19.41 18l2.13 2.12l-1.42 1.42L18 19.41l-2.12 2.13l-1.42-1.42L16.59 18l-2.13-2.12"
        />
      </svg>
    ),
  },
];

export const TableCellNodeView: FC<NodeViewProps> = ({
  node,
  getPos,
  selected,
  editor,
}) => {
  const [isCurrentCellActive, setIsCurrentCellActive] = useState(false);

  const isPreviewMode = useEditingContext();

  const tableCellOptionsButtonRef = useRef<HTMLLabelElement>(null);

  const calculateActiveSateOfCurrentCell = () => {
    const { from, to } = editor.state.selection;

    const nodeFrom = getPos();
    const nodeTo = nodeFrom + node.nodeSize;

    setIsCurrentCellActive(nodeFrom <= from && to <= nodeTo);
  };

  useEffect(() => {
    editor.on('selectionUpdate', calculateActiveSateOfCurrentCell);

    setTimeout(calculateActiveSateOfCurrentCell, 100);

    return () => {
      editor.off('selectionUpdate', calculateActiveSateOfCurrentCell);
    };
  });

  const gimmeDropdownStyles = (): React.CSSProperties => {
    let top = tableCellOptionsButtonRef.current?.clientTop;
    if (top) top += 5;

    let left = tableCellOptionsButtonRef.current?.clientLeft;
    if (left) left += 5;

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  return (
    <NodeViewWrapper className="group">
      <NodeViewContent as="span" />

      {(isCurrentCellActive || selected) && (
        <Tippy
          appendTo={document.body}
          trigger="click"
          interactive
          animation="shift-toward-subtle"
          placement="bottom-start"
          content={
            <article className="w-screen lg:w-full" contentEditable={false}>
              <div
                tabIndex={1}
                className="static z-50 top-8 right-1/2 translate-x-1/2 lg:-translate-x-full p-2 shadow color-bg-default rounded-lg w-56"
                style={gimmeDropdownStyles()}
              >
                {cellButtonsConfig.map((btn) => {
                  return (
                    <div key={btn.name}>
                      <Button
                        variant="ghost"
                        className="!items-center w-full !justify-start !font-[400]"
                        onClick={() => btn.action(editor)}
                      >
                        {/* <span>{btn.icon}</span> */}
                        <span>{btn.name}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </article>
          }
        >
          <label
            tabIndex={0}
            className={cn('trigger-button', { hidden: isPreviewMode })}
            contentEditable={false}
          >
            <LucideIcon
              name="Ellipsis"
              className="color-text-default"
              size={'sm'}
            />
          </label>
        </Tippy>
      )}
    </NodeViewWrapper>
  );
};
