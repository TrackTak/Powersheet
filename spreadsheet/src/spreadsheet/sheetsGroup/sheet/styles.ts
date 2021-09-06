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

export interface IStyles {
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

export const sharedStyles = {
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

export const defaultStyles: IStyles = {
  backgroundColor: 'white',
  frozenGridLine: {
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
    listening: true,
    draggable: true,
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
    ...performanceProperties,
    fill: sharedStyles.headerRect.fill,
  },
  selectionBorder: {
    ...performanceProperties,
    stroke: '#0057ff',
    strokeWidth: 1,
  },
  selectionFirstCell: {
    ...sharedStyles.selection,
    strokeWidth: 2,
  },
  selection: {
    ...sharedStyles.selection,
    strokeWidth: 0,
    fill: 'rgb(14, 101, 235, 0.1)',
  },
};
