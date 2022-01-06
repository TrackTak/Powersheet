import { Sheets } from '@tracktak/hyperformula'
import { CellId } from './cells/cell/SimpleCellAddress'

export type TextWrap = 'wrap'
export type HorizontalTextAlign = 'left' | 'center' | 'right'
export type VerticalTextAlign = 'top' | 'middle' | 'bottom'
export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'

export interface ICellStyles {
  comment?: string
  borders?: BorderStyle[]
  backgroundColor?: string
  fontColor?: string
  fontSize?: number
  textWrap?: TextWrap
  textFormatPattern?: string
  underline?: boolean
  strikeThrough?: boolean
  bold?: boolean
  italic?: boolean
  horizontalTextAlign?: HorizontalTextAlign
  verticalTextAlign?: VerticalTextAlign
}

export interface ICellMetadata extends ICellStyles {
  topLeftMergedCellRowOffset?: number
  topLeftMergedCellColOffset?: number
  width?: number
  height?: number
}

export interface IUISheet {
  frozenRow?: number
  frozenCol?: number
  rowSizes: Record<number, number>
  colSizes: Record<number, number>
}

export type UISheets = Record<string, IUISheet>

export interface ISpreadsheetData {
  exportSpreadsheetName?: string
  uiSheets: UISheets
  sheets?: Sheets
  showFormulas?: boolean
}

class Data {
  /**
   * @internal
   */
  _spreadsheetData: ISpreadsheetData

  /**
   * @internal
   */
  constructor(sheetNames: string[]) {
    this._spreadsheetData = {
      uiSheets: {}
    }

    sheetNames.forEach(sheetName => {
      this._spreadsheetData.uiSheets[sheetName] = {
        rowSizes: {},
        colSizes: {}
      }
    })
  }
}

export default Data
