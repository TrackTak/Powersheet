import { isNil } from 'lodash';
import events from '../events';
import Spreadsheet from '../Spreadsheet';
import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress';
import { RowColId } from './rowCols/RowCols';
import { SheetId } from './Sheet';

export type TextWrap = 'wrap';
export type HorizontalTextAlign = 'left' | 'center' | 'right';
export type VerticalTextAlign = 'top' | 'middle' | 'bottom';
export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom';

export type FrozenCellId = number;
export type MergedRowId = number;
export type MergedColId = number;
export type MergedCellId = number;
export type SizeId = number;

export interface ICellStyleData {
  id: CellId;
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
export interface ICellData {
  id: CellId;
  style?: CellId;
  value?: string;
  comment?: string;
}

export interface ISheetData {
  id: SheetId;
  sheetName: string;
  frozenCells?: FrozenCellId;
  mergedCells?: MergedCellId[];
  rowSizes?: SizeId[];
  colSizes?: SizeId[];
  cells?: CellId[];
}

export interface IFrozenCellData {
  id: FrozenCellId;
  row?: RowColId;
  col?: RowColId;
}

export interface IMergedRowData {
  id: MergedRowId;
  x: number;
  y: number;
}

export interface IMergedColData {
  id: MergedColId;
  x: number;
  y: number;
}

export interface IMergedCellData {
  id: MergedCellId;
  mergedRow: MergedRowId;
  mergedCol: MergedColId;
}

export interface ISizeData {
  id: SizeId;
  size: number;
}

export interface IMergedRowsData {
  [index: MergedRowId]: IMergedRowData;
}

export interface IMergedColsData {
  [index: MergedColId]: IMergedColData;
}

export interface ISizesData {
  [index: SizeId]: ISizeData;
}

export interface ICellsData {
  [index: CellId]: ICellData;
}

export interface ICellStylesData {
  [index: CellId]: ICellStyleData;
}

export interface ISheetsData {
  [index: SheetId]: ISheetData;
}

export interface IFrozenCellsData {
  [index: string]: IFrozenCellData;
}

export interface IMergedCellsData {
  [index: MergedCellId]: IMergedCellData;
}

export interface ISpreadsheetData {
  exportSpreadsheetName?: string;
  frozenCells?: IFrozenCellsData;
  mergedCells?: IMergedCellsData;
  mergedRows?: IMergedRowsData;
  mergedCols?: IMergedColsData;
  rowSizes?: ISizesData;
  colSizes?: ISizesData;
  cells?: ICellsData;
  cellStyles?: ICellStylesData;
  sheets?: ISheetsData;
}

class Data {
  spreadsheetData: ISpreadsheetData;
  isSaving = false;

  constructor(
    public spreadsheet: Spreadsheet,
    spreadsheetData?: Partial<ISpreadsheetData>
  ) {
    this.spreadsheet = spreadsheet;
    this.spreadsheetData = spreadsheetData ?? {};
  }

  getIsCellAMergedCell(simpleCellAddress: SimpleCellAddress) {
    const data = this.getSheetData();

    return !!data.mergedCells?.[simpleCellAddress.toCellId()];
  }

  getSheetData(sheetId = this.spreadsheet.activeSheetId!): ISheetData {
    return this.spreadsheetData.sheetData[sheetId];
  }

  getCellData(simpleCellAddress: SimpleCellAddress) {
    return this.getSheetData(simpleCellAddress.sheet).cellsData?.[
      simpleCellAddress.toCellId()
    ];
  }

  deleteCellData(simpleCellAddress: SimpleCellAddress) {
    const newSheetData = this.getSheetData(simpleCellAddress.sheet);

    delete newSheetData.cellsData?.[simpleCellAddress.toCellId()];

    this.setSheetData(newSheetData, true, simpleCellAddress.sheet);
  }

  deleteSheetData(sheetId: SheetId) {
    const newSpreadshetData = {
      ...this.spreadsheetData,
    };

    delete newSpreadshetData.sheetData[sheetId];

    this.setSpreadsheetData(newSpreadshetData);

    this.spreadsheet.hyperformula?.removeSheet(sheetId);
  }

  renameSheetData(sheetId: SheetId, sheetName: string) {
    this.setSheetData(
      {
        ...this.getSheetData(sheetId),
        sheetName,
      },
      true,
      sheetId
    );

    this.spreadsheet.hyperformula?.renameSheet(sheetId, sheetName);
  }

