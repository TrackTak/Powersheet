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
import { Shape, ShapeConfig } from 'konva/lib/Shape';

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

export interface IScrollGroups {
  main: Group;
  xSticky: Group;
  ySticky: Group;
  xySticky: Group;
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
  let isReversedX = false;
  let isReversedY = false;

  if (start.x > end.x) {
    const temp = start.x;

    newStart.x = end.x;
    newEnd.x = temp;
    isReversedX = true;
  }

  if (start.y > end.y) {
    const temp = start.y;

    newStart.y = end.y;
    newEnd.y = temp;
    isReversedY = true;
  }

  return {
    start: newStart,
    end: newEnd,
    isReversedX,
    isReversedY,
  };
};

class Canvas {
  container: HTMLDivElement;
  stage: Stage;
  scrollGroups: IScrollGroups;
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

    this.layers = {
      mainLayer: new Layer(),
    };

    this.scrollGroups = {
      main: new Group(),
      xSticky: new Group(),
      ySticky: new Group(),
      xySticky: new Group(),
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
        ...this.styles.topLeftRect,
        width: this.getViewportVector().x,
        height: this.getViewportVector().y,
      }),
    };

    this.shapes.frozenGridLine.cache();

    this.shapes.sheetGroup.add(this.shapes.sheet);

    this.layers.mainLayer.add(this.shapes.sheetGroup);

    Object.values(this.scrollGroups).forEach((group) => {
      this.layers.mainLayer.add(group);
    });

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
    console.log(end);
    let updatedEndVector = {
      ...end
    };
    if (this.selector.isInSelectionMode) {
      const { isReversedX, isReversedY } = reverseVectorsIfStartBiggerThanEnd(
        start,
        end
      );
      for (const mergedCell of Object.values(this.merger.mergedCellsMap)) {
        const mergedCellRelativeToViewport: Shape<ShapeConfig> = mergedCell.clone();
        const viewportVector = this.getViewportVector();
        mergedCellRelativeToViewport.setPosition({
          x: mergedCellRelativeToViewport.x() - viewportVector.x,
          y: mergedCellRelativeToViewport.y() - viewportVector.y
        });
        // const isInMergedCellXRange = end.x >= mergedCell.x() && end.x <= mergedCell.x() + mergedCell.width();
        // const isInMergedCellYRange = end.y >= mergedCell.y() && end.y <= mergedCell.y() + mergedCell.height();
        console.log(end.x, mergedCellRelativeToViewport.x(), end.y, mergedCellRelativeToViewport.y());
        // if (isInMergedCellXRange || isInMergedCellYRange) {
          const isInMergedCellRange = end.x >= mergedCellRelativeToViewport.x() && end.y >= mergedCellRelativeToViewport.y();
          if (isInMergedCellRange) {
            console.log('isInMergedCellRange')
            if (isReversedX || isReversedY) {
              updatedEndVector.x = isReversedX ? mergedCellRelativeToViewport.x() : updatedEndVector.x + mergedCellRelativeToViewport.x() ;
              updatedEndVector.y = isReversedY ? mergedCellRelativeToViewport.y() : updatedEndVector.y + (mergedCellRelativeToViewport.height() - mergedCellRelativeToViewport.height() / 2);
              console.log('IS REVERSED', isReversedX, isReversedY);
            } else {
              const endXDiff = end.x - mergedCellRelativeToViewport.x();
              const endYDiff = end.y - mergedCellRelativeToViewport.y();
              updatedEndVector.x = start.x + mergedCellRelativeToViewport.width() + (endXDiff > 0 ? endXDiff : 0);
              updatedEndVector.y = mergedCellRelativeToViewport.y() + (mergedCellRelativeToViewport.height() - mergedCellRelativeToViewport.height() / 2) + (endYDiff > 0 ? endYDiff : 0);;
              console.log('NOT REVERSED', end, updatedEndVector);
            }
          break;
        }
      }
  }

    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      updatedEndVector
    );

    const colIndexes = this.col.getIndexesBetweenVectors({
      x: newStart.x,
      y: newEnd.x,
    });

    const rowIndexes = this.row.getIndexesBetweenVectors({
      x: newStart.y,
      y: newEnd.y,
    });

    const rows = this.row.getItemsBetweenIndexes(rowIndexes, this.merger.mergedCellsMap);
    const cols = this.col.getItemsBetweenIndexes(colIndexes, this.merger.mergedCellsMap);

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
    this.scrollGroups.xySticky.add(this.shapes.topLeftRect);

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
