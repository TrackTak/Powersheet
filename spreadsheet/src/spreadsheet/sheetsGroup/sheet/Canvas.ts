import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { isNil, merge } from 'lodash';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import { Line } from 'konva/lib/shapes/Line';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import {
  defaultCanvasStyles,
  ICanvasStyles,
  IColHeaderConfig,
  IRowHeaderConfig,
  performanceProperties,
} from './canvasStyles';
import { IOptions } from '../../options';
import Selector from './Selector';
import Merger from './Merger';
import RowCol from './RowCol';
import events from '../../events';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  options: IOptions;
  eventEmitter: EventEmitter;
}

export interface IDimensions {
  width: number;
  height: number;
}

export interface ISheetViewportPosition {
  x: number;
  y: number;
}

export interface ICanvasShapes {
  sheetGroup: Group;
  sheet: Rect;
  frozenGridLine: Line;
  topLeftRect: Rect;
}

export interface ICustomSizePosition {
  axis: number;
  size: number;
}

export interface ILayers {
  mainLayer: Layer;
}

export interface ICustomSizes {
  size: number;
}

export type CellId = string;

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.x + rectOne.width / 2,
    y: rectOne.y + rectOne.height / 2,
  };

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2,
  };

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y,
  };
};

export const getIsFrozenRow = (ri: number, options: IOptions) => {
  return isNil(options.frozenCells.row) ? false : ri <= options.frozenCells.row;
};

export function* iteratePreviousUpToCurrent(
  previousSheetViewportPosition:
    | ISheetViewportPosition['x']
    | ISheetViewportPosition['y'],
  sheetViewportPosition:
    | ISheetViewportPosition['x']
    | ISheetViewportPosition['y']
) {
  for (
    let index = previousSheetViewportPosition;
    index < sheetViewportPosition;
    index++
  ) {
    yield index;
  }

  return -Infinity;
}

export function* iteratePreviousDownToCurrent(
  previousSheetViewportPosition:
    | ISheetViewportPosition['x']
    | ISheetViewportPosition['y'],
  sheetViewportPosition:
    | ISheetViewportPosition['x']
    | ISheetViewportPosition['y']
) {
  if (previousSheetViewportPosition === sheetViewportPosition) return -Infinity;

  for (
    let index = previousSheetViewportPosition;
    index >= sheetViewportPosition;
    index--
  ) {
    yield index;
  }

  return -Infinity;
}

// Use center-center distance check for non-rotated rects.
// https://longviewcoder.com/2021/02/04/html5-canvas-viewport-optimisation-with-konva/
export const hasOverlap = (rectOne: IRect, rectTwo: IRect) => {
  const diff = {
    x: Math.abs(
      rectOne.x + rectOne.width / 2 - (rectTwo.x + rectTwo.width / 2)
    ),
    y: Math.abs(
      rectOne.y + rectOne.height / 2 - (rectTwo.y + rectTwo.height / 2)
    ),
  };
  const compWidth = (rectOne.width + rectTwo.width) / 2;
  const compHeight = (rectOne.height + rectTwo.height) / 2;
  const hasOverlap = diff.x <= compWidth && diff.y <= compHeight;

  return hasOverlap;
};

export const reverseVectorsIfStartBiggerThanEnd = (
  start: Vector2d,
  end: Vector2d
) => {
  const newStart = { ...start };
  const newEnd = { ...end };

  if (start.x > end.x) {
    const temp = start.x;

    newStart.x = end.x;
    newEnd.x = temp;
  }

  if (start.y > end.y) {
    const temp = start.y;

    newStart.y = end.y;
    newEnd.y = temp;
  }

  return {
    start: newStart,
    end: newEnd,
  };
};

class Canvas {
  container: HTMLDivElement;
  stage: Stage;
  layers: ILayers;
  col: RowCol;
  row: RowCol;
  selector: Selector;
  merger: Merger;
  styles: ICanvasStyles;
  shapes: ICanvasShapes;
  sheetDimensions: IDimensions;
  sheetViewportDimensions: IDimensions;
  eventEmitter: EventEmitter;
  options: IOptions;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.options = params.options;

    const that = this;

    this.sheetDimensions = {
      width: 0,
      height: 0,
    };

