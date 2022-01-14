import { RowColId } from '../../rowCols/RowCols'

export type SheetRowColId = `${number}_${RowColId}`

/**
 * @internal
 */
class RowColAddress {
  constructor(public sheet: number, public rowCol: number) {}

  static sheetRowColIdToAddress(sheetRowColId: SheetRowColId) {
    const sections = sheetRowColId.split('_')
    const sheet = parseInt(sections[0], 10)
    const rowCol = parseInt(sections[1], 10)

    return new RowColAddress(sheet, rowCol)
  }

  toSheetRowColId(): SheetRowColId {
    return `${this.sheet}_${this.rowCol}`
  }
}

export default RowColAddress
