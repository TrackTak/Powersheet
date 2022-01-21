import {
  CellData,
  CellValue,
  SimpleCellRange as HFSimpleCellRange
} from '@tracktak/hyperformula'
// @ts-ignore
import { isSimpleCellAddress } from '@tracktak/hyperformula/es/Cell'
import { isEmpty } from 'lodash'
import { MergeCellsCommand } from './Commands'
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress'
import SimpleCellAddress from './sheets/cells/cell/SimpleCellAddress'
import { ICellMetadata } from './sheets/Data'
import Sheets from './sheets/Sheets'
import Spreadsheet from './Spreadsheet'
import { MergeCellsUndoEntry } from './UIUndoRedo'
import { ISheetMetadata } from './sheets/Data'
import Merger from './sheets/Merger'

const ROW_DELIMITER = '\r\n'
const COLUMN_DELIMITER = '\t'

class Clipboard {
  /**
   * The range of cells for the copy or the cut
   */
  sourceRange: RangeSimpleCellAddress | null = null
  isCut = false
  private _spreadsheet: Spreadsheet
  private _serializedCopiedValues: string | undefined = undefined

  constructor(private _sheets: Sheets, private _merger: Merger) {
    this._spreadsheet = this._sheets._spreadsheet
  }

  private async _writeToClipboard(source: HFSimpleCellRange) {
    const dataToCopy = this._serializeCopiedValues(
      this._spreadsheet.hyperformula.getRangeValues(source)
    )
    this._serializedCopiedValues = dataToCopy

    await navigator.clipboard.writeText(dataToCopy)
  }

  private _getCellRangeForSelection(
    isPasting = false
  ): RangeSimpleCellAddress | null {
    const selectedCells = this._sheets.selector.selectedCells

    if (isEmpty(selectedCells) || (isPasting && !this.sourceRange)) {
      return null
    }

    const firstSelectedCell = selectedCells![0]
    const lastSelectedCell = selectedCells![selectedCells!.length - 1]

    const topLeftSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      firstSelectedCell.simpleCellAddress.row,
      firstSelectedCell.simpleCellAddress.col
    )

