export interface IFrozenRowCols {
  row: number;
  col: number;
}

export interface IRowOptions {
  minHeight: number;
  defaultHeight: number;
}

export interface IColOptions {
  minWidth: number;
  defaultWidth: number;
}

export interface IOptions {
  numberOfRows: number;
  numberOfCols: number;
  row: IRowOptions;
  col: IColOptions;
  frozenCells: IFrozenRowCols;
}
