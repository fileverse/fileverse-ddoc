/* @unocss-include */
// import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconFloatLeft, IconFloatRight, IconDelete } from '~/assets'
import { Attrs } from '@tiptap/pm/model';
interface ResizableMediaAttributes {
  dataAlign: string;
  dataFloat: null | string;
  showCaptionInput?: boolean;
  caption?: string;
}

type UpdateAttributes = (attrs: Partial<ResizableMediaAttributes>) => void;
type Action = (updateAttributes: UpdateAttributes) => void;

interface ResizableMediaAction {
  tooltip: string;
  icon?: string;
  action?: Action;
  isActive?: (attrs: Attrs) => boolean;
  delete?: (d: () => void) => void;
}

export const resizableMediaActions: ResizableMediaAction[] = [
  {
    tooltip: 'Align left',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'start',
        dataFloat: null,
      }),
    icon: 'AlignLeft',
    isActive: (attrs) => attrs.dataAlign === 'start',
  },
  {
    tooltip: 'Align center',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'center',
        dataFloat: null,
      }),
    icon: 'AlignCenter',
    isActive: (attrs) => attrs.dataAlign === 'center',
  },
  {
    tooltip: 'Align right',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'end',
        dataFloat: null,
      }),
    icon: 'AlignRight',
    isActive: (attrs) => attrs.dataAlign === 'end',
  },
  {
    tooltip: 'Add Caption',
    icon: 'Captions',
    action: (updateAttributes) => updateAttributes({ showCaptionInput: true }),
    isActive: (attrs) => attrs.showCaptionInput === true,
  },
  { 
    tooltip: 'Delete',
    icon: 'Trash2',
    delete: (deleteNode) => deleteNode(),
  },
];