    const bottomRightSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      lastSelectedCell.simpleCellAddress.row,
      lastSelectedCell.simpleCellAddress.col
    )

    const setCellRangeForMerges = () => {
      selectedCells.forEach(cell => {
        if (this._merger.getIsCellTopLeftMergedCell(cell.simpleCellAddress)) {
          const cellId = cell.simpleCellAddress.toCellId()
          const { mergedCells } =
            this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
              cell.simpleCellAddress.sheet
            )

          const mergedCell = mergedCells[cellId]

          const col = cell.simpleCellAddress.col + (mergedCell.width - 1)
          const row = cell.simpleCellAddress.row + (mergedCell.height - 1)

          bottomRightSimpleCellAddress.col = Math.max(
            bottomRightSimpleCellAddress.col,
            col
          )
          bottomRightSimpleCellAddress.row = Math.max(
            bottomRightSimpleCellAddress.row,
            row
          )
        }
      })
    }

    if (isPasting) {
      const sourceRangeColSize =
        this.sourceRange!.bottomRightSimpleCellAddress.col -
        this.sourceRange!.topLeftSimpleCellAddress.col

      const sourceRangeRowSize =
        this.sourceRange!.bottomRightSimpleCellAddress.row -
        this.sourceRange!.topLeftSimpleCellAddress.row

      const targetRangeColSize =
        bottomRightSimpleCellAddress.col - topLeftSimpleCellAddress.col
      const targetRangeRowSize =
        bottomRightSimpleCellAddress.row - topLeftSimpleCellAddress.row

      if (this.isCut || targetRangeColSize < sourceRangeColSize) {
        bottomRightSimpleCellAddress.col =
          topLeftSimpleCellAddress.col + sourceRangeColSize
      }
      if (this.isCut || targetRangeRowSize < sourceRangeRowSize) {
        bottomRightSimpleCellAddress.row =
          topLeftSimpleCellAddress.row + sourceRangeRowSize
      }

      if (selectedCells.length !== 1) {
        setCellRangeForMerges()
      }
    } else {
      setCellRangeForMerges()
    }

    return new RangeSimpleCellAddress(
      topLeftSimpleCellAddress,
      bottomRightSimpleCellAddress
    )
  }

  async cut() {
    const cellRange = this._getCellRangeForSelection()
    if (!cellRange) {
      return
    }

    this.sourceRange = cellRange

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress
    }

    this._spreadsheet.hyperformula.cut(source)
    await this._writeToClipboard(source)
    this.isCut = true
  }

  async copy() {
    const cellRange = this._getCellRangeForSelection()
    if (!cellRange) {
      return
    }

    this.sourceRange = cellRange

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress
    }

    this._spreadsheet.hyperformula.copy(source)

    await this._writeToClipboard(source)
  }

  private _serializeCopiedValues(cellValues: CellData<CellValue, any>[][]) {
    return cellValues.reduce((result, row, rowIndex) => {
      const columnStr = row.reduce((cols, curCol, colIndex) => {
        cols += curCol.cellValue ?? ''
        if (colIndex !== row.length - 1) {
          cols += COLUMN_DELIMITER
        }
        return cols
      }, '')
      result += columnStr
      if (rowIndex !== cellValues.length - 1) {
        result += ROW_DELIMITER
      }
      return result
    }, '')
  }

  async paste() {
    const systemClipboardValue = await navigator.clipboard.readText()
    if (systemClipboardValue === this._serializedCopiedValues) {
      this._pasteHyperFormula()
    } else {
      this._pasteFromSystemClipboard(systemClipboardValue)
    }

    this._spreadsheet.persistData()
    this._spreadsheet.render()
  }

  private _pasteHyperFormula() {
    const sourceRange = this.sourceRange
    const targetRange = this._getCellRangeForSelection(true)

    if (!sourceRange || !targetRange) {
      return
    }

    this._spreadsheet.hyperformula.batchUndoRedo(() => {
      if (this.isCut) {
        this._spreadsheet.hyperformula.paste({
          sheet: targetRange.topLeftSimpleCellAddress.sheet,
          col: targetRange.topLeftSimpleCellAddress.col,
          row: targetRange.topLeftSimpleCellAddress.row
        })
      } else {
        if (!this.isCut) {
          const rangeData =
            this._spreadsheet.hyperformula.getFillRangeData<ICellMetadata>(
              {
                start: sourceRange.topLeftSimpleCellAddress,
                end: sourceRange.bottomRightSimpleCellAddress
              },
              {
                start: targetRange.topLeftSimpleCellAddress,
                end: targetRange.bottomRightSimpleCellAddress
              },
              true
            )

          rangeData.forEach((rowData, ri) => {
            rowData.forEach((cell, ci) => {
              let { row, col } = this.sourceRange!.topLeftSimpleCellAddress

              row += ri % this.sourceRange!.height()
              col += ci % this.sourceRange!.width()

              const sourceSimpleCellAddress = new SimpleCellAddress(
                this.sourceRange!.topLeftSimpleCellAddress.sheet,
                row,
                col
              )

              const targetSimpleCellAddress = new SimpleCellAddress(
                targetRange.topLeftSimpleCellAddress.sheet,
                targetRange.topLeftSimpleCellAddress.row + ri,
                targetRange.topLeftSimpleCellAddress.col + ci
              )

              cell.cellValue = cell.cellValue ?? null

              this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
                targetSimpleCellAddress,
                cell
              )

              const mergedCellId = sourceSimpleCellAddress.toCellId()
              const sheetMetadata =
                this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
                  sourceSimpleCellAddress.sheet
                )

              const mergedCell = sheetMetadata.mergedCells[mergedCellId]

              if (mergedCell) {
                const { width, height } = mergedCell

                if (width !== undefined && height !== undefined) {
                  const removedMergedCells =
                    this._spreadsheet.operations.mergeCells(
                      targetSimpleCellAddress,
                      width,
                      height
                    )

                  const command = new MergeCellsCommand(
                    targetSimpleCellAddress,
                    width,
                    height,
                    removedMergedCells
                  )

                  this._spreadsheet.uiUndoRedo.saveOperation(
                    new MergeCellsUndoEntry(
                      this._spreadsheet.hyperformula,
                      command
                    )
                  )
                }
              }
            })
          })
        }
      }
    })

    if (this.isCut) {
      this.sourceRange = null
      this.isCut = false
    }
  }

  private _pasteFromSystemClipboard(clipboardValue: string) {
    const selectedCells = this._sheets.selector.selectedCells
    const firstSelectedCell = selectedCells![0]
    const topLeftSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      firstSelectedCell.simpleCellAddress.row,
      firstSelectedCell.simpleCellAddress.col
    )
    const rowData = clipboardValue.split(ROW_DELIMITER)
    this._spreadsheet.hyperformula.batch(() => {
      rowData.forEach((row, rowIndex) => {
        const columnData = row.split(COLUMN_DELIMITER)
        columnData.forEach((column, columnIndex) => {
          const targetAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            topLeftSimpleCellAddress.row + rowIndex,
            topLeftSimpleCellAddress.col + columnIndex
          )
          this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
            targetAddress,
            {
              cellValue: column
            }
          )
        })
      })
    })
  }
}

export default Clipboard
