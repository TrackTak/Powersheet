export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
}

export interface IOptions {
  width: number;
  height: number;
  row: IRowColOptions;
  col: IRowColOptions;
  devMode: boolean;
  showFormulas: boolean;
  undoRedoHistorySize: number;
  exportSpreadsheetName: string;
}

export const defaultOptions: IOptions = {
  width: window.innerWidth,
  height: window.innerHeight,
  row: {
    amount: 100,
    minSize: 25,
    defaultSize: 25,
  },
  col: {
    amount: 26,
    minSize: 60,
    defaultSize: 100,
  },
  showFormulas: false,
  undoRedoHistorySize: 20,
  exportSpreadsheetName: 'Powersheet.xlsx',
  devMode: false,
};
