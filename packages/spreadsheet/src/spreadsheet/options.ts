export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
}

export interface IPatternFormats {
  plainText: string;
  number: string;
  percent: string;
}

export interface IOptions {
  width?: number;
  height?: number;
  textPatternFormats: IPatternFormats;
  row: IRowColOptions;
  col: IRowColOptions;
  exportSpreadsheetName: string;
  touchScrollSpeed: number;
  undoRedoLimit: number;
}

export const defaultOptions: IOptions = {
  undoRedoLimit: 20,
  row: {
    amount: 1000,
    minSize: 25,
    defaultSize: 25,
  },
  col: {
    amount: 26,
    minSize: 60,
    defaultSize: 100,
  },
  exportSpreadsheetName: 'Powersheet.xlsx',
  touchScrollSpeed: 1.2,
};