  addSheetData(sheetId: SheetId, data: ISheetData) {
    this.spreadsheet.hyperformula?.addSheet(data.sheetName);

    this.setSheetData(data, true, sheetId);
  }

  setSpreadsheetData(data: ISpreadsheetData, addToHistory: boolean = true) {
    if (addToHistory) {
      this.spreadsheet.addToHistory();
    }

    this.spreadsheetData = data;
  }

  setSheetData(
    data: ISheetData,
    addToHistory: boolean = true,
    sheetId = this.spreadsheet.activeSheetId!
  ) {
    if (data.frozenCells) {
      const frozenCells = data.frozenCells;

      if (!isNil(frozenCells.row)) {
        if (frozenCells.row < 0) {
          delete frozenCells.row;
        }
      }

      if (!isNil(frozenCells.col)) {
        if (frozenCells.col < 0) {
          delete frozenCells.col;
        }
      }

      if (isNil(frozenCells.row) && isNil(frozenCells.col)) {
        delete data.frozenCells;
      }
    }

    if (data.mergedCells) {
      Object.keys(data.mergedCells).forEach((topLeftCellId) => {
        const mergedCell = data.mergedCells![topLeftCellId as CellId];

        if (mergedCell.col.x < 0) {
          mergedCell.col.x = 0;
        }

        if (mergedCell.row.x < 0) {
          mergedCell.row.x = 0;
        }

        const newTopLeftCellId = SimpleCellAddress.rowColToCellId(
          mergedCell.row.x,
          mergedCell.col.x
        );

        delete data.mergedCells![topLeftCellId as CellId];

        data.mergedCells![newTopLeftCellId] = mergedCell;

        if (
          mergedCell.col.x >= mergedCell.col.y &&
          mergedCell.row.x >= mergedCell.row.y
        ) {
          delete data.mergedCells![newTopLeftCellId];
        }
      });
    }

    const newSpreadshetData = {
      ...this.spreadsheetData,
      sheetData: [...this.spreadsheetData.sheetData],
    };

    newSpreadshetData.sheetData[sheetId] = data;

    this.setSpreadsheetData(newSpreadshetData, addToHistory);

    const done = () => {
      this.isSaving = false;
      this.spreadsheet.updateViewport();
    };

    this.isSaving = true;

    this.spreadsheet.eventEmitter.emit(events.sheet.setData, this, data, done);
  }

  setCellDataBatch(
    cellsData: Map<SimpleCellAddress, ICellData>,
    addToHistory: boolean = true
  ) {
    if (addToHistory) {
      this.spreadsheet.addToHistory();
    }
    this.spreadsheet.hyperformula?.suspendEvaluation();

    cellsData.forEach((cellData, simpleCellAddress) => {
      this.setCellData(simpleCellAddress, cellData, false);
    });

    this.spreadsheet.hyperformula?.resumeEvaluation();
  }

  setCellData(
    simpleCellAddress: SimpleCellAddress,
    cellData: ICellData,
    addToHistory: boolean = true
  ) {
    const data = this.getSheetData(simpleCellAddress.sheet);
    const cellId = simpleCellAddress.toCellId();

    const updatedData: ISheetData = {
      ...data,
      cellsData: {
        ...data.cellsData,
        [cellId]: cellData,
      },
    };

    this.setSheetData(updatedData, addToHistory, simpleCellAddress.sheet);

    try {
      this.spreadsheet.hyperformula?.setCellContents(
        simpleCellAddress,
        cellData.value
      );
    } catch (e) {
      console.error(e);
    }
  }

  setCellDataStyle(simpleCellAddress: SimpleCellAddress, style: ICellStyle) {
    const cellData = this.getCellData(simpleCellAddress);

    this.setCellData(simpleCellAddress, {
      ...cellData,
      style: {
        ...cellData?.style,
        ...style,
      },
    });
  }

  deleteCellDataStyle(
    simpleCellAddress: SimpleCellAddress,
    key: keyof ICellStyle
  ) {
    const cellData = this.getCellData(simpleCellAddress);

    if (cellData) {
      delete cellData.style?.[key];

      this.setCellData(simpleCellAddress, cellData);
    }
  }

  deleteCellDataValue(simpleCellAddress: SimpleCellAddress) {
    const cellData = this.getCellData(simpleCellAddress);

    if (cellData) {
      delete cellData.value;

      this.spreadsheet.hyperformula?.setCellContents(simpleCellAddress, null);

      this.setCellData(simpleCellAddress, cellData);
    }
  }
}

export default Data;
