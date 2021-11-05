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
  commentMarker: LineConfig;
  borderLine: LineConfig;
}

export interface IHighlightedCellConfig {
  rect: RectConfig;
  innerRect: RectConfig;
}

export interface ISelectedCellConfig {
  rect: RectConfig;
  innerRect: RectConfig;
}

export interface IRowColConfig {
  resizeLine: LineConfig;
  resizeGuideLine: LineConfig;
  resizeMarker: LineConfig;
  gridLine: LineConfig;
  frozenLine: LineConfig;
  headerRect: RectConfig;
  headerText: TextConfig;
}

export interface IStyles {
  topLeftRect: RectConfig;
  selection: RectConfig;
  col: IRowColConfig;
  row: IRowColConfig;
  cell: ICellConfig;
  selectionFirstCell: ISelectedCellConfig;
  highlightedCell: IHighlightedCellConfig;
}

const resizeMarkerSize = 7;
const resizeHitStrokeWidth = 15;
const strokeWidth = 1;
const cellStrokeWidth = 1.5;
const fontFamily = 'Arial';

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
  headerText: {
    fontFamily,
  },
};

export const defaultStyles: IStyles = {
  topLeftRect: {
    fill: sharedStyles.headerRect.fill,
  },
  selection: {
    strokeWidth,
    stroke: '#1a73e8',
    fill: 'rgb(14, 101, 235, 0.1)',
  },
  row: {
    frozenLine: sharedStyles.frozenLine,
    resizeGuideLine: sharedStyles.resizeGuideLine,
    resizeMarker: {
      ...sharedStyles.resizeMarker,
      height: resizeMarkerSize,
      dragBoundFunc: function (pos) {
        return {
          ...pos,
          x: this.absolutePosition().x,
        };
      },
    },
    resizeLine: sharedStyles.resizeLine,
    gridLine: sharedStyles.gridLine,
    headerRect: {
      ...sharedStyles.headerRect,
      width: 25,
    },
    headerText: sharedStyles.headerText,
  },
  col: {
    frozenLine: sharedStyles.frozenLine,
    resizeGuideLine: sharedStyles.resizeGuideLine,
    resizeMarker: {
      ...sharedStyles.resizeMarker,
      width: resizeMarkerSize,
      dragBoundFunc: function (pos) {
        return {
          ...pos,
          y: this.absolutePosition().y,
        };
      },
    },
    resizeLine: sharedStyles.resizeLine,
    gridLine: sharedStyles.gridLine,
    headerRect: {
      ...sharedStyles.headerRect,
      height: 20,
    },
    headerText: sharedStyles.headerText,
  },
  selectionFirstCell: {
    rect: {
      fill: 'transparent',
    },
    innerRect: {
      strokeWidth: cellStrokeWidth,
      stroke: '#0057ff',
    },
  },
  highlightedCell: {
    rect: {
      opacity: 0.1,
    },
    innerRect: {
      strokeWidth: cellStrokeWidth,
      dash: [10, 4],
    },
  },
  cell: {
    rect: {
      fill: 'white',
      stroke: sharedStyles.gridLine.stroke,
      strokeWidth: sharedStyles.gridLine.strokeWidth,
    },
    text: {
      fontFamily,
      fontSize: 12,
      fill: 'black',
      align: 'left',
      verticalAlign: 'middle',
      wrap: 'none',
      padding: 2,
      visible: false,
    },
    commentMarker: {
      stroke: 'orange',
      fill: 'orange',
      rotation: 180,
      points: [0, 5, 5, 5, 0, 0],
      closed: true,
      visible: false,
    },
    borderLine: {
      stroke: 'black',
      strokeWidth: sharedStyles.gridLine.strokeWidth,
      visible: false,
    },
  },
};
