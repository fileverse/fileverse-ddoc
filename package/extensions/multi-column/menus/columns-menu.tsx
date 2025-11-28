import { BubbleMenu as BaseBubbleMenu } from '@tiptap/react/menus';
import { useCallback } from 'react';
import uuid from 'react-uuid';
import { ColumnLayout } from '../columns';
import getRenderContainer from '../../../utils/get-render-container';
import { Toolbar } from '../../../common/toolbar';
import { MenuProps } from '../../../common/types';
import ToolbarButton from '../../../common/toolbar-button';

export const ColumnsMenu = ({ editor, appendTo }: MenuProps) => {
  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor, 'columns');
    return renderContainer;
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
      options={{
        offset: {
          mainAxis: 16,
          crossAxis: 0,
        },
        flip: true,
      }}
      appendTo={() => appendTo?.current}
      getReferencedVirtualElement={() => getReferenceClientRect()}
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
