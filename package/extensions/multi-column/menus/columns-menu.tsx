import { BubbleMenu as BaseBubbleMenu } from '@tiptap/react';
import { useCallback } from 'react';
import { sticky } from 'tippy.js';
import uuid from 'react-uuid';
import { ColumnLayout } from '../columns';
import getRenderContainer from '../../../utils/get-render-container';
import { Toolbar } from '../../../common/toolbar';
import { MenuProps } from '../../../common/types';
import ToolbarButton from '../../../common/toolbar-button';

export const ColumnsMenu = ({ editor, appendTo }: MenuProps) => {
  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor, 'columns');
    const rect =
      renderContainer?.getBoundingClientRect() ||
      new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  const shouldShow = useCallback(() => {
    const isPreviewMode = !editor.isEditable;
    const isColumns = editor.isActive('columns');
    return isColumns && !isPreviewMode;
  }, [editor]);

  const onColumnLeft = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignLeft).run();
  }, [editor]);

  const onColumnRight = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignRight).run();
  }, [editor]);

  const onColumnCenter = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignCenter).run();
  }, [editor]);

  const onRemoveColumn = useCallback(() => {
    editor.chain().focus().deleteNode('columns').run();
  }, [editor]);

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey={`columnsMenu-${uuid()}`}
      shouldShow={shouldShow}
      updateDelay={0}
      tippyOptions={{
        offset: [0, 16],
        popperOptions: {
          modifiers: [{ name: 'flip', enabled: false }],
        },
        getReferenceClientRect,
        moveTransition: 'transform 0.15s ease-out',
        duration: 200,
        animation: 'shift-toward-subtle',
        appendTo: () => appendTo?.current,
        plugins: [sticky],
        sticky: 'popper',
      }}
    >
      <Toolbar.Wrapper className="border color-border-default shadow-elevation-3">
        <ToolbarButton
          icon="PanelLeft"
          tooltip="Align left"
          isActive={editor.isActive('columns', {
            layout: ColumnLayout.AlignLeft,
          })}
          onClick={onColumnLeft}
          size="sm"
        />
        <ToolbarButton
          icon="Columns2"
          tooltip="Align center"
          isActive={editor.isActive('columns', {
            layout: ColumnLayout.AlignCenter,
          })}
          onClick={onColumnCenter}
          size="sm"
        />
        <ToolbarButton
          icon="PanelRight"
          tooltip="Align right"
          isActive={editor.isActive('columns', {
            layout: ColumnLayout.AlignRight,
          })}
          onClick={onColumnRight}
          size="sm"
        />
        <ToolbarButton
          icon="Trash2"
          tooltip="Remove column"
          onClick={onRemoveColumn}
          isActive={false}
          size="sm"
        />
      </Toolbar.Wrapper>
    </BaseBubbleMenu>
  );
};

export default ColumnsMenu;
