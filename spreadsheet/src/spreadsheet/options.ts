export interface IFrozenCells {
  row?: number;
  col?: number;
}

export interface IMergedCells {
  start: {
    row: number;
    col: number;
  };
  end: {
    row: number;
    col: number;
  };
}

export interface ISizes {
  [index: string]: number;
}

export interface IRowOptions {
  minHeight: number;
  defaultHeight: number;
  heights: ISizes;
}

export interface IColOptions {
  minWidth: number;
  defaultWidth: number;
  widths: ISizes;
}

export interface IOptions {
  numberOfRows: number;
  numberOfCols: number;
  row: IRowOptions;
  col: IColOptions;
  frozenCells: IFrozenCells;
  mergedCells: IMergedCells[];
}

export const defaultOptions: IOptions = {
  numberOfRows: 100,
  numberOfCols: 26,
  row: {
    minHeight: 25,
    defaultHeight: 25,
    heights: {},
  },
  col: {
    minWidth: 60,
    defaultWidth: 100,
    widths: {},
  },
  frozenCells: {},
  mergedCells: [],
};
