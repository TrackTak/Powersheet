import { ColumnRowIndex, HyperFormula } from '@tracktak/hyperformula'
import Data from './sheets/Data'

class Operations {
  constructor(private hyperformula: HyperFormula, private data: Data) {}

  public setFrozenRowCol(sheetId: number, indexes: ColumnRowIndex) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].frozenRow = indexes[0]
    this.data._spreadsheetData.uiSheets[sheetName].frozenCol = indexes[1]
  }

  public unsetFrozenRowCol(sheetId: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    delete this.data._spreadsheetData.uiSheets[sheetName].frozenRow
    delete this.data._spreadsheetData.uiSheets[sheetName].frozenCol
  }

  public setRowSize(sheetId: number, index: number, rowSize: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].rowSizes[index] = rowSize
  }

  public setColSize(sheetId: number, index: number, colSize: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].colSizes[index] = colSize
  }

  public removeFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheet.frozenRow! -= amount
    }
  }

  public removeFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheet.frozenCol! -= amount
    }
  }

  public addFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheet.frozenRow! += amount
    }
  }

  public addFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheet.frozenCol! += amount
    }
  }
}

export default Operations
