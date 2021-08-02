export interface IFrozenCells {
  start: {
    row: number;
    col: number;
  };
  end: {
    row?: number;
    col?: number;
  };
}

export interface IOptions {
  numberOfRows: number;
  numberOfCols: number;
  defaultRowHeight: number;
  defaultColWidth: number;
  frozenCells?: IFrozenCells;
}
