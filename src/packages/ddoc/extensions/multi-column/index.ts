import { Extension } from '@tiptap/core'

import { Column } from './column'
import { Columns } from './columns'

export interface ColumnExtensionOptions {
  column?: boolean
  columns?: boolean
}

export const ColumnExtension = Extension.create<ColumnExtensionOptions>({
  name: 'columnExtension',

  addExtensions() {
    const extensions = []

    if (this.options.column !== false) {
      extensions.push(Column)
    }

    if (this.options.columns !== false) {
      extensions.push(Columns)
    }

    return extensions
  },
})

export { Column, Columns }

export default ColumnExtension
