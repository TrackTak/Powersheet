export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
}

export interface IOptions {
  row: IRowColOptions;
  col: IRowColOptions;
  devMode: boolean;
  showFormulas: boolean;
  exportSpreadsheetName: string;
}

export const defaultOptions: IOptions = {
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
  exportSpreadsheetName: 'Powersheet.xlsx',
  devMode: false,
};
