import React, { useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import cn from 'classnames';
import { LucideIcon, Tooltip } from '@fileverse/ui';

export const CollapsibleHeadingNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(
    node.attrs.isCollapsed || false,
  );
  const level = node.attrs.level || 1;

  useEffect(() => {
    // Update state if props change
    setIsCollapsed(node.attrs.isCollapsed || false);
  }, [node.attrs.isCollapsed]);

  const toggleCollapse = () => {
    const newIsCollapsed = !isCollapsed;
    setIsCollapsed(newIsCollapsed);
    updateAttributes({ isCollapsed: newIsCollapsed });

    // Fire custom event for document processing
    const customEvent = new CustomEvent('heading-toggle', {
      detail: {
        headingPos: getPos(),
        level,
        isCollapsed: newIsCollapsed,
      },
      bubbles: true,
    });
    editor.view.dom.dispatchEvent(customEvent);
  };

  // Define which HTML tag to use based on level
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <NodeViewWrapper
      as={HeadingTag}
      className={cn('group relative', {
        'collapsible-heading-collapsed': isCollapsed,
      })}
    >
      <div className="flex items-center">
        <NodeViewContent className="contents" />
        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">
          <Tooltip
            sideOffset={5}
            position="right"
            text={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 w-6 h-6"
              contentEditable={false}
            >
              <LucideIcon
                name={isCollapsed ? 'ChevronRight' : 'ChevronDown'}
                size="sm"
                className="color-text-secondary cursor-pointer"
              />
            </button>
          </Tooltip>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
