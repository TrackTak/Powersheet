import { LineConfig } from 'konva/lib/shapes/Line';
import { RectConfig } from 'konva/lib/shapes/Rect';
import { TextConfig } from 'konva/lib/shapes/Text';

export interface IRowHeaderRectConfig extends RectConfig {
  width: number;
}

export interface IColHeaderRectConfig extends RectConfig {
  height: number;
}

export interface IRowHeaderConfig {
  rect: IRowHeaderRectConfig;
  text: TextConfig;
}

export interface IColHeaderConfig {
  rect: IColHeaderRectConfig;
  text: TextConfig;
}

export interface ICellConfig {
  rect: RectConfig;
  text: TextConfig;
}

export interface IRowColConfig {
  resizeLine: LineConfig;
  resizeGuideLine: LineConfig;
  resizeMarker: LineConfig;
  gridLine: LineConfig;
  frozenLine: LineConfig;
  headerRect: RectConfig;
  headerText?: TextConfig;
}

export interface IStyles {
  topLeftRect: RectConfig;
  selectionFirstCell: RectConfig;
  selection: RectConfig;
  commentMarker: LineConfig;
  col: IRowColConfig;
  row: IRowColConfig;
  cell: ICellConfig;
}

const resizeMarkerSize = 7;
const resizeHitStrokeWidth = 15;
const strokeWidth = 1;

export const sharedStyles = {
  gridLine: {
    stroke: '#e3e3e3',
    strokeWidth,
  },
  resizeMarker: {
    fill: '#0057ff',
    opacity: 0.3,
    visible: false,
    hitStrokeWidth: resizeHitStrokeWidth,
    draggable: true,
  },
  resizeGuideLine: {
    strokeWidth,
    visible: false,
    stroke: 'blue',
  },
  resizeLine: {
    stroke: '#8a8a8a',
    strokeWidth,
    hitStrokeWidth: resizeHitStrokeWidth,
    opacity: 0.7,
  },
  frozenLine: {
    strokeWidth,
    stroke: 'blue',
  },
  headerRect: {
    fill: '#f4f5f8',
  },
  selection: {
    strokeWidth,
  },
};

export const defaultStyles: IStyles = {
  topLeftRect: {
    fill: sharedStyles.headerRect.fill,
  },
  selectionFirstCell: {
    ...sharedStyles.selection,
    fill: 'transparent',
    stroke: '#0057ff',
    strokeWidth: 1.5,
  },
  selection: {
    ...sharedStyles.selection,
    stroke: '#1a73e8',
    fill: 'rgb(14, 101, 235, 0.1)',
  },
  commentMarker: {
    type: 'commentMarker',
    stroke: 'orange',
    fill: 'orange',
    strokeWidth: 2,
    offsetX: -6,
    offsetY: 1,
    points: [0, 5, 5, 5, 0, 0],
    closed: true,
  },
  row: {
    frozenLine: sharedStyles.frozenLine,
    resizeGuideLine: sharedStyles.resizeGuideLine,
    resizeMarker: {
      ...sharedStyles.resizeMarker,
      height: resizeMarkerSize,
    },
    resizeLine: sharedStyles.resizeLine,
    gridLine: sharedStyles.gridLine,
    headerRect: {
      ...sharedStyles.headerRect,
      width: 25,
    },
  },
  col: {
    frozenLine: sharedStyles.frozenLine,
    resizeGuideLine: sharedStyles.resizeGuideLine,
    resizeMarker: {
      ...sharedStyles.resizeMarker,
      width: resizeMarkerSize,
    },
    resizeLine: sharedStyles.resizeLine,
    gridLine: sharedStyles.gridLine,
    headerRect: {
      ...sharedStyles.headerRect,
      height: 20,
    },
  },
  cell: {
    rect: {
      type: 'cellRect',
      fill: 'white',
      stroke: sharedStyles.gridLine.stroke,
      strokeWidth: sharedStyles.gridLine.strokeWidth,
    },
    text: {
      type: 'cellText',
      fontSize: 14,
      fill: 'black',
      align: 'left',
      verticalAlign: 'middle',
      wrap: 'none',
      padding: 2,
    },
  },
};
