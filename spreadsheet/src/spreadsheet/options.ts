export interface ICellStyle {
  backgroundColor: string;
}

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
  cellStyle: ICellStyle;
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
  cellStyle: {
    backgroundColor: 'white',
  },
  devMode: false,
};
