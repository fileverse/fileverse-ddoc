/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import cn from 'classnames';
import { LucideIcon, Tooltip } from '@fileverse/ui';

export const PageBreakNodeView: React.FC<NodeViewProps> = ({
  editor,
  deleteNode,
}) => {
  const handleDeleteNode = () => {
    editor.commands.unsetPageBreak();
    deleteNode();
  };

  return (
    <NodeViewWrapper
      as="span"
      className={cn('flex w-full h-full justify-center items-center')}
    >
      <Tooltip sideOffset={5} position="bottom" text="Remove page breaker">
        <LucideIcon
          name="PageBreakRemove"
          onClick={handleDeleteNode}
          className="cursor-pointer"
        />
      </Tooltip>
    </NodeViewWrapper>
  );
};
