import { Vector2d } from 'konva/lib/types';

export interface IFrozenCells {
  row?: number;
  col?: number;
}

export interface IMergedCells {
  row: Vector2d;
  col: Vector2d;
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

export interface ICellOptions {
  fill: string;
}

export interface IOptions {
  width: number;
  height: number;
  row: IRowColOptions;
  col: IRowColOptions;
  frozenCells: IFrozenCells;
  mergedCells: IMergedCells[];
  devMode: boolean;
  cell: ICellOptions;
}

export const defaultOptions: IOptions = {
  width: window.innerWidth,
  height: window.innerHeight,
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
  cell: {
    fill: 'white',
  },
  devMode: false,
};
