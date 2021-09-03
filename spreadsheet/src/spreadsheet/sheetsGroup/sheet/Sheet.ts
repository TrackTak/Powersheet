import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { isNil, merge } from 'lodash';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Sheet.module.scss';
import { Line } from 'konva/lib/shapes/Line';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import {
  defaultStyles,
  IColHeaderConfig,
  IRowHeaderConfig,
  IStyles,
  performanceProperties,
} from './styles';
import { IFrozenCells, IOptions } from '../../options';
import Selector, { iterateSelection } from './Selector';
import Merger from './Merger';
import RowCol from './RowCol';
import events from '../../events';
import CellEditor from './CellEditor';
import Toolbar from '../../toolbar/Toolbar';
import { BorderIconName } from '../../toolbar/htmlElementHelpers';
import FormulaBar from '../../formulaBar/FormulaBar';
import { Shape, ShapeConfig } from 'konva/lib/Shape';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<IStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
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

interface IShapes {
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

export type Cell = Group;

// This is for canvas not making odd lines crisp looking
// https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
export const offsetLineValue = (val: number) => {
  if (val % 1 === 0) return val + 0.5;

  return val;
};

export const makeLineCrisp = (line: Line) => {
  line.x(offsetLineValue(line.x()));
  line.y(offsetLineValue(line.y()));
};

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export const getCellBorderFromCell = (cell: Cell, type: BorderIconName) => {
  const cellBorder = cell.children?.find((x) => x.attrs.type === type) as Line;

  return cellBorder;
};

export const getOtherCellChildren = (
  cell: Cell,
  typesToFilterOut: string[] = []
) => {
  const otherChildren = cell.children
    ?.filter((x) => typesToFilterOut.every((z) => z !== x.attrs.type))
    .map((x) => x.clone());

  return otherChildren ?? [];
};

export const setCellChildren = (
  cell: Cell,
  children: (Group | Shape<ShapeConfig>)[]
) => {
  if (children.length) {
    cell.destroyChildren();
    cell.add(...children);
  }
};

export const getCellRectFromCell = (cell: Cell) => {
  const cellRect = cell.children?.find(
    (x) => x.attrs.type === 'cellRect'
  ) as Rect;

  return cellRect;
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

export function* iterateXToY(vector: Vector2d) {
  for (let index = vector.x; index < vector.y; index++) {
    yield index;
  }

  return -Infinity;
}

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

class Sheet {
  container: HTMLDivElement;
  stage: Stage;
  scrollGroups: IScrollGroups;
  layers: ILayers;
  col: RowCol;
  row: RowCol;
  selector: Selector;
  merger: Merger;
  styles: IStyles;
  shapes: IShapes;
  sheetDimensions: IDimensions;
  sheetViewportDimensions: IDimensions;
  cellsMap: Map<CellId, Cell>;
  eventEmitter: EventEmitter;
  options: IOptions;
  cellEditor: CellEditor;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultStyles, params.styles);
    this.options = params.options;
    this.toolbar = params.toolbar;
    this.formulaBar = params.formulaBar;
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
      `${prefix}-sheet-container`,
      styles.sheetContainer
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
    this.cellEditor = new CellEditor(this);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  emit<T extends EventEmitter.EventNames<string | symbol>>(
    event: T,
    ...args: any[]
  ) {
    if (this.options.devMode) {
      console.log(event);
    }

    this.eventEmitter.emit(event, ...args);
  }

  updateCells() {
    for (const cell of this.cellsMap.values()) {
      const cellRect = getCellRectFromCell(cell);

      this.setCellFill(cell, cellRect.fill());
    }
  }

  private *setBorder(borderCells: Cell[], type: BorderIconName) {
    for (let index = 0; index < borderCells.length; index++) {
      const cell = borderCells[index];

      const id = cell.id();
      const existingCell = this.cellsMap.get(id);
      const newCell = this.getNewCell(
        id,
        cell.getClientRect({
          // @ts-ignore
          relativeTo: cell.parent,
        }),
        cell.attrs.row,
        cell.attrs.col
      );

      const clientRect = newCell.getClientRect({
        skipStroke: true,
      });

      const line = new Line({
        ...performanceProperties,
        type,
        stroke: 'black',
        strokeWidth: this.styles.gridLine.strokeWidth,
      });

      if (existingCell) {
        const otherChildren = getOtherCellChildren(existingCell, [type]);

        setCellChildren(newCell, otherChildren);

        this.cellsMap.get(id)!.destroy();
      }

      newCell.add(line);

      this.cellsMap.set(id, newCell);

      this.drawCell(newCell);

      yield { clientRect, line };

      makeLineCrisp(line);

      line.moveToTop();
    }
  }

  clearBorders(cells: Cell[]) {
    cells.forEach((cell) => {
      const id = cell.id();
      const existingCell = this.cellsMap.get(id);

      if (existingCell) {
        const types: BorderIconName[] = [
          'borderLeft',
          'borderTop',
          'borderRight',
          'borderBottom',
          'borderVertical',
          'borderHorizontal',
        ];
        const otherChildren = getOtherCellChildren(existingCell, types);

        setCellChildren(existingCell, otherChildren);
      }
    });
  }

  setBordersAll(cells: Cell[]) {
    this.setBordersInside(cells);
    this.setBordersOutside(cells);
  }

  setBordersInside(cells: Cell[]) {
    this.setBordersHorizontal(cells);
    this.setBordersVertical(cells);
  }

  setBordersHorizontal(cells: Cell[]) {
    const row = this.row.convertFromCellsToRange(cells);
    const horizontalCells = cells.filter(
      (cell) => cell.attrs.row.x >= row.x && cell.attrs.row.y < row.y
    );

    for (const { clientRect, line } of this.setBorder(
      horizontalCells,
      'borderHorizontal'
    )) {
      line.y(clientRect.height);
      line.points([0, 0, clientRect.width, 0]);
    }
  }

  setBordersVertical(cells: Cell[]) {
    const col = this.col.convertFromCellsToRange(cells);
    const verticalCells = cells.filter(
      (cell) => cell.attrs.col.x >= col.x && cell.attrs.col.y < col.y
    );

    for (const { clientRect, line } of this.setBorder(
      verticalCells,
      'borderVertical'
    )) {
      line.x(clientRect.width);
      line.points([0, 0, 0, clientRect.height]);
    }
  }

  setBordersOutside(cells: Cell[]) {
    this.setBorderBottom(cells);
    this.setBorderLeft(cells);
    this.setBorderRight(cells);
    this.setBorderTop(cells);
  }

  setBorderBottom(cells: Cell[]) {
    const row = this.row.convertFromCellsToRange(cells);
    const bottomCells = cells.filter((cell) => cell.attrs.row.y === row.y);

    for (const { clientRect, line } of this.setBorder(
      bottomCells,
      'borderBottom'
    )) {
      line.y(clientRect.height);
      line.points([0, 0, clientRect.width, 0]);
    }
  }

  setBorderRight(cells: Cell[]) {
    const col = this.col.convertFromCellsToRange(cells);
    const rightCells = cells.filter((cell) => cell.attrs.col.y === col.y);

    for (const { clientRect, line } of this.setBorder(
      rightCells,
      'borderRight'
    )) {
      line.x(clientRect.width);
      line.points([0, 0, 0, clientRect.height]);
    }
  }

  setBorderTop(cells: Cell[]) {
    const row = this.row.convertFromCellsToRange(cells);
    const topCells = cells.filter((cell) => cell.attrs.row.x === row.x);

    for (const { clientRect, line } of this.setBorder(topCells, 'borderTop')) {
      line.points([0, 0, clientRect.width, 0]);
    }
  }

  setBorderLeft(cells: Cell[]) {
    const col = this.col.convertFromCellsToRange(cells);
    const leftCells = cells.filter((cell) => cell.attrs.col.x === col.x);

    for (const { clientRect, line } of this.setBorder(
      leftCells,
      'borderLeft'
    )) {
      line.points([0, 0, 0, clientRect.height]);
    }
  }

  setCellFill(cell: Cell, fill: string) {
    const id = cell.id();
    const existingCell = this.cellsMap.get(id);
    const newCell = this.getNewCell(
      id,
      cell.getClientRect({
        // @ts-ignore
        relativeTo: cell.parent,
      }),
      cell.attrs.row,
      cell.attrs.col
    );

    if (existingCell) {
      const otherChildren = getOtherCellChildren(existingCell);

      setCellChildren(newCell, otherChildren);

      this.cellsMap.get(id)!.destroy();
    }

    const cellRect = getCellRectFromCell(newCell);

    cellRect.setAttr('fill', fill);

    this.cellsMap.set(id, newCell);

    this.drawCell(newCell);
  }

  getNewCell(id: string | null, rect: IRect, row: Vector2d, col: Vector2d) {
    const cell = new Group({
      ...performanceProperties,
      x: rect.x,
      y: rect.y,
      row,
      col,
    });

    if (id) {
      cell.id(id);
    }

    const cellRect = new Rect({
      type: 'cellRect',
      width: rect.width,
      height: rect.height,
    });

    cell.add(cellRect);

    return cell;
  }

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
    this.drawNextItems();
    // TODO: Remove when it's fixed in scroll
    this.updateViewport();

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    this.col.scrollBar.setup();
    this.row.scrollBar.setup();

    this.row.scrollBar.scrollBarEl.style.bottom = `${
      this.col.scrollBar.getBoundingClientRect().height
    }px`;

    this.emit(events.sheet.load, e);
  };

