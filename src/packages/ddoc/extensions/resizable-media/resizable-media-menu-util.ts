/* eslint-disable @typescript-eslint/ban-ts-comment */
/* @unocss-include */
// import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconFloatLeft, IconFloatRight, IconDelete } from '~/../assets'dpagettrs } from '@tiptap/pm/model'
import format_align_center from '../../../../assets/dpage/format_align_center.svg'
import format_align_left from '../../../../assets/dpage/format_align_left.svg'
import format_align_right from '../../../../assets/dpage/format_align_right.svg'
import trash from '../../../../assets/dpage/trash.svg'

interface ResizableMediaAttributes {
  dataAlign: string
  dataFloat: null | string
}
type Action = (updateAttributes: (o: ResizableMediaAttributes) => void) => void
interface ResizableMediaAction {
  tooltip: string
  icon?: string
  action?: Action
  // @ts-ignore
  isActive?: (attrs: Attrs) => boolean
  delete?: (d: () => void) => void
}

export const resizableMediaActions: ResizableMediaAction[] = [
  {
    tooltip: 'Align left',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'start',
        dataFloat: null,
      }),
    icon: format_align_left,
    isActive: (attrs) => attrs.dataAlign === 'start',
  },
  {
    tooltip: 'Align center',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'center',
        dataFloat: null,
      }),
    icon: format_align_center,
    isActive: (attrs) => attrs.dataAlign === 'center',
  },
  {
    tooltip: 'Align right',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'end',
        dataFloat: null,
      }),
    icon: format_align_right,
    isActive: (attrs) => attrs.dataAlign === 'end',
  },
  {
    tooltip: 'Delete',
    icon: trash,
    delete: (deleteNode) => deleteNode(),
  },
]
