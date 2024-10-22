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
      as="div"
      className={cn('flex opacity-0 hover:opacity-100 transition-opacity duration-200 w-full h-full justify-center items-center')}
    >
        <Tooltip sideOffset={5} position="bottom" text="Remove page breaker">
          <LucideIcon
            name="PageBreakRemove"
            onClick={handleDeleteNode}
            className="text-[#77818A] cursor-pointer"
          />
        </Tooltip>
    </NodeViewWrapper>
  );
};