    this.sheetViewportDimensions = {
      get width() {
        return that.stage.width() - that.getViewportVector().x;
      },
      get height() {
        return that.stage.height() - that.getViewportVector().y;
      },
    };

    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`, styles.canvas);

    this.stage = new Stage({
      container: this.container,
      ...params.stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    // The order here matters
    this.layers = {
      mainLayer: new Layer(),
    };

    Object.values(this.layers).forEach((layer) => {
      this.stage.add(layer);
    });

    this.shapes = {
      sheetGroup: new Group({
        ...performanceProperties,
        listening: true,
      }),
      sheet: new Rect({
        ...performanceProperties,
        listening: true,
        opacity: 0,
      }),
      frozenGridLine: new Line({
        ...this.styles.frozenGridLine,
      }),
      topLeftRect: new Rect({
        width: this.getViewportVector().x,
        height: this.getViewportVector().y,
        ...this.styles.topLeftRect,
      }),
    };

    this.shapes.frozenGridLine.cache();

    this.shapes.sheetGroup.add(this.shapes.sheet);

    this.layers.mainLayer.add(this.shapes.sheetGroup);

    this.eventEmitter.on(events.scroll.horizontal, this.onScroll);
    this.eventEmitter.on(events.scroll.vertical, this.onScroll);
    this.eventEmitter.on(events.resize.row.end, this.onResizeEnd);
    this.eventEmitter.on(events.resize.col.end, this.onResizeEnd);

    this.col = new RowCol('col', this);
    this.row = new RowCol('row', this);
    this.selector = new Selector(this);
    this.merger = new Merger(this);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  onResizeEnd = () => {
    this.updateSheetDimensions();
  };

  updateSheetDimensions() {
    const widths = Object.values(this.options.col.widths);

    const totalWidthsDifference = widths.reduce((currentWidth, width) => {
      return width - this.options.col.defaultWidth + currentWidth;
    }, 0);

    const heights = Object.values(this.options.row.heights);

    const totalHeightsDifference = heights.reduce((currentHeight, height) => {
      return height - this.options.row.defaultHeight + currentHeight;
    }, 0);

    this.sheetDimensions.width =
      this.options.numberOfCols * this.options.col.defaultWidth +
      totalWidthsDifference;

    this.sheetDimensions.height =
      this.options.numberOfRows * this.options.row.defaultHeight +
      totalHeightsDifference;
  }

  getViewportVector() {
    return {
      x: this.styles.rowHeader.rect.width,
      y: this.styles.colHeader.rect.height,
    };
  }

  onScroll = () => {
    this.updateViewport();
  };

  onLoad = (e: Event) => {
    this.updateSheetDimensions();

    this.stage.width(this.col.totalSize + this.getViewportVector().x);
    this.stage.height(this.row.totalSize + this.getViewportVector().y);

    this.shapes.sheetGroup.setAttrs(this.getViewportVector());

    this.shapes.sheet.setAttrs({
      width: this.sheetViewportDimensions.width,
      height: this.sheetViewportDimensions.height,
    });

    this.drawTopLeftOffsetRect();
    this.updateViewport();

    this.eventEmitter.emit(events.canvas.load, e);
  };

  getRowColsBetweenVectors(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      end
    );

    const colIndexes = this.col.getIndexesBetweenVectors({
      x: newStart.x,
      y: newEnd.x,
    });

    const rowIndexes = this.row.getIndexesBetweenVectors({
      x: newStart.y,
      y: newEnd.y,
    });

    const rows = this.row.getItemsBetweenIndexes(rowIndexes);
    const cols = this.col.getItemsBetweenIndexes(colIndexes);

    return {
      rows,
      cols,
    };
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.eventEmitter.off(events.scroll.horizontal, this.onScroll);
    this.eventEmitter.off(events.scroll.vertical, this.onScroll);

    this.selector.destroy();
    this.col.destroy();
    this.row.destroy();
    this.merger.destroy();
    this.stage.destroy();
  }

  drawTopLeftOffsetRect() {
    this.layers.mainLayer.add(this.shapes.topLeftRect);

    this.shapes.topLeftRect.moveToTop();
  }

  updateViewport() {
    const colGenerator = this.col.updateViewport();
    const rowGenerator = this.row.updateViewport();

    let colIteratorResult;
    let rowIteratorResult;

    do {
      colIteratorResult = colGenerator.next();
      rowIteratorResult = rowGenerator.next();
    } while (!colIteratorResult.done || !rowIteratorResult.done);

    this.merger.updateMergedCells();
  }
}

export default Canvas;
