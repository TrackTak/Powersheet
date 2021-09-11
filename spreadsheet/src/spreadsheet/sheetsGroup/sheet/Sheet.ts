import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import EventEmitter from 'eventemitter3';
import { Line } from 'konva/lib/shapes/Line';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import { performanceProperties } from '../../styles';
import Selector, { iterateSelection } from './Selector';
import Merger, { defaultCellFill } from './Merger';
import RowCol from './RowCol';
import CellEditor from './CellEditor';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { BorderIconName } from '../../toolbar/toolbarHtmlElementHelpers';
import RightClickMenu from './RightClickMenu';
import { Stage } from 'konva/lib/Stage';
import SheetsGroup from '../SheetsGroup';
import Spreadsheet from '../../Spreadsheet';
import { prefix } from '../../utils';
import styles from './Sheet.module.scss';

export interface IDimensions {
  width: number;
  height: number;
}

export interface ISheetViewportPosition {
  x: number;
  y: number;
}

interface IShapes {
  sheet: Rect;
  frozenGridLine: Line;
  topLeftRect: Rect;
}

export interface ICustomSizePosition {
  axis: number;
  size: number;
}

export type CellId = string;
export type SheetId = string;

export interface IFrozenCells {
  row: number;
  col: number;
}

export interface IMergedCells {
  row: Vector2d;
  col: Vector2d;
}

export interface ISizes {
  [index: string]: number;
}

export type BorderStyleOption =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom';

export interface ICellStyle {
  backgroundColor?: string;
  borders?: BorderStyleOption[];
}

export interface ICellStyles {
  [index: CellId]: ICellStyle;
}

export interface IRowColData {
  sizes: ISizes;
}

export interface IData {
  sheetName: string;
  frozenCells?: IFrozenCells;
  mergedCells?: IMergedCells[];
  cellStyles?: ICellStyles;
  row?: IRowColData;
  col?: IRowColData;
}

