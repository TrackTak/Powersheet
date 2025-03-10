import { GenericDataRawCellContent } from '@tracktak/hyperformula/typings/CellContentParser'
import { CellId } from './cells/cell/SimpleCellAddress'

export type TextWrap = 'wrap'
export type HorizontalTextAlign = 'left' | 'center' | 'right'
export type VerticalTextAlign = 'top' | 'middle' | 'bottom'
export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
export type CellType = 'autocomplete'

export interface ICellStyles {
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

export interface ICellDataType {
  type: CellType
  cellContent: string
}

export interface ICellMetadata extends ICellStyles {
  comment?: string
  cellDataType?: ICellDataType
}

export interface ISheetMetadata {
  frozenRow?: number
  frozenCol?: number
  rowSizes: Record<number, number>
  colSizes: Record<number, number>
  mergedCells: Record<CellId, IMergedCell>
}

export interface IMergedCell {
  width: number
  height: number
}

export interface ISpreadsheetData {
  exportSpreadsheetName?: string
  showFormulas?: boolean
  textPatternFormats?: {
    [index: string]: string
  }
}

export interface IPersistedData extends ISpreadsheetData {
  data: ISpreadsheetData
  sheets?: SerializedSheets
}

export interface IInputSheetData {
  cells?: Record<CellId, GenericDataRawCellContent<ICellMetadata>>
  sheetMetadata?: Partial<ISheetMetadata>
}

export type SerializedSheets = Record<string, IInputSheetData>
