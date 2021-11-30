import { Group } from 'konva/lib/Group'
import { Line } from 'konva/lib/shapes/Line'
import { Rect } from 'konva/lib/shapes/Rect'
import { Text } from 'konva/lib/shapes/Text'
import { isNil } from 'lodash'
import Spreadsheet from '../../../Spreadsheet'
import SimpleCellAddress, { CellId } from '../../cells/cell/SimpleCellAddress'
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols'
import Sheets from '../../Sheets'
import RowColAddress, { SheetRowColId } from '../../cells/cell/RowColAddress'
import { IMergedCellData } from '../../Data'
import {
  centerRectTwoInRectOne,
  dataKeysComparer,
  getColumnHeader
} from '../../../utils'
import { Util } from 'konva/lib/Util'
import { CellType } from '@tracktak/hyperformula'

class RowCol {
  headerRect: Rect
  headerText: Text
  resizeLine: Line
  rowColAddress: RowColAddress
  private _type: RowColType
  private _pluralType: RowColsType
  private _isCol: boolean
  private _functions: IRowColFunctions
  private _sheets: Sheets
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(
    /**
     * @internal
     */
    public _rowCols: RowCols,
    public index: number,
    public headerGroup: Group,
    public gridLine: Line
  ) {
    this._sheets = _rowCols._sheets
    this._spreadsheet = this._sheets._spreadsheet
    this._type = _rowCols._type
    this._pluralType = _rowCols._pluralType
    this._isCol = _rowCols._isCol
    this._functions = _rowCols._functions
    this.headerRect = this.headerGroup.findOne('.headerRect')
    this.headerText = this.headerGroup.findOne('.headerText')
    this.resizeLine = this.headerGroup.findOne('.resizeLine')

    this.rowColAddress = new RowColAddress(
      this._sheets.activeSheetId,
      this.index
    )

    this.resizeLine.on('mouseover', this._resizeLineOnMouseOver)
    this.resizeLine.on('mouseout', this._resizeLineOnMouseOut)

    this._update()
  }

  private _resizeLineOnMouseOver = () => {
    this._rowCols.resizer._setCursor()

    this._rowCols.resizer.showResizeMarker(this.index)
  }

  private _resizeLineOnMouseOut = () => {
    this._rowCols.resizer._resetCursor()

    this._rowCols.resizer.hideResizeMarker()
  }

  private _shiftFrozenCells(getValue: (frozenCell: number) => number) {
    if (this._rowCols.getIsFrozen(this.index)) {
      const existingFrozenCells = this._spreadsheet.data._spreadsheetData
        .frozenCells![this._sheets.activeSheetId]

      this._spreadsheet.data.setFrozenCell(this._sheets.activeSheetId, {
        [this._type]: getValue(existingFrozenCells![this._type]!)
      })
    }
  }

  private _getHeaderTextContent() {
    if (this._isCol) {
      return getColumnHeader(this.index + 1)
    } else {
      return (this.index + 1).toString()
    }
  }

  private _update() {
    const gridLineAxis =
      this._rowCols.getAxis(this.index) +
      this._rowCols.getSize(this.index) -
      this._sheets._getViewportVector()[this._functions.axis]

    this.headerGroup[this._functions.axis](this._rowCols.getAxis(this.index))
    this.headerRect[this._functions.size](this._rowCols.getSize(this.index))
    this.headerText.text(this._getHeaderTextContent())

    const headerTextMidPoints = centerRectTwoInRectOne(
      this.headerRect.getClientRect(),
      this.headerText.getClientRect()
    )

    this.headerText.position(headerTextMidPoints)

    this.resizeLine[this._functions.axis](this._rowCols.getSize(this.index))

    const frozenCells = this._spreadsheet.data._spreadsheetData.frozenCells?.[
      this._sheets.activeSheetId
    ]

    const frozenCell = frozenCells?.[this._type]

    this.gridLine[this._functions.axis](gridLineAxis)

    this._sheets.scrollGroups.main.rowColGroup.add(this.gridLine)
    if (this._isCol) {
      this._sheets.scrollGroups.ySticky.headerGroup.add(this.headerGroup)
    } else {
      this._sheets.scrollGroups.xSticky.headerGroup.add(this.headerGroup)
    }

    if (!isNil(frozenCell)) {
      if (this.index <= frozenCell) {
        this._sheets.scrollGroups.xySticky.headerGroup.add(this.headerGroup)
      }
    }
  }