export interface ISheetData {
  [sheetName: SheetId]: IData;
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

export type Cell = Group;

type operator = 'add' | 'subtract';

// This is for canvas not making odd lines crisp looking
// https://stackoverflow.com/questions/7530593/html5-canvas-and-line-width/7531540#7531540
export const offsetShapeValue = (
  val: number,
  operator: operator = 'subtract'
) => {
  if (val % 1 === 0) return operator === 'add' ? val + 0.5 : val - 0.5;

  return val;
};

export const makeShapeCrisp = (shape: Shape, operator?: operator) => {
  shape.x(offsetShapeValue(shape.x(), operator));
  shape.y(offsetShapeValue(shape.y(), operator));
};

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export const convertFromCellIdToRowCol = (id: CellId) => {
  const sections = id.split('_');

  return {
    row: parseInt(sections[0], 10),
    col: parseInt(sections[1], 10),
  };
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
  cell.destroyChildren();

  if (children?.length) {
    cell.add(...children);
  }
};

export const getCellRectFromCell = (cell: Cell) => {
  const cellRect = cell.children?.find(
    (x) => x.attrs.type === 'cellRect'
  ) as Rect;

  return cellRect;
};

export const getCellBorderFromCell = (cell: Cell, type: BorderIconName) => {
  const cellBorder = cell.children?.find((x) => x.attrs.type === type) as Line;

  return cellBorder;
};

export const getSheetGroupFromScrollGroup = (scrollGroup: Group) => {
  const sheetGroup = scrollGroup.children?.find(
    (x) => x.attrs.type === 'sheet'
  ) as Group;

  return sheetGroup;
};

export const getHeaderGroupFromScrollGroup = (scrollGroup: Group) => {
  const headerGroup = scrollGroup.children?.find(
    (x) => x.attrs.type === 'header'
  ) as Group;

  return headerGroup;
};

export const getRowColGroupFromScrollGroup = (scrollGroup: Group) => {
  const rowColGroup = getSheetGroupFromScrollGroup(scrollGroup).children?.find(
    (x) => x.attrs.type === 'rowCol'
  ) as Group;

  return rowColGroup;
};

export const getCellGroupFromScrollGroup = (scrollGroup: Group) => {
  const cellGroup = getSheetGroupFromScrollGroup(scrollGroup).children?.find(
    (x) => x.attrs.type === 'cell'
  ) as Group;

  return cellGroup;
};

export const getMergedCellGroupFromScrollGroup = (scrollGroup: Group) => {
  const cellGroup = getSheetGroupFromScrollGroup(scrollGroup).children?.find(
    (x) => x.attrs.type === 'mergedCell'
  ) as Group;

  return cellGroup;
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

export const getIsFrozenRow = (ri: number, data: IData) => {
  return data.frozenCells ? ri <= data.frozenCells.row : false;
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
  scrollGroups: IScrollGroups;
  sheetEl: HTMLDivElement;
  stage: Stage;
  layer: Layer;
  col: RowCol;
  row: RowCol;
  selector: Selector;
  merger: Merger;
  shapes: IShapes;
  sheetDimensions: IDimensions;
  cellsMap: Map<CellId, Cell>;
  cellEditor: CellEditor;
  rightClickMenu?: RightClickMenu;
  private spreadsheet: Spreadsheet;

  constructor(public sheetsGroup: SheetsGroup, public sheetId: SheetId) {
    this.sheetsGroup = sheetsGroup;
    this.sheetId = sheetId;
    this.spreadsheet = this.sheetsGroup.spreadsheet;
    this.cellsMap = new Map();

    this.sheetDimensions = {
      width: 0,
      height: 0,
    };

    this.sheetEl = document.createElement('div');
    this.sheetEl.classList.add(`${prefix}-sheet`, styles.sheet);

    this.sheetsGroup.sheetsEl.appendChild(this.sheetEl);

    this.scrollGroups = {
      main: new Group(),
      xSticky: new Group(),
      ySticky: new Group(),
      xySticky: new Group(),
    };

    Object.values(this.scrollGroups).forEach((scrollGroup: Group) => {
      const sheetGroup = new Group({
        ...performanceProperties,
        ...this.getViewportVector(),
        listening: true,
        type: 'sheet',
      });

      const cellGroup = new Group({
        ...performanceProperties,
        type: 'cell',
      });

      const mergedCellGroup = new Group({
        ...performanceProperties,
        type: 'mergedCell',
      });

      const rowColGroup = new Group({
        ...performanceProperties,
        type: 'rowCol',
      });

      const headerGroup = new Group({
        ...performanceProperties,
        listening: true,
        type: 'header',
      });

      // The order added here matters as it determines the zIndex for konva
      sheetGroup.add(cellGroup, rowColGroup, mergedCellGroup);
      scrollGroup.add(sheetGroup, headerGroup);
    });

    this.shapes = {
      sheet: new Rect({
        ...performanceProperties,
        type: 'sheet',
        listening: true,
        opacity: 0,
      }),
      frozenGridLine: new Line({
        ...this.spreadsheet.styles.frozenGridLine,
      }),
      topLeftRect: new Rect({
        ...this.spreadsheet.styles.topLeftRect,
        width: this.getViewportVector().x,
        height: this.getViewportVector().y,
      }),
    };

    this.stage = new Stage({
      container: this.sheetEl,
    });

    this.layer = new Layer();

    this.stage.add(this.layer);
    this.layer.add(this.shapes.sheet);

    this.shapes.frozenGridLine.cache();

    Object.values(this.scrollGroups).forEach((group) => {
      this.layer.add(group);
    });

    this.col = new RowCol('col', this);
    this.row = new RowCol('row', this);

    this.col.setup();
    this.row.setup();

    this.merger = new Merger(this);
    this.selector = new Selector(this);
    this.cellEditor = new CellEditor(this);
    this.rightClickMenu = new RightClickMenu(this);

    this.updateSheetDimensions();

    const sheetConfig: RectConfig = {
      width: this.col.totalSize,
      height: this.row.totalSize,
      x: this.getViewportVector().x,
      y: this.getViewportVector().y,
    };

    this.shapes.sheet.setAttrs(sheetConfig);

    this.drawTopLeftOffsetRect();
    this.drawNextItems();
    this.updateViewport();

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    this.selector.startSelection({ x: 0, y: 0 }, { x: 0, y: 0 });
  }

  emit<T extends EventEmitter.EventNames<string | symbol>>(
    event: T,
    ...args: any[]
  ) {
    if (this.spreadsheet.options.devMode) {
      console.log(event);
    }

    this.spreadsheet.eventEmitter.emit(event, ...args);
  }

  setSize() {
    this.col.scrollBar.updateCustomSizePositions();
    this.row.scrollBar.updateCustomSizePositions();

    this.stage.width(this.col.totalSize + this.getViewportVector().x);
    this.stage.height(this.row.totalSize + this.getViewportVector().y);

    // TODO: use scrollBar size instead of hardcoded value
    this.row.scrollBar.scrollBarEl.style.bottom = `${18}px`;
  }

  setSheetId(sheetId: SheetId) {
    this.sheetId = sheetId;
  }

  getData() {
    return this.spreadsheet.data[this.sheetId];
  }

  setBorderStyle(id: CellId, borderType: BorderStyleOption) {
    const borders = this.getData().cellStyles?.[id]?.borders ?? [];

    if (borders.indexOf(borderType) === -1) {
      this.setCellStyle(id, {
        borders: [...borders, borderType],
      });
    }
  }

  removeCellStyle(id: CellId, name: keyof ICellStyle) {
    const data = this.getData();

    if (!data.cellStyles) {
      return;
    }

    if (data.cellStyles[id]) {
      delete data.cellStyles[id][name];
    }

    const cellStylesArray = Object.keys(data.cellStyles[id] ?? {});

    if (data.cellStyles[id] && cellStylesArray.length === 0) {
      delete data.cellStyles[id];
    }
  }

  setCellStyle(id: CellId, newStyle: ICellStyle) {
    const data = this.getData();

    data.cellStyles = {
      ...data.cellStyles,
      [id]: {
        ...data.cellStyles?.[id],
        ...newStyle,
      },
    };
  }

  addMergedCells(mergedCells: IMergedCells) {
    const data = this.getData();
    const topLeftCellId = getCellId(mergedCells.row.x, mergedCells.col.x);
    const topLeftCellStyle = data.cellStyles?.[topLeftCellId];

    data.mergedCells = data.mergedCells
      ? [...data.mergedCells, mergedCells]
      : [mergedCells];

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        if (data.cellStyles?.[id]) {
          delete data.cellStyles[id];
        }
      }
    }

    this.setCellStyle(topLeftCellId, {
      backgroundColor: defaultCellFill,
      ...topLeftCellStyle,
    });
  }

