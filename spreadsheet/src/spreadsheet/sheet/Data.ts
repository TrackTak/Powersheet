import { Vector2d } from 'konva/lib/types';
import { merge } from 'lodash';
import Spreadsheet from '../Spreadsheet';
import RowColAddress, { SheetRowColId } from './cells/cell/RowColAddress';
import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress';
import { RowColId, RowColsType } from './rowCols/RowCols';
import { SheetId } from './Sheet';

export type TextWrap = 'wrap';
export type HorizontalTextAlign = 'left' | 'center' | 'right';
export type VerticalTextAlign = 'top' | 'middle' | 'bottom';
export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom';

export interface ICellData {
  id: CellId;
  value?: string;
  comment?: string;
  borders?: BorderStyle[];
  backgroundColor?: string;
  fontColor?: string;
  fontSize?: number;
  textWrap?: TextWrap;
  textFormatPattern?: string;
  underline?: boolean;
  strikeThrough?: boolean;
  bold?: boolean;
  italic?: boolean;
  horizontalTextAlign?: HorizontalTextAlign;
  verticalTextAlign?: VerticalTextAlign;
}

export interface ISheetData {
  id: SheetId;
  sheetName: string;
  frozenCell?: SheetId;
  mergedCells?: {
    [index: CellId]: CellId;
  };
  cells?: {
    [index: CellId]: CellId;
  };
  rows?: {
    [index: SheetRowColId]: SheetRowColId;
  };
  cols?: {
    [index: SheetRowColId]: SheetRowColId;
  };
}

export interface IFrozenCellData {
  id: SheetId;
  row?: RowColId;
  col?: RowColId;
}

export interface IMergedCellData {
  id: CellId;
  row: Vector2d;
  col: Vector2d;
}

export interface IRowColData {
  id: SheetRowColId;
  size: number;
}

export interface IRow {
  [index: SheetRowColId]: IRowColData;
}

export interface ICol {
  [index: SheetRowColId]: IRowColData;
}

export interface ICellsData {
  [index: CellId]: ICellData;
}

export interface ISheetsData {
  [index: SheetId]: ISheetData;
}

export interface IFrozenCellsData {
  [index: string]: IFrozenCellData;
}

export interface IMergedCellsData {
  [index: CellId]: IMergedCellData;
}

export interface ISpreadsheetData {
  exportSpreadsheetName?: string;
  frozenCells?: IFrozenCellsData;
  mergedCells?: IMergedCellsData;
  rows?: IRow;
  cols?: ICol;
  cells?: ICellsData;
  sheets?: ISheetsData;
  showFormulas?: boolean;
}

class Data {
  spreadsheetData: ISpreadsheetData;

  constructor(
    public spreadsheet: Spreadsheet,
    spreadsheetData?: Partial<ISpreadsheetData>
  ) {
    this.spreadsheet = spreadsheet;
    this.spreadsheetData = spreadsheetData ?? {};
  }

  getIsCellAMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCells = this.spreadsheetData.mergedCells;

    return !!mergedCells?.[simpleCellAddress.toCellId()];
  }

  setSheet(sheetId: SheetId, sheetData?: Partial<ISheetData>) {
    this.spreadsheetData.sheets = {
      ...this.spreadsheetData.sheets,
      [sheetId]: {
        sheetName: this.spreadsheet.getSheetName(),
        ...this.spreadsheetData.sheets?.[sheetId],
        ...sheetData,
        id: sheetId,
      },
    };
  }

  setCell(simpleCellAddress: SimpleCellAddress, cell?: Omit<ICellData, 'id'>) {
    const cellId = simpleCellAddress.toCellId();

    this.spreadsheetData.cells = {
      ...this.spreadsheetData.cells,
      [cellId]: {
        ...this.spreadsheetData.cells?.[cellId],
        ...cell,
        id: cellId,
      },
    };

    try {
      this.spreadsheet.hyperformula?.setCellContents(
        simpleCellAddress,
        this.spreadsheetData.cells[cellId]?.value
      );
    } catch (e) {
      console.error(e);
    }
  }

  deleteCell(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();

    this.spreadsheet.hyperformula?.setCellContents(simpleCellAddress, null);

    delete this.spreadsheet.data.spreadsheetData.cells?.[cellId];
  }

  setMergedCell(
    simpleCellAddress: SimpleCellAddress,
    mergedCell: Omit<IMergedCellData, 'id'>
  ) {
    const mergedCellId = simpleCellAddress.toCellId();

    this.spreadsheetData.mergedCells = merge<
      object,
      IMergedCellsData | undefined,
      Partial<IMergedCellsData>
    >({}, this.spreadsheetData.mergedCells, {
      [mergedCellId]: {
        ...mergedCell,
        id: mergedCellId,
      },
    });
  }

  setFrozenCell(sheetId: SheetId, frozenCell?: Omit<IFrozenCellData, 'id'>) {
    this.spreadsheetData.frozenCells = {
      ...this.spreadsheetData.frozenCells,
      [sheetId]: {
        ...this.spreadsheetData.frozenCells?.[sheetId],
        ...frozenCell,
        id: sheetId,
      },
    };
  }

  setRowCol(
    pluralType: RowColsType,
    rowColAddress: RowColAddress,
    rowColData?: Omit<IRowColData, 'id'>
  ) {
    const sheetRowColId = rowColAddress.toSheetRowColId();

    this.spreadsheetData[pluralType] = {
      ...this.spreadsheetData[pluralType],
      [sheetRowColId]: {
        ...this.spreadsheetData[pluralType]?.[sheetRowColId],
        ...rowColData,
        id: sheetRowColId,
      },
    };
  }
}

export default Data;
