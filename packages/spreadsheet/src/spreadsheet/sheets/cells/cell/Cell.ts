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
    protected sheets: Sheets,
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
        ...this.sheets.spreadsheet.styles.cell.rect,
        name: 'rect'
      })
      this.group.add(this.rect)
    }
    this.rect.setAttrs(this.sheets.cells.getDefaultCellRectAttrs())
    this.updatePosition()
    this._updateSize()
    this.setIsMergedCell()
  }

  private updatePosition() {
    const { row, col } = this.simpleCellAddress

    const position = {
      x: this.sheets.cols.getAxis(col) - this.sheets._getViewportVector().x,
      y: this.sheets.rows.getAxis(row) - this.sheets._getViewportVector().y
    }

    this.group.position(position)
  }

  private _updateSize() {
    const { row, col } = this.simpleCellAddress

    this.rect.size({
      width: this.sheets.cols.getSize(col),
      height: this.sheets.rows.getSize(row)
    })
  }

  private setIsMergedCell() {
    this.sheets.merger._setAssociatedMergedCellIds(this.simpleCellAddress)

    const cellId = this.simpleCellAddress.toCellId()
    const mergedCellId =
      this.sheets.merger.associatedMergedCellAddressMap[cellId]

    if (!mergedCellId) return

    this.isMerged = true

    const mergedCell =
      this.sheets.spreadsheet.data._spreadsheetData.mergedCells![mergedCellId]

    const rangeSimpleCellAddress =
      RangeSimpleCellAddress.mergedCellToAddress(mergedCell)

    this.setRangeCellAddress(rangeSimpleCellAddress)
  }

  protected setRangeCellAddress(
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    this.rangeSimpleCellAddress = rangeSimpleCellAddress

    let width = 0
    let height = 0

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'col'
    )) {
      width += this.sheets.cols.getSize(index)
    }

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'row'
    )) {
      height += this.sheets.rows.getSize(index)
    }

    this.rect.width(width)
    this.rect.height(height)
  }

  isCellOnFrozenRow() {
    return this.sheets.rows.getIsFrozen(this.simpleCellAddress.row)
  }

  isCellOnFrozenCol() {
    return this.sheets.cols.getIsFrozen(this.simpleCellAddress.col)
  }

  /**
   * @internal
   */
  getStickyGroupCellBelongsTo() {
    return this.sheets._getStickyGroupType(
      this.isCellOnFrozenRow(),
      this.isCellOnFrozenCol()
    )
  }

  /**
   * @internal
   */
  destroy() {
    this.group.destroy()
  }

  /**
   * @internal
   */
  getClientRectWithoutStroke() {
    return this.group.getClientRect({
      skipStroke: true
    })
  }
}

export default Cell
