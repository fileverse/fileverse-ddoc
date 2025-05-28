import { FC, useEffect, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import Tippy from '@tippyjs/react';
import './styles.scss';
import { useEditingContext } from '../../../hooks/use-editing-context';
import { Button, Divider, LucideIcon } from '@fileverse/ui';
import { Toolbar } from '../../../common/toolbar';

interface CellButton {
  name: string;
  action: (editor: Editor) => boolean;
  icon: JSX.Element;
  group: string;
}

// All table actions that will be shown in the dropdown
const allTableActions: CellButton[] = [
  {
    name: 'Add row above',
    action: (editor) => editor.chain().focus().addRowBefore().run(),
    icon: <LucideIcon name="AddRowAbove" size={'md'} />,
    group: 'row',
  },
  {
    name: 'Add row below',
    action: (editor) => editor.chain().focus().addRowAfter().run(),
    icon: <LucideIcon name="AddRowBelow" size={'md'} />,
    group: 'row',
  },
  {
    name: 'Remove row',
    action: (editor) => editor.chain().focus().deleteRow().run(),
    icon: <LucideIcon name="Trash2" size={'md'} />,
    group: 'row',
  },
  {
    name: 'Add left column',
    action: (editor) => editor.chain().focus().addColumnBefore().run(),
    icon: <LucideIcon name="AddLeftColumn" size={'md'} />,
    group: 'column',
  },
  {
    name: 'Add right column',
    action: (editor) => editor.chain().focus().addColumnAfter().run(),
    icon: <LucideIcon name="AddRightColumn" size={'md'} />,
    group: 'column',
  },
  {
    name: 'Remove column',
    action: (editor) => editor.chain().focus().deleteColumn().run(),
    icon: <LucideIcon name="Trash2" size={'md'} />,
    group: 'column',
  },
  {
    name: 'Merge cells',
    action: (editor) => editor.chain().focus().mergeCells().run(),
    icon: <LucideIcon name="TableCellsMerge" size={'md'} />,
    group: 'table',
  },
  {
    name: 'Split cells',
    action: (editor) => editor.chain().focus().splitCell().run(),
    icon: <LucideIcon name="TableCellsSplit" size={'md'} />,
    group: 'table',
  },
  {
    name: 'Toggle header row',
    action: (editor) => editor.chain().focus().toggleHeaderRow().run(),
    icon: <LucideIcon name="ToggleHeaderRow" size={'md'} />,
    group: 'table',
  },
  {
    name: 'Toggle header column',
    action: (editor) => editor.chain().focus().toggleHeaderColumn().run(),
    icon: <LucideIcon name="ToggleHeaderColumn" size={'md'} />,
    group: 'table',
  },
  {
    name: 'Toggle header cell',
    action: (editor) => editor.chain().focus().toggleHeaderCell().run(),
    icon: <LucideIcon name="ToggleHeaderCell" size={'md'} />,
    group: 'table',
  },
  {
    name: 'Remove table',
    action: (editor) => editor.chain().focus().deleteTable().run(),
    icon: <LucideIcon name="Trash2" size={'md'} />,
    group: 'remove',
  },
];

export const TableCellNodeView: FC<NodeViewProps> = ({
  node,
  getPos,
  selected,
  editor,
}) => {
  const [isCurrentCellActive, setIsCurrentCellActive] = useState(false);
  const { isPreviewMode } = useEditingContext();

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

  const getReferenceClientRect = () => {
    // Find the table element by traversing up from the current cell
    const domAtPos = editor.view.domAtPos(getPos());
    let node = domAtPos.node as HTMLElement;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement as HTMLElement;
    }

    // Find the table element
    const tableElement = node.closest('table');
    if (!tableElement) {
      return new DOMRect(-1000, -1000, 0, 0);
    }

    const tableRect = tableElement.getBoundingClientRect();

    // Return a rect at the top right of the table
    return new DOMRect(
      tableRect.right - 20, // 20px from the right edge
      tableRect.top, // 0px above the table
      0,
      0,
    );
  };

  return (
    <NodeViewWrapper className="group">
      <NodeViewContent as="span" />

      {(isCurrentCellActive || selected) && !isPreviewMode && (
        <Tippy
          appendTo={document.body}
          trigger="manual"
          interactive
          animation="false"
          placement="top"
          visible={true}
          getReferenceClientRect={getReferenceClientRect}
          content={
            <Toolbar.Wrapper className="border color-border-default shadow-elevation-3">
              <Tippy
                appendTo={document.body}
                trigger="click"
                interactive
                animation="shift-toward-subtle"
                placement="bottom"
                content={
                  <article
                    className="w-screen lg:w-full"
                    contentEditable={false}
                  >
                    <div
                      tabIndex={1}
                      className="static z-50 p-2 shadow-elevation-3 color-bg-default rounded-lg w-56 border color-border-default"
                    >
                      {Object.entries(
                        allTableActions.reduce(
                          (acc, btn) => {
                            if (!acc[btn.group]) {
                              acc[btn.group] = [];
                            }
                            acc[btn.group].push(btn);
                            return acc;
                          },
                          {} as Record<string, CellButton[]>,
                        ),
                      ).map(([group, buttons], groupIndex, groups) => (
                        <div key={group}>
                          {buttons.map((btn) => (
                            <div key={btn.name}>
                              <Button
                                variant="ghost"
                                className="!items-center w-full !justify-start text-body-sm-bold gap-3 !px-2"
                                onClick={() => btn.action(editor)}
                              >
                                <span>{btn.icon}</span>
                                <span>{btn.name}</span>
                              </Button>
                            </div>
                          ))}
                          {groupIndex < groups.length - 1 && (
                            <Divider className="my-1 w-full border-t-[1px]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                }
              >
                <Button variant="ghost" className="!min-w-fit !px-2" size="sm">
                  <LucideIcon name="Ellipsis" size={'sm'} />
                </Button>
              </Tippy>
            </Toolbar.Wrapper>
          }
        />
      )}
    </NodeViewWrapper>
  );
};
