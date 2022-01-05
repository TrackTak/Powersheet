import { ColumnRowIndex } from '@tracktak/hyperformula'
import Data from './sheets/Data'

class Operations {
  constructor(private data: Data) {}

  public setFrozenRowCol(sheetName: string, indexes: ColumnRowIndex[]) {
    this.data._spreadsheetData.uiSheets[sheetName].frozenRow = indexes[0][0]
    this.data._spreadsheetData.uiSheets[sheetName].frozenCol = indexes[0][1]
  }

  public unsetFrozenRowCol(sheetName: string) {
    delete this.data._spreadsheetData.uiSheets[sheetName].frozenRow
    delete this.data._spreadsheetData.uiSheets[sheetName].frozenCol
  }
}

export default Operations
