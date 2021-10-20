import { Vector2d } from 'konva/lib/types';
import { isNil } from 'lodash';
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
  sheetName?: string;
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
  spreadsheetData: ISpreadsheetData = {};

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  getIsCellAMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCells = this.spreadsheetData.mergedCells;

    return !!mergedCells?.[simpleCellAddress.toCellId()];
  }

  setSheet(sheetId: SheetId, sheetData?: Partial<ISheetData>) {
    if (!this.spreadsheetData.sheets) {
      this.spreadsheetData.sheets = {};
    }

    this.spreadsheetData.sheets[sheetId] = {
      sheetName: this.spreadsheet.getSheetName(),
      ...this.spreadsheetData.sheets?.[sheetId],
      ...sheetData,
      id: sheetId,
    };
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this.spreadsheetData.sheets?.[sheetId];

    this.spreadsheet.hyperformula.removeSheet(sheetId);

    this.deleteFrozenCell(sheetId);

    for (const key in sheet?.cells) {
      const cellId = key as CellId;

      this.deleteCell(SimpleCellAddress.cellIdToAddress(cellId));
    }

    for (const key in sheet?.mergedCells) {
      const cellId = key as CellId;

      this.deleteMergedCell(SimpleCellAddress.cellIdToAddress(cellId));
    }

    for (const key in sheet?.cols) {
      const sheetRowColId = key as SheetRowColId;
      const sheetRowColAddress =
        RowColAddress.sheetRowColIdToAddress(sheetRowColId);

      this.deleteRowCol('cols', sheetRowColAddress);
    }

    for (const key in sheet?.rows) {
      const sheetRowColId = key as SheetRowColId;
      const sheetRowColAddress =
        RowColAddress.sheetRowColIdToAddress(sheetRowColId);

      this.deleteRowCol('rows', sheetRowColAddress);
    }

    delete this.spreadsheetData.sheets?.[sheetId];
  }

  setCell(
    simpleCellAddress: SimpleCellAddress,
    cell?: Omit<ICellData, 'id'>,
    setHyperformula = true,
    overwriteCell = false
  ) {
    const sheetId = simpleCellAddress.sheet;
    const cellId = simpleCellAddress.toCellId();

    if (!this.spreadsheetData.cells) {
      this.spreadsheetData.cells = {};
    }

    if (!this.spreadsheetData.sheets![sheetId].cells) {
      this.spreadsheetData.sheets![sheetId].cells = {};
    }

    this.spreadsheetData.sheets![sheetId].cells![cellId] = cellId;

    this.spreadsheetData.cells[cellId] = {
      ...(overwriteCell ? {} : this.spreadsheetData.cells?.[cellId]),
      ...cell,
      id: cellId,
    };

    try {
      if (
        this.spreadsheet.hyperformula.isItPossibleToSetCellContents(
          simpleCellAddress
        ) &&
        setHyperformula
      ) {
        this.spreadsheet.hyperformula.setCellContents(
          simpleCellAddress,
          this.spreadsheetData.cells[cellId]?.value
        );
      }
    } catch (e) {
      console.error(e, simpleCellAddress);
    }
  }

  deleteCell(simpleCellAddress: SimpleCellAddress, setHyperformula = true) {
    const sheetId = simpleCellAddress.sheet;
    const cellId = simpleCellAddress.toCellId();

    if (
      this.spreadsheet.hyperformula.isItPossibleToSetCellContents(
        simpleCellAddress
      ) &&
      setHyperformula
    ) {
      this.spreadsheet.hyperformula.setCellContents(
        simpleCellAddress,
        undefined
      );
    }
    delete this.spreadsheetData.cells?.[cellId];
    delete this.spreadsheetData.sheets?.[sheetId]?.cells?.[cellId];
  }

  setMergedCell(
    simpleCellAddress: SimpleCellAddress,
    mergedCell: Omit<IMergedCellData, 'id'>
  ) {
    const sheetId = simpleCellAddress.sheet;
    const mergedCellId = simpleCellAddress.toCellId();

    if (!this.spreadsheetData.mergedCells) {
      this.spreadsheetData.mergedCells = {};
    }

    if (!this.spreadsheetData.sheets![sheetId].mergedCells) {
      this.spreadsheetData.sheets![sheetId].mergedCells = {};
    }

    this.spreadsheetData.sheets![sheetId].mergedCells![mergedCellId] =
      mergedCellId;

    this.spreadsheetData.mergedCells[mergedCellId] = {
      ...this.spreadsheetData.mergedCells[mergedCellId],
      row: {
        ...this.spreadsheetData.mergedCells[mergedCellId]?.row,
        ...mergedCell.row,
      },
      col: {
        ...this.spreadsheetData.mergedCells[mergedCellId]?.col,
        ...mergedCell.col,
      },
      id: mergedCellId,
    };
  }

  deleteMergedCell(simpleCellAddress: SimpleCellAddress) {
    const sheetId = simpleCellAddress.sheet;
    const mergedCellId = simpleCellAddress.toCellId();

    delete this.spreadsheetData.sheets?.[sheetId].mergedCells?.[mergedCellId];
    delete this.spreadsheetData.mergedCells?.[mergedCellId];
  }

  setFrozenCell(sheetId: SheetId, frozenCell?: Omit<IFrozenCellData, 'id'>) {
    if (!this.spreadsheetData.frozenCells) {
      this.spreadsheetData.frozenCells = {};
    }

    this.spreadsheetData.sheets![sheetId].frozenCell = sheetId;

    this.spreadsheetData.frozenCells[sheetId] = {
      ...this.spreadsheetData.frozenCells?.[sheetId],
      ...frozenCell,
      id: sheetId,
    };

    const frozenCells = this.spreadsheetData.frozenCells?.[sheetId];

    if (!isNil(frozenCells?.col) && frozenCells?.col < 0) {
      delete frozenCells?.col;
    }

    if (!isNil(frozenCells?.row) && frozenCells?.row < 0) {
      delete frozenCells?.row;
    }

    if (isNil(frozenCells?.col) && isNil(frozenCells?.row)) {
      this.deleteFrozenCell(sheetId);
    }
  }

  deleteFrozenCell(sheetId: SheetId) {
    delete this.spreadsheetData.sheets?.[sheetId].frozenCell;
    delete this.spreadsheetData.frozenCells?.[sheetId];
  }

  setRowCol(
    pluralType: RowColsType,
    rowColAddress: RowColAddress,
    rowColData?: Omit<IRowColData, 'id'>
  ) {
    const sheetId = rowColAddress.sheet;
    const sheetRowColId = rowColAddress.toSheetRowColId();

    if (!this.spreadsheetData[pluralType]) {
      this.spreadsheetData[pluralType] = {};
    }

    if (!this.spreadsheetData.sheets![sheetId][pluralType]) {
      this.spreadsheetData.sheets![sheetId][pluralType] = {};
    }

    this.spreadsheetData.sheets![sheetId][pluralType]![sheetRowColId] =
      sheetRowColId;

    this.spreadsheetData[pluralType]![sheetRowColId] = {
      ...this.spreadsheetData[pluralType]![sheetRowColId],
      ...rowColData,
      id: sheetRowColId,
    };
  }

  deleteRowCol(pluralType: RowColsType, rowColAddress: RowColAddress) {
    const sheetId = rowColAddress.sheet;
    const sheetRowColId = rowColAddress.toSheetRowColId();

    delete this.spreadsheetData.sheets?.[sheetId]?.[pluralType]?.[
      sheetRowColId
    ];
    delete this.spreadsheetData?.[pluralType]?.[sheetRowColId];
  }
}

export default Data;
