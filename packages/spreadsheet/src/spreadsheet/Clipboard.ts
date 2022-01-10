import { SimpleCellRange as HFSimpleCellRange } from '@tracktak/hyperformula'
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

class Clipboard {
  /**
   * The range of cells for the copy or the cut
   */
  sourceRange: RangeSimpleCellAddress | null = null
  isCut = false
  private _spreadsheet: Spreadsheet

  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
  }

  private async _writeToClipboard(source: HFSimpleCellRange) {
    const rangeData = this._spreadsheet.hyperformula.getRangeSerialized(source)

    let clipboardText = ''

    rangeData.forEach((rowData, rowIndex) => {
      rowData.forEach((value, columnIndex) => {
        clipboardText += value?.cellValue ?? ''
        if (columnIndex !== rowData.length - 1) {
          clipboardText += `\t`
        }
      })
      if (rowIndex !== rangeData.length - 1) {
        clipboardText += '\n'
      }
    })

    await navigator.clipboard.writeText(clipboardText)
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
        if (
          this._sheets.merger.getIsCellTopLeftMergedCell(cell.simpleCellAddress)
        ) {
          const cellId = cell.simpleCellAddress.toCellId()
          const sheetName = this._spreadsheet.hyperformula.getSheetName(
            cell.simpleCellAddress.sheet
          )!
          const mergedCell =
            this._spreadsheet.data._spreadsheetData.uiSheets[sheetName]
              .mergedCells[cellId]

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
    this.isCut = true

    await this._writeToClipboard(source)
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

  paste() {
    const targetRange = this._getCellRangeForSelection(true)
    const sourceRange = this.sourceRange

    if (!targetRange || !sourceRange) {
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

            const targetSimpleCellAddress = new SimpleCellAddress(
              targetRange.topLeftSimpleCellAddress.sheet,
              targetRange.topLeftSimpleCellAddress.row + ri,
              targetRange.topLeftSimpleCellAddress.col + ci
            )

            this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
              targetSimpleCellAddress,
              cell
            )

            const { width, height } = cell.metadata ?? {}

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
                new MergeCellsUndoEntry(this._spreadsheet.hyperformula, command)
              )
            }
          })
        })
      }
    })

    this._spreadsheet.render()

    if (this.isCut) {
      this.sourceRange = null
      this.isCut = false
    }
  }
}

export default Clipboard
