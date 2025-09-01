import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import cn from 'classnames';
import { LucideIcon, Tooltip } from '@fileverse/ui';
import { useEditingContext } from '../../hooks/use-editing-context';
import { useEditorContext } from '../../context/editor-context';

export const PageBreakNodeView: React.FC<NodeViewProps> = ({
  editor,
  deleteNode,
}) => {
  const { isPreviewMode } = useEditingContext();
  const { documentStyling } = useEditorContext();
  const handleDeleteNode = () => {
    editor.commands.unsetPageBreak();
    deleteNode();
  };

  // Apply document background styling to the page break gap
  const pageBreakStyle = {
    ...(documentStyling?.background && {
      background: documentStyling.background,
    }),
  };

  return (
    <NodeViewWrapper
      className={cn('flex relative w-full h-full justify-center items-center')}
      style={pageBreakStyle}
    >
      <br
        data-type="page-break"
        data-page-break="true"
        style={{ pageBreakAfter: 'always' }}
      />
      {!isPreviewMode && (
        <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="absolute top-[-15px] left-0 right-0 h-4">
            <div
              className="absolute inset-0 border-b-1 border-transparent"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, #FFDF0A33)',
              }}
            ></div>
          </div>

          <Tooltip sideOffset={5} position="bottom" text="Remove page breaker">
            <LucideIcon
              name="PageBreakRemove"
              onClick={handleDeleteNode}
              className="color-text-secondary cursor-pointer"
            />
          </Tooltip>
          <div className="absolute bottom-[-15px] left-0 right-0 h-4">
            <div
              className="absolute inset-0 border-b-1 border-transparent"
              style={{
                background:
                  'linear-gradient(to bottom, #FFDF0A33, transparent)',
              }}
            ></div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};
