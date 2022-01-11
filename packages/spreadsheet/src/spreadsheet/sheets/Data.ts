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
  width?: number
  height?: number
}

export interface ISheetMetadata {
  frozenRow?: number
  frozenCol?: number
  rowSizes: Record<number, number>
  colSizes: Record<number, number>
  mergedCells: Record<CellId, IMergedCell>
  associatedMergedCells: Record<CellId, CellId>
}

export interface IMergedCell {
  width: number
  height: number
}

export interface ISpreadsheetData {
  exportSpreadsheetName?: string
  showFormulas?: boolean
}