  removeMergedCells(mergedCells: IMergedCells) {
    const data = this.getData();
    const mergedCellId = getCellId(mergedCells.row.x, mergedCells.col.x);

    data.mergedCells = data.mergedCells?.filter(({ row, col }) => {
      return !this.merger.getAreMergedCellsOverlapping(mergedCells, {
        row,
        col,
      });
    });

    if (!this.merger.getIsCellMerged(mergedCellId)) return;

    const mergedCellStyle = data.cellStyles![mergedCellId];

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.setCellStyle(id, mergedCellStyle);
      }
    }
  }

  updateCells() {
    for (const cell of this.cellsMap.values()) {
      cell.destroy();
    }

    this.cellsMap.clear();

    this.merger.updateMergedCells();

    const cellStyles = this.getData().cellStyles ?? {};

    Object.keys(cellStyles).forEach((id) => {
      const cellStyle = cellStyles[id];

      this.updateCellRect(id);

      if (cellStyle.backgroundColor) {
        this.setCellBackgroundColor(id, cellStyle.backgroundColor);
      }

      if (cellStyle.borders) {
        cellStyle.borders.forEach((borderType) => {
          switch (borderType) {
            case 'borderLeft':
              this.setLeftBorder(id);
              break;
            case 'borderTop':
              this.setTopBorder(id);
              break;
            case 'borderRight':
              this.setRightBorder(id);
              break;
            case 'borderBottom':
              this.setBottomBorder(id);
              break;
          }
        });
      }
    });
  }

  updateCellRect(id: CellId) {
    const cell = this.convertFromCellIdToCell(id);

    if (this.cellsMap.has(id)) {
      const otherChildren = getOtherCellChildren(this.cellsMap.get(id)!, [
        'cellRect',
      ]);

      setCellChildren(cell, [getCellRectFromCell(cell), ...otherChildren]);

      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);
  }

  private *setBorder(id: CellId, type: BorderStyleOption) {
    const { cell, clientRect } = this.drawNewCell(id, [type]);

    const line = new Line({
      ...performanceProperties,
      type,
      stroke: 'black',
      strokeWidth: this.spreadsheet.styles.gridLine.strokeWidth,
    });

    cell.add(line);

    line.moveToTop();

    yield { cell, clientRect, line };

    makeShapeCrisp(line);
  }

  setBottomBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderBottom');
    const { line, clientRect } = generator.next().value!;

    line.y(clientRect.height);
    line.points([0, 0, clientRect.width, 0]);

    generator.next();
  }

  setRightBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderRight');
    const { line, clientRect } = generator.next().value!;

    line.x(clientRect.width);
    line.points([0, 0, 0, clientRect.height]);

    generator.next();
  }

  setTopBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderTop');
    const { line, clientRect } = generator.next().value!;

    line.points([0, 0, clientRect.width, 0]);

    generator.next();
  }

  setLeftBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderLeft');
    const { line, clientRect } = generator.next().value!;

    line.points([0, 0, 0, clientRect.height]);

    generator.next();
  }

  setCellBackgroundColor(id: CellId, backgroundColor: string) {
    const { cell } = this.drawNewCell(id);
    const cellRect = getCellRectFromCell(cell);

    cellRect.fill(backgroundColor);
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
      x: this.spreadsheet.styles.rowHeader.rect.width,
      y: this.spreadsheet.styles.colHeader.rect.height,
    };
  }

  convertFromCellIdToCell(id: CellId) {
    const { row, col } = convertFromCellIdToRowCol(id);
    const rowGroup = this.row.rowColGroupMap.get(row);
    const colGroup = this.col.rowColGroupMap.get(col);

    if (!rowGroup) {
      throw new Error(`id ${id} is out of range`);
    }

    if (!colGroup) {
      throw new Error(`id ${id} is out of range`);
    }

    const cell = this.convertFromRowColToCell(rowGroup, colGroup);

    return cell;
  }

  private getConvertedMergedCell(mergedCell: Cell) {
    const rect = getCellRectFromCell(mergedCell);
    // We don't use getClientRect as we don't want the
    // mergedCells gridLines taken into account
    const cell = this.getNewCell(
      mergedCell.id(),
      {
        x: mergedCell.x(),
        y: mergedCell.y(),
        width: rect.width(),
        height: rect.height(),
      },
      mergedCell.attrs.row,
      mergedCell.attrs.col
    );

    return cell;
  }

  convertFromRowColToCell(rowGroup: Group, colGroup: Group) {
    const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
    const mergedCellId = this.merger.associatedMergedCellIdMap.get(id);

    if (mergedCellId) {
      const mergedCell = this.cellsMap.get(mergedCellId)!;

      return this.getConvertedMergedCell(mergedCell);
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
  }

  convertFromRowColsToCells(rows: Group[], cols: Group[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const mergedCellId = this.merger.associatedMergedCellIdMap.get(id);
        let cell;

        if (mergedCellId) {
          const mergedCell = this.cellsMap.get(mergedCellId)!;

          if (!mergedCellsAddedMap?.get(mergedCellId)) {
            cell = this.getConvertedMergedCell(mergedCell);

            mergedCellsAddedMap?.set(mergedCellId, cell);
          }
        } else {
          cell = this.convertFromRowColToCell(rowGroup, colGroup);
        }

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
        const mergedCellId =
          this.merger.associatedMergedCellIdMap.get(existingCellId);

        if (mergedCellId) {
          const mergedCell = this.cellsMap.get(mergedCellId)!;

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

  hide() {
    this.stage.hide();
    this.sheetEl.style.display = 'none';
  }

  show() {
    this.stage.show();
    this.sheetEl.style.display = 'block';
  }

  destroy() {
    this.sheetEl.remove();
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

  drawNewCell(id: CellId, childrenToFilterOut: string[] = []) {
    const cell = this.convertFromCellIdToCell(id);

    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

    if (this.cellsMap.has(id)) {
      const children = getOtherCellChildren(
        this.cellsMap.get(id)!,
        childrenToFilterOut
      );

      setCellChildren(cell, children);

      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);

    this.drawCell(cell);

    return { cell, clientRect };
  }

  drawCell(cell: Cell) {
    const id = cell.id();

    const isFrozenRow = this.row.getIsFrozen(cell.attrs.row.x);
    const isFrozenCol = this.col.getIsFrozen(cell.attrs.col.x);
    const getCellGroupMethod = (scrollGroup: Group) =>
      this.merger.getIsCellMerged(id)
        ? getMergedCellGroupFromScrollGroup(scrollGroup)
        : getCellGroupFromScrollGroup(scrollGroup);

    if (isFrozenRow && isFrozenCol) {
      const xyStickyCellGroup = getCellGroupMethod(this.scrollGroups.xySticky);

      xyStickyCellGroup.add(cell);
    } else if (isFrozenRow) {
      const yStickyCellGroup = getCellGroupMethod(this.scrollGroups.ySticky);

      yStickyCellGroup.add(cell);
    } else if (isFrozenCol) {
      const xStickyCellGroup = getCellGroupMethod(this.scrollGroups.xSticky);

      xStickyCellGroup.add(cell);
    } else {
      const mainCellGroup = getCellGroupMethod(this.scrollGroups.main);

      mainCellGroup.add(cell);
    }

    cell.moveToTop();
  }

  drawTopLeftOffsetRect() {
    this.scrollGroups.xySticky.add(this.shapes.topLeftRect);

    this.shapes.topLeftRect.moveToTop();
  }

  updateViewport() {
    this.updateSheetDimensions();
    this.row.updateViewport();
    this.col.updateViewport();
    this.updateCells();
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
  }
}

export default Sheet;
