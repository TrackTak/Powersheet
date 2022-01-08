import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import Sheets from './Sheets'
import { ICellMetadata } from './Data'

class Merger {
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
  }

  /**
   * @internal
   */
  *_iterateMergedCellWidthHeight(simpleCellAddress: SimpleCellAddress) {
    const mergedCellId = simpleCellAddress.toCellId()
    const sheetName = this._spreadsheet.hyperformula.getSheetName(
      simpleCellAddress.sheet
    )!
    const sheet = this._spreadsheet.data._spreadsheetData.uiSheets[sheetName]
    const { width, height } = sheet.mergedCells[mergedCellId] ?? {}

    if (width === undefined || height === undefined) return

    for (let index = 0; index < width; index++) {
      const col = simpleCellAddress.col + index

      for (let index = 0; index < height; index++) {
        const row = simpleCellAddress.row + index

        if (row === simpleCellAddress.row && col === simpleCellAddress.col) {
          continue
        }

        yield new SimpleCellAddress(simpleCellAddress.sheet, row, col)
      }
    }
  }

  getTopLeftMergedCellAddressFromOffsets(
    simpleCellAddress: SimpleCellAddress,
    topLeftMergedCellRowOffset: number,
    topLeftMergedCellColOffset: number
  ) {
    const row = simpleCellAddress.row - topLeftMergedCellRowOffset
    const col = simpleCellAddress.col - topLeftMergedCellColOffset

    const newSimpleCellAddress = new SimpleCellAddress(
      simpleCellAddress.sheet,
      row,
      col
    )

    return newSimpleCellAddress
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  getIsCellTopLeftMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCellId = simpleCellAddress.toCellId()
    const sheetName = this._spreadsheet.hyperformula.getSheetName(
      simpleCellAddress.sheet
    )!
    const sheet = this._spreadsheet.data._spreadsheetData.uiSheets[sheetName]
    const mergedCell = sheet.mergedCells[mergedCellId]

    return mergedCell !== undefined
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  getIsCellPartOfMerge(simpleCellAddress: SimpleCellAddress) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      simpleCellAddress
    )

    return (
      metadata?.topLeftMergedCellRowOffset !== undefined ||
      metadata?.topLeftMergedCellColOffset !== undefined
    )
  }
}

export default Merger
