export interface IFrozenRowCols {
  row: number;
  col: number;
}

export interface ISizes {
  [index: string]: number;
}

export interface IRowOptions {
  minHeight: number;
  defaultHeight: number;
  heights?: ISizes;
}

export interface IColOptions {
  minWidth: number;
  defaultWidth: number;
  widths?: ISizes;
}

export interface IOptions {
  numberOfRows: number;
  numberOfCols: number;
  row: IRowOptions;
  col: IColOptions;
  frozenCells?: IFrozenRowCols;
}
