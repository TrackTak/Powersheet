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

export interface IStyles {
  resizeLine: LineConfig;
  resizeGuideLine: LineConfig;
  gridLine: LineConfig;
  frozenLine: LineConfig;
  rowResizeMarker: RectConfig;
  colResizeMarker: RectConfig;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
  topLeftRect: RectConfig;
  selectionFirstCell: RectConfig;
  selection: RectConfig;
  commentMarker: LineConfig;
  cell: ICellConfig;
}

export const resizeMarkerSize = 7;

const sharedStyles = {
  gridLine: {
    stroke: '#e3e3e3',
    strokeWidth: 1,
  },
  resizeMarker: {
    fill: '#0057ff',
    opacity: 0.3,
    visible: false,
    hitStrokeWidth: 15,
    draggable: true,
  },
  headerRect: {
    fill: '#f4f5f8',
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
  },
  selection: {
    strokeWidth: 1,
  },
};

export const defaultStyles: IStyles = {
  frozenLine: {
    ...sharedStyles.gridLine,
    stroke: 'blue',
  },
  resizeGuideLine: {
    ...sharedStyles.gridLine,
    visible: false,
    stroke: 'blue',
  },
  rowResizeMarker: {
    ...sharedStyles.resizeMarker,
    height: resizeMarkerSize,
  },
  colResizeMarker: {
    ...sharedStyles.resizeMarker,
    width: resizeMarkerSize,
  },
  resizeLine: {
    ...sharedStyles.gridLine,
    stroke: '#8a8a8a',
    hitStrokeWidth: 15,
    opacity: 0.7,
  },
  gridLine: {
    ...sharedStyles.gridLine,
  },
  rowHeader: {
    rect: {
      ...sharedStyles.headerRect,
      width: 25,
    },
    text: {
      ...sharedStyles.headerText,
    },
  },
  colHeader: {
    rect: {
      ...sharedStyles.headerRect,
      height: 20,
    },
    text: {
      ...sharedStyles.headerText,
    },
  },
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
  cell: {
    rect: {
      type: 'cellRect',
      fill: 'white',
      stroke: sharedStyles.gridLine.stroke,
      strokeWidth: sharedStyles.gridLine.strokeWidth,
    },
    text: {
      ...sharedStyles.headerText,
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
