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

export interface ICanvasStyles {
  backgroundColor: string;
  resizeLine: LineConfig;
  resizeGuideLine: LineConfig;
  gridLine: LineConfig;
  frozenGridLine: LineConfig;
  rowResizeMarker: RectConfig;
  colResizeMarker: RectConfig;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
  topLeftRect: RectConfig;
  selectionFirstCell: RectConfig;
  selection: RectConfig;
  selectionBorder: RectConfig;
}

export const resizeMarkerSize = 7;
export const performanceProperties = {
  shadowForStrokeEnabled: false,
  hitStrokeWidth: 0,
  perfectDrawEnabled: false,
  listening: false,
};

export const sharedCanvasStyles = {
  gridLine: {
    ...performanceProperties,
    stroke: '#c6c6c6',
    strokeWidth: 0.6,
  },
  resizeMarker: {
    ...performanceProperties,
    fill: '#0057ff',
    opacity: 0.3,
    visible: false,
  },
  headerRect: {
    ...performanceProperties,
    fill: '#f4f5f8',
    listening: true,
  },
  headerText: {
    ...performanceProperties,
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
  },
  selection: {
    ...performanceProperties,
    stroke: '#0057ff',
  },
};

export const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  frozenGridLine: {
    ...sharedCanvasStyles.gridLine,
    stroke: 'blue',
  },
  resizeGuideLine: {
    ...sharedCanvasStyles.gridLine,
    visible: false,
    stroke: 'blue',
  },
  rowResizeMarker: {
    ...sharedCanvasStyles.resizeMarker,
    height: resizeMarkerSize,
  },
  colResizeMarker: {
    ...sharedCanvasStyles.resizeMarker,
    width: resizeMarkerSize,
  },
  resizeLine: {
    ...sharedCanvasStyles.gridLine,
    hitStrokeWidth: 15,
    listening: true,
    draggable: true,
    opacity: 0.7,
  },
  gridLine: {
    ...sharedCanvasStyles.gridLine,
  },
  rowHeader: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      width: 25,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
  },
  colHeader: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      height: 20,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
  },
  topLeftRect: {
    ...performanceProperties,
    fill: sharedCanvasStyles.headerRect.fill,
  },
  selectionBorder: {
    ...performanceProperties,
    stroke: '#0057ff',
    strokeWidth: 1,
  },
  selectionFirstCell: {
    ...sharedCanvasStyles.selection,
    strokeWidth: 2,
  },
  selection: {
    ...sharedCanvasStyles.selection,
    strokeWidth: 0,
    opacity: 0.1,
    fill: '#4b89ff',
  },
};
