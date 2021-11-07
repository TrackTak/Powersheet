export interface IRowColOptions {
  amount: number;
  minSize: number;
  defaultSize: number;
}

// eslint-disable-next-line functional/no-mixed-type
export interface ITextPatternFormats {
  plainText: string;
  number: string;
  percent: string;
  [index: string]: string;
}

export interface ICellHighlight {
  goldenRatio: number;
  hue: number;
  saturation: number | string;
  lightness: number | string;
  alpha: number | string;
}

export interface IOptions {
  width?: number;
  height?: number;
  textPatternFormats: ITextPatternFormats;
  fontSizes: number[];
  row: IRowColOptions;
  col: IRowColOptions;
  exportSpreadsheetName: string;
  touchScrollSpeed: number;
  undoRedoLimit: number;
  cellHighlight: ICellHighlight;
}

export const defaultOptions: IOptions = {
  undoRedoLimit: 20,
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
  textPatternFormats: {
    plainText: '',
    number: '#,##0.00',
    percent: '0.00%',
  },
  cellHighlight: {
    goldenRatio: 0.618033988749895,
    hue: 34 / 360,
    saturation: '90%',
    lightness: '50%',
    alpha: '100%',
  },
  fontSizes: [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 24, 36],
  exportSpreadsheetName: 'Powersheet.xlsx',
  touchScrollSpeed: 1.2,
};
