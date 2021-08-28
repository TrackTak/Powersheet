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

export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
  sizes: ISizes;
}

export interface IOptions {
  row: IRowColOptions;
  col: IRowColOptions;
  frozenCells: IFrozenCells;
  mergedCells: IMergedCells[];
}

export const defaultOptions: IOptions = {
  row: {
    amount: 100,
    minSize: 25,
    defaultSize: 25,
    sizes: {},
  },
  col: {
    amount: 26,
    minSize: 60,
    defaultSize: 100,
    sizes: {},
  },
  frozenCells: {},
  mergedCells: [],
};
