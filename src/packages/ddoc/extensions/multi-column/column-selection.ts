/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResolvedPos, Node } from 'prosemirror-model'
import { Selection, SelectionRange, TextSelection } from 'prosemirror-state'

import { Column } from './column'
import { Columns } from './columns'
import { findParentNodeClosestToPos } from './utils'
import type { Predicate } from './utils'

type Mutable<T> = {
  -readonly [k in keyof T]: T[k]
}

export class ColumnSelection extends Selection {
  constructor(selection: Selection) {
    const { $from, $to } = selection
    super($from, $to)
    this._$from = $from
    this._$to = $to
  }

  _$from: ResolvedPos
  _$to: ResolvedPos

  get $from() {
    return this._$from
  }

  get $to() {
    return this._$to
  }

  map() {
    return this
  }

  content() {
    return this.$from.doc.slice(this.from, this.to, true)
  }

  eq(other: Selection): boolean {
    return other instanceof ColumnSelection && other.anchor == this.anchor
  }

  toJSON(): any {
    return { type: 'column', from: this.from, to: this.to }
  }

  expandSelection(doc: Node) {
    // find the first ancestor of the beginning of the selection
    const where: Predicate = ({ pos, node }) => {
      if (node.type.name === Column.name) {
        return true
      }
      return doc.resolve(pos).depth <= 0
    }
    const { pos: fromPos } = findParentNodeClosestToPos(this.$from, where)
    this._$from = doc.resolve(fromPos)

    // find the first ancestor of the end of the selection
    const { pos: toPos, node: toNode } = findParentNodeClosestToPos(
      this.$to,
      where
    )
    this._$to = doc.resolve(toPos + toNode.nodeSize)

    if (this.getFirstNode()?.type.name === Columns.name) {
      const offset = 2
      this._$from = doc.resolve(this.$from.pos + offset)
      this._$to = doc.resolve(this.$to.pos + offset)
    }

    const mutableThis = this as Mutable<ColumnSelection>
    mutableThis.$anchor = this._$from
    mutableThis.$head = this._$to
    mutableThis.ranges = [new SelectionRange(this._$from, this._$to)]
  }

  /// Create a node selection from non-resolved positions.
  static create(doc: Node, from: number, to: number) {
    const $from = doc.resolve(from)
    const $to = doc.resolve(to)
    const selection = new TextSelection($from, $to)
    return new ColumnSelection(selection)
  }

  getFirstNode() {
    return this.content().content.firstChild
  }
}
