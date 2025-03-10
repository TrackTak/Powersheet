import { Group } from 'konva/lib/Group'
import { Rect } from 'konva/lib/shapes/Rect'
import Sheets from '../../Sheets'
import RangeSimpleCellAddress from './RangeSimpleCellAddress'
import SimpleCellAddress from './SimpleCellAddress'

class Cell {
  rangeSimpleCellAddress: RangeSimpleCellAddress
  group: Group
  rect: Rect
  isMerged = false

  /**
   * @internal
   */
  constructor(
    protected _sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    group?: Group
  ) {
    this.rangeSimpleCellAddress = new RangeSimpleCellAddress(
      simpleCellAddress,
      simpleCellAddress
    )

    if (group) {
      this.group = group
      this.rect = group.children!.find(x => x.name() === 'rect') as Rect
    } else {
      this.group = new Group({
        name: 'cellGroup'
      })
      this.rect = new Rect({
        ...this._sheets._spreadsheet.styles.cell.rect,
        name: 'rect'
      })
      this.group.add(this.rect)
    }
    this.rect.setAttrs(this._sheets.cells._getDefaultCellRectAttrs())
    this.update()
  }

  update() {
    this._updatePosition()
    this._updateSize()
    this._setIsMergedCell()
  }

  private _updatePosition() {
    const { row, col } = this.simpleCellAddress

    const position = {
      x: this._sheets.cols.getAxis(col) - this._sheets._getViewportVector().x,
      y: this._sheets.rows.getAxis(row) - this._sheets._getViewportVector().y
    }

    this.group.position(position)
  }

  private _updateSize() {
    const { row, col } = this.simpleCellAddress

    this.rect.size({
      width: this._sheets.cols.getSize(col),
      height: this._sheets.rows.getSize(row)
    })
  }

  private _setIsMergedCell() {
    if (
      !this._sheets._spreadsheet.merger.getIsCellTopLeftMergedCell(
        this.simpleCellAddress
      )
    )
      return

    this.isMerged = true

    let bottomRow = -Infinity
    let bottomCol = -Infinity

    for (const address of this._sheets._spreadsheet.merger._iterateMergedCellWidthHeight(
      this.simpleCellAddress
    )) {
      bottomRow = Math.max(bottomRow, address.row)
      bottomCol = Math.max(bottomCol, address.col)
    }

    this._setRangeCellAddress(
      new RangeSimpleCellAddress(
        this.simpleCellAddress,
        new SimpleCellAddress(
          this.simpleCellAddress.sheet,
          bottomRow,
          bottomCol
        )
      )
    )
  }

  protected _setRangeCellAddress(
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    this.rangeSimpleCellAddress = rangeSimpleCellAddress

    let width = 0
    let height = 0

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'col'
    )) {
      width += this._sheets.cols.getSize(index)
    }

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'row'
    )) {
      height += this._sheets.rows.getSize(index)
    }

    this.rect.width(width)
    this.rect.height(height)
  }

  isCellOnFrozenRow() {
    return this._sheets.rows.getIsFrozen(this.simpleCellAddress.row)
  }

  isCellOnFrozenCol() {
    return this._sheets.cols.getIsFrozen(this.simpleCellAddress.col)
  }

  /**
   * @internal
   */
  getStickyGroupCellBelongsTo() {
    return this._sheets._getStickyGroupType(
      this.isCellOnFrozenRow(),
      this.isCellOnFrozenCol()
    )
  }

  /**
   * @internal
   */
  _destroy() {
    this.group.destroy()
  }

  /**
   * @internal
   */
  _getClientRectWithoutStroke() {
    return this.group.getClientRect({
      skipStroke: true
    })
  }
}

export default Cell