  convertFromRowColsToCells(rows: Group[], cols: Group[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    const convertFromRowColToCell = (rowGroup: Group, colGroup: Group) => {
      const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
      const mergedCell = this.merger.associatedMergedCellMap.get(id);

      if (mergedCell) {
        const mergedCellId = mergedCell.id();

        if (!mergedCellsAddedMap.get(mergedCellId)) {
          const rect = mergedCell.getClientRect();
          const cell = this.getNewCell(
            mergedCellId,
            rect,
            mergedCell.attrs.row,
            mergedCell.attrs.col
          );

          mergedCellsAddedMap.set(mergedCellId, cell);

          return cell;
        }
        return null;
      }

      const rect: IRect = {
        x: colGroup.x(),
        y: rowGroup.y(),
        width: colGroup.width(),
        height: rowGroup.height(),
      };
      const row = {
        x: rowGroup.attrs.index,
        y: rowGroup.attrs.index,
      };

      const col = {
        x: colGroup.attrs.index,
        y: colGroup.attrs.index,
      };

      const cell = this.getNewCell(id, rect, row, col);

      return cell;
    };

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const cell = convertFromRowColToCell(rowGroup, colGroup);

        if (cell) {
          cells.push(cell);
        }
      });
    });

    return cells;
  }

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
    this.cellEditor.destroy();
  }

  destroyCell(cellId: string) {
    if (this.cellsMap.has(cellId)) {
      const cell = this.cellsMap.get(cellId)!;

      cell.destroy();

      this.cellsMap.delete(cellId);
    }
  }

  setFrozenCells(frozenCells: IFrozenCells) {
    this.options.frozenCells = frozenCells;

    this.row.drawViewport();
    this.col.drawViewport();
  }

  drawCell(cell: Cell) {
    const isFrozenRow = this.row.getIsFrozen(cell.attrs.row.x);
    const isFrozenCol = this.col.getIsFrozen(cell.attrs.col.x);
    const isMerged = !!this.merger.associatedMergedCellMap.get(cell.id() ?? '');

    if (isFrozenRow && isFrozenCol) {
      this.scrollGroups.xySticky.add(cell);
    } else if (isFrozenRow) {
      this.scrollGroups.ySticky.add(cell);
    } else if (isFrozenCol) {
      this.scrollGroups.xSticky.add(cell);
    } else {
      this.scrollGroups.main.add(cell);
    }

    if (isMerged) {
      cell.moveToTop();
    } else {
      cell.moveToBottom();
    }
  }

  drawTopLeftOffsetRect() {
    this.scrollGroups.xySticky.add(this.shapes.topLeftRect);

    this.shapes.topLeftRect.moveToTop();
  }

  updateViewport() {
    this.updateSheetDimensions();
    this.updateCells();
    this.row.scrollBar.updateCustomSizePositions();
    this.col.scrollBar.updateCustomSizePositions();
    this.merger.updateMergedCells();
    this.selector.updateSelectedCells();
  }

  drawNextItems() {
    const colGenerator = this.col.drawNextItems();
    const rowGenerator = this.row.drawNextItems();

    let colIteratorResult;
    let rowIteratorResult;

    do {
      colIteratorResult = colGenerator.next();
      rowIteratorResult = rowGenerator.next();
    } while (!colIteratorResult.done || !rowIteratorResult.done);

    // this.updateViewport();
  }
}

export default Sheet;
