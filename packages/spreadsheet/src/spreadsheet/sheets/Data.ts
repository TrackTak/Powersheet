import { DataRawCellContent, Sheets } from '@tracktak/hyperformula'
import { SheetRowColId } from './cells/cell/RowColAddress'
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
  topLeftMergedCellId?: CellId
  width?: number
  height?: number
}

export interface IRowColData {
  id: SheetRowColId
  size: number
}

export interface IRowsData {
  [index: SheetRowColId]: IRowColData
}

export interface IColsData {
  [index: SheetRowColId]: IRowColData
}

export interface IUISheet {
  frozenRow?: number
  frozenCol?: number
}

export type UISheets = Record<string, IUISheet>

export interface ISpreadsheetData {
  exportSpreadsheetName?: string
  uiSheets: UISheets
  sheets?: Sheets
  rows?: IRowsData
  cols?: IColsData
  showFormulas?: boolean
}

class Data {
  /**
   * @internal
   */
  _spreadsheetData: ISpreadsheetData = {
    uiSheets: {}
  }

  /**
   * @internal
   */
  constructor() {}
}

export default Data
