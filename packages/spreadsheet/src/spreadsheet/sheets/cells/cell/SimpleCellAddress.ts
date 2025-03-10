import { getColumnHeader } from '../../../utils'
import Sheets from '../../Sheets'
import Cell from './Cell'

export type CellId = `${number}_${number}`
export type SheetCellId = `${number}_${number}_${number}`
/**
 * @internal
 */
class SimpleCellAddress {
  constructor(public sheet: number, public row: number, public col: number) {}

  static cellIdToAddress(sheet: number, cellId: CellId) {
    const sections = cellId.split('_')
    const row = parseInt(sections[0], 10)
    const col = parseInt(sections[1], 10)

    return new SimpleCellAddress(sheet, row, col)
  }

  addressToString() {
    const letters = getColumnHeader(this.col + 1)
    const number = this.row + 1

    return `${letters}${number}`
  }

  toCellId(): CellId {
    return `${this.row}_${this.col}`
  }

  getCellFromAddress<C extends Cell>(
    sheets: Sheets,
    getCell: (simpleCellAddress: SimpleCellAddress) => C
  ) {
    const simpleCellAddress = new SimpleCellAddress(
      sheets.activeSheetId,
      this.row,
      this.col
    )
    const cell = getCell(simpleCellAddress)

    return cell
  }
}

export default SimpleCellAddress
