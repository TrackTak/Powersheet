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
import Selector, { iterateSelection } from './Selector';
import Merger from './Merger';
import RowCol from './RowCol';
import events from '../../events';
import Toolbar from '../../toolbar/Toolbar';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  toolbar?: Toolbar;
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

export const convertFromCellsToCellsRange = (groups: Group[]) => {
  const getMin = (property: string) =>
    Math.min(...groups.map((o) => o.attrs[property].x));
  const getMax = (property: string) =>
    Math.max(...groups.map((o) => o.attrs[property].y));

  const row = {
    x: getMin('row'),
    y: getMax('row'),
  };

  const col = {
    x: getMin('col'),
    y: getMax('col'),
  };

  return { row, col };
};

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
  cellsMap: Map<CellId, Group>;
  eventEmitter: EventEmitter;
  options: IOptions;
  toolbar?: Toolbar;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.options = params.options;
    this.toolbar = params.toolbar;
    this.cellsMap = new Map();

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
    this.container.classList.add(
      `${prefix}-canvas-container`,
      styles.canvasContainer
    );

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

    this.col = new RowCol('col', this);
    this.row = new RowCol('row', this);
    this.selector = new Selector(this);
    this.merger = new Merger(this);

    this.eventEmitter.on(events.toolbar.change, this.toolbarOnChange);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  toolbarOnChange = (name: string, value: any) => {
    const selectedCells = this.selector.selectedCells;
    console.log(selectedCells);
    console.log(this.cellsMap);

    switch (name) {
      case 'backgroundColor': {
        selectedCells.forEach((selectedCell) => {
          const row = selectedCell.attrs.row;
          const col = selectedCell.attrs.col;

          const id = selectedCell.id();
          const isFrozenRow = this.row.getIsFrozen(row.x);
          const isFrozenCol = this.col.getIsFrozen(col.x);
          const clientRect = selectedCell.getClientRect();

          const cell = new Group({
            ...performanceProperties,
            x: clientRect.x,
            y: clientRect.y,
            row,
            col,
          });
          const rect = new Rect({
            fill: value,
            width: clientRect.width,
            height: clientRect.height,
          });

          cell.add(rect);

          if (this.cellsMap.has(id)) {
            this.cellsMap.get(id)!.destroy();
          }

          this.cellsMap.set(selectedCell.attrs.id, cell);

          if (isFrozenRow && isFrozenCol) {
            this.scrollGroups.xySticky.add(cell);
          } else if (isFrozenRow) {
            this.scrollGroups.ySticky.add(cell);
          } else if (isFrozenCol) {
            this.scrollGroups.xSticky.add(cell);
          } else {
            this.scrollGroups.main.add(cell);
          }

          this.selector.setOpacity(selectedCell);

          cell.moveToBottom();
        });
        break;
      }
    }
  };

  updateSheetDimensions() {
    this.sheetDimensions.width = this.col.getTotalSize();
    this.sheetDimensions.height = this.row.getTotalSize();
  }

  getViewportVector() {
    return {
      x: this.styles.rowHeader.rect.width,
      y: this.styles.colHeader.rect.height,
    };
  }

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

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    this.col.scrollBar.setup();
    this.row.scrollBar.setup();

    this.row.scrollBar.scrollBarEl.style.bottom = `${
      this.col.scrollBar.getBoundingClientRect().height
    }px`;

    this.eventEmitter.emit(events.canvas.load, e);
  };

  getRowColsBetweenVectors(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      end
    );

    const rowIndexes = this.row.getIndexesBetweenVectors({
      x: newStart.y,
      y: newEnd.y,
    });

    const colIndexes = this.col.getIndexesBetweenVectors({
      x: newStart.x,
      y: newEnd.x,
    });

    for (const ri of iterateSelection(rowIndexes)) {
      for (const ci of iterateSelection(colIndexes)) {
        const existingCellId = getCellId(ri, ci);
        const mergedCell =
          this.merger.associatedMergedCellMap.get(existingCellId);

        if (mergedCell) {
          const row = mergedCell.attrs.row;
          const col = mergedCell.attrs.col;

          if (col.x < colIndexes.x) {
            colIndexes.x = col.x;
          }

          if (row.x < rowIndexes.x) {
            rowIndexes.x = row.x;
          }

          if (col.y > colIndexes.y) {
            colIndexes.y = col.y;
          }

          if (row.y > rowIndexes.y) {
            rowIndexes.y = row.y;
          }
        }
      }
    }

    const rows = this.row.getItemsBetweenIndexes(rowIndexes);
    const cols = this.col.getItemsBetweenIndexes(colIndexes);

    return {
      rows,
      cols,
    };
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.container.remove();
    this.stage.destroy();

    this.col.destroy();
    this.row.destroy();
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