  /**
   * @internal
   */
  _getIsOutsideSheet() {
    const clientRect = this.headerGroup.getClientRect({
      skipStroke: true
    })
    const sheetRect = this._sheets.sheet.getClientRect()
    const sizeUpToFrozenRowCol = this._rowCols._getSizeUpToFrozenRowCol()

    sheetRect[this._functions.size] -= sizeUpToFrozenRowCol
    sheetRect[this._functions.axis] += sizeUpToFrozenRowCol

    const isShapeOutsideSheet =
      !Util.haveIntersection(sheetRect, {
        ...clientRect,
        [this._functions.axis]: clientRect[this._functions.axis] - 0.001
      }) && !this._rowCols.getIsFrozen(this.index)

    return isShapeOutsideSheet
  }

  /**
   * @internal
   */
  _destroy() {
    this.resizeLine.off('mouseover', this._resizeLineOnMouseOver)
    this.resizeLine.off('mouseup', this._resizeLineOnMouseOut)

    this.headerGroup.destroy()
    this.gridLine.destroy()
  }

  delete(amount: number) {
    this._spreadsheet.pushToHistory(() => {
      const {
        cells,
        mergedCells,
        ...rest
      } = this._spreadsheet.data._spreadsheetData.sheets![
        this._sheets.activeSheetId
      ]
      const rowCols = rest[this._pluralType]

      if (this._isCol) {
        this._spreadsheet.hyperformula.removeColumns(
          this._sheets.activeSheetId,
          [this.index, amount]
        )
      } else {
        this._spreadsheet.hyperformula.removeRows(this._sheets.activeSheetId, [
          this.index,
          amount
        ])
      }

      this._shiftFrozenCells(frozenCell => frozenCell - amount)

      Object.keys(cells ?? {})
        .sort(dataKeysComparer)
        .forEach(key => {
          const cellId = key as CellId
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
          const newSimpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            this._isCol
              ? simpleCellAddress.row
              : simpleCellAddress.row - amount,
            this._isCol ? simpleCellAddress.col - amount : simpleCellAddress.col
          )

          if (simpleCellAddress[this._type] < this.index) return

          if (simpleCellAddress[this._type] > this.index) {
            const cellId = simpleCellAddress.toCellId()
            const cell = this._spreadsheet.data._spreadsheetData.cells![cellId]
            const newValue = this._spreadsheet.hyperformula
              .getCellSerialized(newSimpleCellAddress)
              ?.toString()

            const newCell = {
              ...cell
            }

            const cellType = this._spreadsheet.hyperformula.getCellType(
              newSimpleCellAddress
            )

            // The precedent cell formula handles these ARRAY cell values
            if (cellType !== CellType.ARRAY) {
              newCell.value = newValue
            }

            this._spreadsheet.data.setCell(newSimpleCellAddress, newCell, false)
          }

          this._spreadsheet.data.deleteCell(simpleCellAddress, false, false)
        })

      Object.keys(mergedCells ?? {})
        .sort(dataKeysComparer)
        .forEach(key => {
          const topLeftCellId = key as CellId
          const mergedCell = this._spreadsheet.data._spreadsheetData
            .mergedCells![topLeftCellId]

          const newMergedCell: IMergedCellData = {
            id: mergedCell.id,
            row: { ...mergedCell.row },
            col: { ...mergedCell.col }
          }

          if (
            mergedCell[this._type].x === this.index &&
            mergedCell[this._type].x === mergedCell[this._type].y
          ) {
            this._spreadsheet.data.deleteMergedCell(
              SimpleCellAddress.cellIdToAddress(topLeftCellId)
            )
            return
          }

          if (mergedCell[this._type].x > this.index) {
            newMergedCell[this._type].x = mergedCell[this._type].x - amount
          }

          if (mergedCell[this._type].y >= this.index) {
            newMergedCell[this._type].y = mergedCell[this._type].y - amount
          }

          const simpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          )

          this._spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          )
          this._spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell)
        })

      Object.keys(rowCols ?? {})
        .sort(dataKeysComparer)
        .forEach(key => {
          const sheetRowColId = key as SheetRowColId
          const sheetRowColAddress = RowColAddress.sheetRowColIdToAddress(
            sheetRowColId
          )
          const rowColIndex = sheetRowColAddress.rowCol

          if (rowColIndex < this.index) return

          if (rowColIndex > this.index) {
            const rowCol = this._spreadsheet.data._spreadsheetData[
              this._pluralType
            ]![sheetRowColId]
            const newRowColIndex = rowColIndex - amount

            this._spreadsheet.data.setRowCol(
              this._pluralType,
              new RowColAddress(sheetRowColAddress.sheet, newRowColIndex),
              rowCol
            )
          }
          this._spreadsheet.data.deleteRowCol(
            this._pluralType,
            sheetRowColAddress
          )
        })
    })

    this._spreadsheet.render()
  }

  insert(amount: number) {
    this._spreadsheet.pushToHistory(() => {
      const {
        cells,
        mergedCells,
        ...rest
      } = this._spreadsheet.data._spreadsheetData.sheets![
        this._sheets.activeSheetId
      ]
      const rowCols = rest[this._pluralType]

      if (this._isCol) {
        this._spreadsheet.hyperformula.addColumns(this._sheets.activeSheetId, [
          this.index,
          amount
        ])
      } else {
        this._spreadsheet.hyperformula.addRows(this._sheets.activeSheetId, [
          this.index,
          amount
        ])
      }

      this._shiftFrozenCells(frozenCell => frozenCell + amount)

      Object.keys(cells ?? {})
        .sort((a, b) => dataKeysComparer(b, a))
        .forEach(key => {
          const cellId = key as CellId
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
          const newSimpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            this._isCol
              ? simpleCellAddress.row
              : simpleCellAddress.row + amount,
            this._isCol ? simpleCellAddress.col + amount : simpleCellAddress.col
          )

          if (simpleCellAddress[this._type] < this.index) return

          const cell = this._spreadsheet.data._spreadsheetData.cells![cellId]
          const newValue = this._spreadsheet.hyperformula
            .getCellSerialized(newSimpleCellAddress)
            ?.toString()

          const newCell = {
            ...cell
          }

          const cellType = this._spreadsheet.hyperformula.getCellType(
            newSimpleCellAddress
          )

          // The precedent cell formula handles these ARRAY cell values
          if (cellType !== CellType.ARRAY) {
            newCell.value = newValue
          }

          this._spreadsheet.data.setCell(newSimpleCellAddress, newCell, false)
          this._spreadsheet.data.deleteCell(simpleCellAddress, false, false)
        })

      Object.keys(mergedCells ?? {})
        .sort((a, b) => dataKeysComparer(b, a))
        .forEach(key => {
          const topLeftCellId = key as CellId
          const mergedCell = this._spreadsheet.data._spreadsheetData
            .mergedCells![topLeftCellId]

          const newMergedCell: IMergedCellData = {
            id: mergedCell.id,
            row: { ...mergedCell.row },
            col: { ...mergedCell.col }
          }

          if (mergedCell[this._type].x >= this.index) {
            newMergedCell[this._type].x = mergedCell[this._type].x + amount
          }

          if (mergedCell[this._type].y >= this.index) {
            newMergedCell[this._type].y = mergedCell[this._type].y + amount
          }

          const simpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          )

          this._spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          )
          this._spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell)
        })

      Object.keys(rowCols ?? {})
        .sort((a, b) => dataKeysComparer(b, a))
        .forEach(key => {
          const sheetRowColId = key as SheetRowColId
          const sheetRowColAddress = RowColAddress.sheetRowColIdToAddress(
            sheetRowColId
          )
          const rowColIndex = sheetRowColAddress.rowCol

          if (rowColIndex < this.index) return

          const rowCol = this._spreadsheet.data._spreadsheetData[
            this._pluralType
          ]![sheetRowColId]
          const newRowColIndex = rowColIndex + amount

          this._spreadsheet.data.setRowCol(
            this._pluralType,
            new RowColAddress(sheetRowColAddress.sheet, newRowColIndex),
            rowCol
          )
          this._spreadsheet.data.deleteRowCol(
            this._pluralType,
            sheetRowColAddress
          )
        })
    })

    this._spreadsheet.render()
  }
}

export default RowCol
