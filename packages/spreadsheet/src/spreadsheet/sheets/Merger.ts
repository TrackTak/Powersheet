import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
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
    const { width, height } = sheet.mergedCells[mergedCellId]

    for (let index = 0; index < width; index++) {
      const col = simpleCellAddress.col + index

      for (let index = 0; index < height; index++) {
        const row = simpleCellAddress.row + index
        const address = {
          sheet: simpleCellAddress.sheet,
          row,
          col
        }

        if (row === simpleCellAddress.row && col === simpleCellAddress.col) {
          continue
        }

        yield new SimpleCellAddress(address.sheet, address.row, address.col)
      }
    }
  }

  getTopLeftMergedCellAddressFromOffsets(
    simpleCellAddress: SimpleCellAddress,
    topLeftMergedCellRowOffset: number | undefined,
    topLeftMergedCellColOffset: number | undefined
  ) {
    if (
      topLeftMergedCellRowOffset === undefined ||
      topLeftMergedCellColOffset === undefined
    ) {
      throw new Error('offsets cannot be undefined')
    }

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

  getAreMergedCellsOverlapping(
    firstRangeSimpleCellAddress: RangeSimpleCellAddress,
    secondRangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    const isFirstOverlappingSecond =
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col

    const isSecondOverlappingFirst =
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col

    return isFirstOverlappingSecond || isSecondOverlappingFirst
  }
}

export default Merger
