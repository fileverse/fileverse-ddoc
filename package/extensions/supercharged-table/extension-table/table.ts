/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  toggleHeader,
  toggleHeaderCell,
} from '@_ueberdosis/prosemirror-tables'
import {
  callOrReturn,
  getExtensionField,
  mergeAttributes,
  Node,
  ParentConfig,
} from '@tiptap/core'
import { TextSelection } from 'prosemirror-state'
import { NodeView } from 'prosemirror-view'

import { TableView } from './table-view'
import { createTable } from './utilities/create-table'
import { deleteTableWhenAllCellsSelected } from './utilities/delete-table-when-all-cells-selected'

export interface TableOptions {
  HTMLAttributes: Record<string, never>
  resizable: boolean
  handleWidth: number
  cellMinWidth: number
  View: NodeView
  lastColumnResizable: boolean
  allowTableNodeSelection: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      insertTable: (options?: {
        rows?: number
        cols?: number
        withHeaderRow?: boolean
      }) => ReturnType
      addColumnBefore: () => ReturnType
      addColumnAfter: () => ReturnType
      deleteColumn: () => ReturnType
      addRowBefore: () => ReturnType
      addRowAfter: () => ReturnType
      deleteRow: () => ReturnType
      deleteTable: () => ReturnType
      mergeCells: () => ReturnType
      splitCell: () => ReturnType
      toggleHeaderColumn: () => ReturnType
      toggleHeaderRow: () => ReturnType
      toggleHeaderCell: () => ReturnType
      mergeOrSplit: () => ReturnType
      setCellAttribute: (name: string, value: never) => ReturnType
      goToNextCell: () => ReturnType
      goToPreviousCell: () => ReturnType
      fixTables: () => ReturnType
      setCellSelection: (position: {
        anchorCell: number
        headCell?: number
      }) => ReturnType
    }
  }

  interface NodeConfig<Options, Storage> {
    /**
     * Table Role
     */
    tableRole?:
      | string
      | ((this: {
          name: string
          options: Options
          storage: Storage
          parent: ParentConfig<NodeConfig<Options>>['tableRole']
        }) => string)
  }
}

export const Table = Node.create<TableOptions>({
  name: 'table',

  // @ts-ignore
  addOptions() {
    return {
      HTMLAttributes: {},
      resizable: false,
      handleWidth: 5,
      cellMinWidth: 25,
      // TODO: fix
      View: TableView,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
    }
  },

  content: 'tableRow+',

  tableRole: 'table',

  isolating: true,

  group: 'block',

  parseHTML() {
    return [{ tag: 'table' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    let totalWidth = 0
    let fixedWidth = true

    try {
      // use first row to determine width of table;
      const tr = node.content.firstChild
      tr!.content.forEach((td) => {
        if (td.attrs.colwidth) {
          td.attrs.colwidth.forEach((col: number) => {
            if (!col) {
              fixedWidth = false
              totalWidth += this.options.cellMinWidth
            } else {
              totalWidth += col
            }
          })
        } else {
          fixedWidth = false
          const colspan = td.attrs.colspan ? td.attrs.colspan : 1
          totalWidth += this.options.cellMinWidth * colspan
        }
      })
    } catch (error) {
      fixedWidth = false
    }

    if (fixedWidth && totalWidth > 0) {
      HTMLAttributes.style = `width: ${totalWidth}px;`
    } else if (totalWidth && totalWidth > 0) {
      HTMLAttributes.style = `min-width: ${totalWidth}px`
    } else {
      HTMLAttributes.style = null
    }

    return [
      'div',
      { class: 'table-wrapper' },
      [
        'table',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        ['tbody', 0],
      ],
    ]
  },

  addCommands() {
    return {
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ tr, dispatch, editor }) => {
          const { selection } = tr
          const node = createTable(editor.schema, rows, cols, withHeaderRow)

          if (dispatch) {
            const offset = tr.selection.anchor + 1

            tr.replaceRangeWith(selection.from - 1, selection.to, node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)))
          }

          return true
        },
      addColumnBefore:
        () =>
        ({ state, dispatch }) => {
          return addColumnBefore(state, dispatch)
        },
      addColumnAfter:
        () =>
        ({ state, dispatch }) => {
          return addColumnAfter(state, dispatch)
        },
      deleteColumn:
        () =>
        ({ state, dispatch }) => {
          return deleteColumn(state, dispatch)
        },
      addRowBefore:
        () =>
        ({ state, dispatch }) => {
          return addRowBefore(state, dispatch)
        },
      addRowAfter:
        () =>
        ({ state, dispatch }) => {
          return addRowAfter(state, dispatch)
        },
      deleteRow:
        () =>
        ({ state, dispatch }) => {
          return deleteRow(state, dispatch)
        },
      deleteTable:
        () =>
        ({ state, dispatch }) => {
          return deleteTable(state, dispatch)
        },
      mergeCells:
        () =>
        ({ state, dispatch }) => {
          return mergeCells(state, dispatch)
        },
      splitCell:
        () =>
        ({ state, dispatch }) => {
          return splitCell(state, dispatch)
        },
      toggleHeaderColumn:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('column')(state, dispatch)
        },
      toggleHeaderRow:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('row')(state, dispatch)
        },
      toggleHeaderCell:
        () =>
        ({ state, dispatch }) => {
          return toggleHeaderCell(state, dispatch)
        },
      mergeOrSplit:
        () =>
        ({ state, dispatch }) => {
          if (mergeCells(state, dispatch)) {
            return true
          }

          return splitCell(state, dispatch)
        },
      setCellAttribute:
        (name, value) =>
        ({ state, dispatch }) => {
          return setCellAttr(name, value)(state, dispatch)
        },
      goToNextCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(1)(state, dispatch)
        },
      goToPreviousCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(-1)(state, dispatch)
        },
      fixTables:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            fixTables(state)
          }

          return true
        },
      setCellSelection:
        (position) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const selection = CellSelection.create(
              tr.doc,
              position.anchorCell,
              position.headCell
            )

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tr.setSelection(selection as any)
          }

          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.goToNextCell()) {
          return true
        }

        if (!this.editor.can().addRowAfter()) {
          return false
        }

        return this.editor.chain().addRowAfter().goToNextCell().run()
      },
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
      Backspace: deleteTableWhenAllCellsSelected,
      'Mod-Backspace': deleteTableWhenAllCellsSelected,
      Delete: deleteTableWhenAllCellsSelected,
      'Mod-Delete': deleteTableWhenAllCellsSelected,
    }
  },

  addProseMirrorPlugins() {
    const isResizable = this.options.resizable && this.editor.isEditable

    return [
      ...(isResizable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: this.options.cellMinWidth,
              View: this.options.View,
              // TODO: PR for @types/prosemirror-tables
              // @ts-ignore (incorrect type)
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({
        allowTableNodeSelection: this.options.allowTableNodeSelection,
      }),
    ]
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    }

    return {
      tableRole: callOrReturn(
        getExtensionField(extension, 'tableRole', context)
      ),
    }
  },
})
