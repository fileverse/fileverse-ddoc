import { BubbleMenu as BaseBubbleMenu } from '@tiptap/react'
import { useCallback } from 'react'
import { sticky } from 'tippy.js'
import uuid from 'react-uuid'
import { ColumnLayout } from '../columns'
import { PanelLeft, PanelRight, Columns, Trash2 } from 'lucide-react'
import getRenderContainer from '../../../utils/get-render-container'
import { Toolbar } from '../../../common/toolbar'
import { MenuProps } from '../../../common/types'

export const ColumnsMenu = ({ editor, appendTo }: MenuProps) => {
  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor, 'columns')
    const rect =
      renderContainer?.getBoundingClientRect() ||
      new DOMRect(-1000, -1000, 0, 0)

    return rect
  }, [editor])

  const shouldShow = useCallback(() => {
    const isColumns = editor.isActive('columns')
    return isColumns
  }, [editor])

  const onColumnLeft = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignLeft).run()
  }, [editor])

  const onColumnRight = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignRight).run()
  }, [editor])

  const onColumnCenter = useCallback(() => {
    editor.chain().focus().setLayout(ColumnLayout.AlignCenter).run()
  }, [editor])

  const onRemoveColumn = useCallback(() => {
    editor.chain().focus().deleteNode('columns').run()
  }, [editor])

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey={`columnsMenu-${uuid()}`}
      shouldShow={shouldShow}
      updateDelay={0}
      tippyOptions={{
        offset: [0, 8],
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
      <Toolbar.Wrapper>
        <Toolbar.Button
          tooltip="Align left"
          active={editor.isActive('columns', {
            layout: ColumnLayout.AlignLeft,
          })}
          activeClassname='bg-yellow-300 hover:brightness-90'
          onClick={onColumnLeft}
        >
          <PanelLeft size={20} />
        </Toolbar.Button>
        <Toolbar.Button
          tooltip="Align center"
          active={editor.isActive('columns', {
            layout: ColumnLayout.AlignCenter,
          })}
          activeClassname='bg-yellow-300 hover:brightness-90'
          onClick={onColumnCenter}
        >
          <Columns size={20} />
        </Toolbar.Button>
        <Toolbar.Button
          tooltip="Align right"
          active={editor.isActive('columns', {
            layout: ColumnLayout.AlignRight,
          })}
          activeClassname='bg-yellow-300 hover:brightness-90'
          onClick={onColumnRight}
        >
          <PanelRight size={20} />
        </Toolbar.Button>
        <Toolbar.Button
          tooltip="Remove column"
          onClick={onRemoveColumn}
        >
          <Trash2 size={20} />
        </Toolbar.Button>
      </Toolbar.Wrapper>
    </BaseBubbleMenu>
  )
}

export default ColumnsMenu
