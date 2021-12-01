import { Shape } from 'konva/lib/Shape'
import { Rect } from 'konva/lib/shapes/Rect'
import { Vector2d } from 'konva/lib/types'
import Spreadsheet from '../Spreadsheet'
import SelectedCell from './cells/cell/SelectedCell'
import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import Sheets from './Sheets'

export interface ISelectedRowCols {
  rows: Shape[]
  cols: Shape[]
}

export interface ISelectionArea {
  start: Vector2d
  end: Vector2d
}

interface IGroupedCell {
  cells: SelectedCell[]
  rect?: Rect
}

interface IGroupedCells {
  main: IGroupedCell
  xSticky: IGroupedCell
  ySticky: IGroupedCell
  xySticky: IGroupedCell
}

class Selector {
  isInSelectionMode = false
  /**
   * The first selected cell.
   */
  selectedCell?: SelectedCell
  selectedCells: SelectedCell[] = []
  selectedSimpleCellAddress: SimpleCellAddress
  groupedCells?: IGroupedCells | null
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
      Object.keys(this.groupedCells ?? {}).forEach(key => {
        const type = key as keyof IGroupedCells

        this.groupedCells?.[type].rect?.destroy()
      })

      const rangeSimpleCellAddress = this._sheets._convertVectorsToRangeSimpleCellAddress(
        this.selectionArea.start,
        this.selectionArea.end
      )

      this.selectedCells = rangeSimpleCellAddress.getCellsBetweenRange(
        this._sheets,
        simpleCellAddress => {
          return new SelectedCell(this._sheets, simpleCellAddress)
        }
      )

      this.groupedCells = {
        main: {
          cells: []
        },
        xSticky: {
          cells: []
        },
        ySticky: {
          cells: []
        },
        xySticky: {
          cells: []
        }
      }

      this.selectedCells.forEach(cell => {
        const stickyGroup = cell.getStickyGroupCellBelongsTo()

        this.groupedCells![stickyGroup].cells.push(cell)
      })

      Object.keys(this.groupedCells).forEach(key => {
        const type = key as keyof IGroupedCells
        const cells = this.groupedCells![type].cells

        this.groupedCells?.[type].rect?.destroy()

        if (cells.length) {
          const topLeftCellClientRect = cells[0]._getClientRectWithoutStroke()

          let width = 0
          let height = 0

          const minMaxRangeSimpleCellAddress = this._sheets._getMinMaxRangeSimpleCellAddress(
            cells
          )

          for (const index of minMaxRangeSimpleCellAddress.iterateFromTopToBottom(
            'row'
          )) {
            height += this._sheets.rows.getSize(index)
          }

          for (const index of minMaxRangeSimpleCellAddress.iterateFromTopToBottom(
            'col'
          )) {
            width += this._sheets.cols.getSize(index)
          }

          const sheetGroup = this._sheets.scrollGroups[type].sheetGroup

          this.groupedCells![type].rect = new Rect({
            ...this._spreadsheet.styles.selection,
            ...topLeftCellClientRect,
            name: 'selectionRect',
            stroke: undefined,
            width,
            height
          })

          sheetGroup.add(this.groupedCells![type].rect!)
        }
      })
    }
  }

  /**
   * @internal
   */
  _destroy() {
    this.selectedCell?._destroy()

    Object.keys(this.groupedCells ?? {}).forEach(key => {
      const type = key as keyof IGroupedCells

      this.groupedCells?.[type].rect?.destroy()
    })
  }

  /**
   * @internal
   */
  _render() {
    this._renderSelectionArea()
    this._renderSelectedCell()
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

    this._spreadsheet.render()

    this._spreadsheet.eventEmitter.emit('startSelection', this.selectionArea)
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

      // We don't update sheet viewport for performance reasons
      this._render()
      this._spreadsheet.toolbar?._render()

      this._spreadsheet.eventEmitter.emit('moveSelection', this.selectionArea)
    }
  }

  endSelection() {
    this.isInSelectionMode = false

    Object.keys(this.groupedCells ?? {}).forEach(key => {
      const type = key as keyof IGroupedCells
      const value = this.groupedCells![type]

      if (value.cells.length > 1) {
        value.rect?.stroke(this._spreadsheet.styles.selection.stroke as string)
      }
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
