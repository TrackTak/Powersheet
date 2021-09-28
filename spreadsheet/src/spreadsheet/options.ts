export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
}

export interface IOptions {
  width?: number;
  height?: number;
  row: IRowColOptions;
  col: IRowColOptions;
  showFormulas: boolean;
  exportSpreadsheetName: string;
  touchScrollSpeed: number;
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
  touchScrollSpeed: 1.2,
};
