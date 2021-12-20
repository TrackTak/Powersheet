import { Shape } from 'konva/lib/Shape'
import { Rect } from 'konva/lib/shapes/Rect'
import { Vector2d } from 'konva/lib/types'
import Spreadsheet from '../Spreadsheet'
import SelectedCell from './cells/cell/SelectedCell'
import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import { IGroupedCells } from './cells/Cells'
import Sheets from './Sheets'

export interface ISelectedRowCols {
  rows: Shape[]
  cols: Shape[]
}

export interface ISelectionArea {
  start: Vector2d
  end: Vector2d
}

export interface IGroupedCellSelectionArea {
  main: Rect | null
  xSticky: Rect | null
  ySticky: Rect | null
  xySticky: Rect | null
}

class Selector {
  isInSelectionMode = false
  /**
   * The first selected cell.
   */
  selectedCell?: SelectedCell
  selectedCells: SelectedCell[] = []
  selectedSimpleCellAddress: SimpleCellAddress
  groupedCellSelectionArea: IGroupedCellSelectionArea
  selectionArea?: ISelectionArea | null
  private _spreadsheet: Spreadsheet
  private _previousSelectedSimpleCellAddress?: SimpleCellAddress

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet

    this.selectedSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      0,
      0
    )
    this.groupedCellSelectionArea = {
      main: null,
      xSticky: null,
      ySticky: null,
      xySticky: null
    }
  }

  private _renderSelectedCell() {
    if (this.selectedSimpleCellAddress) {
      this.selectedCell?._destroy()

      this.selectedCell = new SelectedCell(
        this._sheets,
        this.selectedSimpleCellAddress
      )

      const stickyGroup = this.selectedCell.getStickyGroupCellBelongsTo()
      const sheetGroup = this._sheets.scrollGroups[stickyGroup].sheetGroup

      sheetGroup.add(this.selectedCell.group)
    }
  }

  private _renderSelectionArea() {
    if (this.selectionArea) {
      const rangeSimpleCellAddress = this._getSelectionAreaFromRangeSimpleCellAddress()

      this.selectedCells = rangeSimpleCellAddress.getCellsBetweenRange(
        this._sheets,
        simpleCellAddress => {
          return new SelectedCell(this._sheets, simpleCellAddress)
        }
      )

      const groupedCells = this._sheets.cells._getGroupedCellsByStickyGroup(
        this.selectedCells
      )

      Object.keys(groupedCells).forEach(key => {
        const type = key as keyof IGroupedCells
        const cells = groupedCells![type]

        this.groupedCellSelectionArea[type]?.destroy()

        if (cells.length) {
          const topLeftCellClientRect = cells[0]._getClientRectWithoutStroke()

          const size = this._sheets._getSizeFromCells(cells)

          const sheetGroup = this._sheets.scrollGroups[type].sheetGroup

          const rect = new Rect({
            ...this._spreadsheet.styles.selection,
            ...topLeftCellClientRect,
            name: 'selectionRect',
            stroke: undefined,
            width: size.width,
            height: size.height
          })

          this.groupedCellSelectionArea[type] = rect

          sheetGroup.add(rect)
        }
      })
    }
  }

  getSelectedCellsFromArea() {
    const rangeSimpleCellAddress = this._getSelectionAreaFromRangeSimpleCellAddress()

    return rangeSimpleCellAddress.getCellsBetweenRange(
      this._sheets,
      simpleCellAddress => {
        return new SelectedCell(this._sheets, simpleCellAddress)
      }
    )
  }

  /**
   * @internal
   */
  _getSelectionAreaFromRangeSimpleCellAddress() {
    if (!this.selectionArea) {
      throw new Error('selectionArea is undefined')
    }

    const rangeSimpleCellAddress = this._sheets._convertVectorsToRangeSimpleCellAddress(
      this.selectionArea.start,
      this.selectionArea.end
    )

    return rangeSimpleCellAddress
  }

  /**
   * @internal
   */
  _destroy() {
    this.selectedCell?._destroy()

    Object.keys(this.groupedCellSelectionArea).forEach(key => {
      const type = key as keyof IGroupedCells

      this.groupedCellSelectionArea[type]?.destroy()
    })
  }

  /**
   * @internal
   */
  _render() {
    this._renderSelectionArea()
    this._renderSelectedCell()
  }

  selectCellFromSimpleCellAddress(simpleCellAddress: SimpleCellAddress) {
    const cell = simpleCellAddress.getCellFromAddress(
      this._sheets,
      simpleCellAddress => {
        return new SelectedCell(this._sheets, simpleCellAddress)
      }
    )

    const rect = cell._getClientRectWithoutStroke()

    if (!cell.isCellOnFrozenCol()) {
      rect.x -= Math.abs(this._sheets.cols.scrollBar._scroll)
    }

    if (!cell.isCellOnFrozenRow()) {
      rect.y -= Math.abs(this._sheets.rows.scrollBar._scroll)
    }

    this.selectionArea = {
      start: {
        x: rect.x + 0.1,
        y: rect.y + 0.1
      },
      end: {
        x: rect.x + rect.width,
        y: rect.y + rect.height
      }
    }

    this.isInSelectionMode = true

    this.selectedSimpleCellAddress = cell.simpleCellAddress

    if (this._sheets.cellEditor.isInCellSelectionMode) {
      this._sheets.cellHighlighter._createHighlightedAreaFromCurrentSelection()
    }

    // We don't update sheet viewport for performance reasons
    this._render()
    this._spreadsheet.toolbar?._render()

    this._spreadsheet.eventEmitter.emit('selectCell', cell)
  }

  /**
   *
   * @param vector The X,Y co-ordinates to start the selection at
   */
  startSelection(vector: Vector2d) {
    this._previousSelectedSimpleCellAddress = this.selectedCell?.simpleCellAddress
    this.selectionArea = null

    const rangeSimpleCellAddress = this._sheets._convertVectorsToRangeSimpleCellAddress(
      vector,
      vector
    )

    const cell = rangeSimpleCellAddress.getCellsBetweenRange(
      this._sheets,
      simpleCellAddress => {
        return new SelectedCell(this._sheets, simpleCellAddress)
      }
    )[0]

    this.selectCellFromSimpleCellAddress(cell.simpleCellAddress)

    this._spreadsheet.eventEmitter.emit('startSelection', cell)
  }

  /**
   * Moves the selection to the relative pointer co-ords
   */
  moveSelection() {
    if (this.isInSelectionMode) {
      const { x, y } = this._sheets.sheet.getRelativePointerPosition()
      const selectedCellRect = this.selectedCell!._getClientRectWithoutStroke()

      this.selectionArea = {
        start: {
          x: selectedCellRect.x,
          y: selectedCellRect.y
        },
        end: {
          x,
          y
        }
      }

      if (this._sheets.cellEditor.isInCellSelectionMode) {
        this._sheets.cellHighlighter._createHighlightedAreaFromCurrentSelection()
      }

      // We don't update sheet viewport for performance reasons
      this._render()
      this._spreadsheet.toolbar?._render()

      this._spreadsheet.eventEmitter.emit('moveSelection', this.selectionArea)
    }
  }

  endSelection() {
    this.isInSelectionMode = false

    Object.keys(this.groupedCellSelectionArea).forEach(key => {
      const type = key as keyof IGroupedCells
      const rect = this.groupedCellSelectionArea![type]

      rect?.stroke(this._spreadsheet.styles.selection.stroke as string)
    })

    this._spreadsheet.eventEmitter.emit('endSelection', this.selectionArea!)
  }

  /**
   *
   * @returns If the cell has changed selection from the previous selection
   */
  hasChangedCellSelection() {
    return (
      this.selectedCell?.simpleCellAddress.toCellId() !==
      this._previousSelectedSimpleCellAddress?.toCellId()
    )
  }
}

export default Selector
