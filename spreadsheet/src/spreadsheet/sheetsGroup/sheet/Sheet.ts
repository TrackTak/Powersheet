import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import EventEmitter from 'eventemitter3';
import { Line } from 'konva/lib/shapes/Line';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import { performanceProperties } from '../../styles';
import Selector, { iterateSelection } from './Selector';
import Merger from './Merger';
import RowCol from './RowCol';
import CellEditor from './cellEditor/CellEditor';
import { BorderIconName } from '../../toolbar/toolbarHtmlElementHelpers';
import RightClickMenu from './rightClickMenu/RightClickMenu';
import { Stage } from 'konva/lib/Stage';
import SheetsGroup from '../SheetsGroup';
import Spreadsheet from '../../Spreadsheet';
import { prefix } from '../../utils';
import styles from './Sheet.module.scss';
import { KonvaEventObject } from 'konva/lib/Node';
import Comment from './comment/Comment';
import CellRenderer, { Cell, CellId, getCellId } from './CellRenderer';
import { Text } from 'konva/lib/shapes/Text';
import { merge } from 'lodash';

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
  [index: number]: number;
}

export interface IRowColData {
  sizes: ISizes;
}

export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom';

export type TextWrap = 'wrap';

export type HorizontalTextAlign = 'left' | 'center' | 'right';

export type VerticalTextAlign = 'top' | 'middle' | 'bottom';

export interface ICellStyle {
  borders?: BorderStyle[];
  backgroundColor?: string;
  fontColor?: string;
  fontSize?: number;
  textWrap?: TextWrap;
  textFormatPattern?: string;
  underline?: boolean;
  strikeThrough?: boolean;
  bold?: boolean;
  italic?: boolean;
  horizontalTextAlign?: HorizontalTextAlign;
  verticalTextAlign?: VerticalTextAlign;
}

export interface ICellData {
  style?: ICellStyle;
  value?: string;
  comment?: string;
}

export interface IData {
  sheetName: string;
  frozenCells?: IFrozenCells;
  mergedCells?: IMergedCells[];
  cellsData?: ICellsData;
  row?: IRowColData;
  col?: IRowColData;
}

export interface ICellsData {
  [cellId: CellId]: ICellData;
}

export interface ISheetsData {
  [sheetId: SheetId]: IData;
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

export const getCellRectFromCell = (cell: Cell) => {
  const cellRect = cell.children?.find(
    (x) => x.attrs.type === 'cellRect'
  ) as Rect;

  return cellRect;
};

export const getCellTextFromCell = (cell: Cell) => {
  const text = cell.children?.find((x) => x.attrs.type === 'cellText') as Text;

  return text;
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
  cellRenderer: CellRenderer;
  shapes: IShapes;
  sheetDimensions: IDimensions;
  lastClickTime: number = new Date().getTime();
  cellEditor: CellEditor;
  rightClickMenu: RightClickMenu;
  comment: Comment;
  private spreadsheet: Spreadsheet;

  constructor(public sheetsGroup: SheetsGroup, public sheetId: SheetId) {
    this.sheetsGroup = sheetsGroup;
    this.sheetId = sheetId;
    this.spreadsheet = this.sheetsGroup.spreadsheet;

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
      sheetGroup.add(rowColGroup, cellGroup);
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

    this.spreadsheet.hyperformula.addSheet(sheetId);

    this.cellRenderer = new CellRenderer(this);
    this.col = new RowCol('col', this);
    this.row = new RowCol('row', this);

    this.col.setup();
    this.row.setup();

    this.merger = new Merger(this);
    this.selector = new Selector(this);
    this.rightClickMenu = new RightClickMenu(this);
    this.comment = new Comment(this);
    this.cellEditor = new CellEditor(this);

    this.shapes.sheet.on('click', this.sheetOnClick);
    this.stage.on('mousedown', this.stageOnClick);

    this.sheetEl.tabIndex = 1;
    this.sheetEl.addEventListener('keydown', this.keyHandler);

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

    this.selector.startSelection({ x: 0, y: 0 }, { x: 0, y: 0 });

    this.cellEditor = new CellEditor(this);
  }

  stageOnClick = () => {
    if (!this.cellEditor.getIsHidden()) {
      this.cellEditor.hide();
    }
  };

  sheetOnClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      const selectedFirstcell = this.selector.selectedFirstCell!;
      const id = selectedFirstcell.id();

      if (this.hasDoubleClickedOnCell()) {
        this.cellEditor.show(selectedFirstcell);
      }

      if (this.cellRenderer.getCellData(id)?.comment) {
        this.comment.show();
      }
    }
  };

  hasDoubleClickedOnCell() {
    const timeNow = new Date().getTime();
    const delayTime = 500;

    this.lastClickTime = timeNow;

    return (
      !this.selector.hasChangedCellSelection() &&
      timeNow <= this.lastClickTime + delayTime
    );
  }

  keyHandler = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Enter':
      case 'Escape': {
        this.cellEditor.hide();
        break;
      }
      case e.ctrlKey && 'z': {
        this.sheetsGroup.undo();
        break;
      }
      case e.ctrlKey && 'y': {
        this.sheetsGroup.redo();
        break;
      }
      case e.ctrlKey && 'c': {
        this.spreadsheet.clipboard.copy();
        break;
      }
      case e.ctrlKey && 'v': {
        this.spreadsheet.clipboard.paste();
        break;
      }
      default:
        if (this.cellEditor.getIsHidden() && !e.ctrlKey) {
          this.cellEditor.show(this.selector.selectedFirstCell!);
        }
    }
  };

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

    const width = this.col.totalSize + this.getViewportVector().x;
    const height = this.row.totalSize + this.getViewportVector().y;

    this.stage.width(width);
    this.stage.height(height);

    const context = this.layer.canvas.getContext();

    context.translate(0.5, 0.5);

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    // TODO: use scrollBar size instead of hardcoded value
    this.row.scrollBar.scrollBarEl.style.bottom = `${18}px`;
  }

  setSheetId(sheetId: SheetId) {
    this.spreadsheet.hyperformula.renameSheet(
      this.getHyperformulaSheetId(),
      sheetId
    );
    this.sheetId = sheetId;
  }

  setData(value: Partial<IData>) {
    const updatedData = merge({}, this.spreadsheet.data[this.sheetId], value);
    this.sheetsGroup.setSheetData(this.sheetId, updatedData);
  }

  getHyperformulaSheetId() {
    return this.spreadsheet.hyperformula.getSheetId(this.sheetId)!;
  }

  getData(): IData {
    return this.spreadsheet.data[this.sheetId];
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
        const mergedCells =
          this.merger.associatedMergedCellIdMap.get(existingCellId);

        if (mergedCells) {
          const { row, col } = mergedCells;

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

    this.cellEditor?.destroy();

    this.spreadsheet.hyperformula.removeSheet(this.getHyperformulaSheetId());
  }

  drawTopLeftOffsetRect() {
    this.scrollGroups.xySticky.add(this.shapes.topLeftRect);

    this.shapes.topLeftRect.moveToTop();
  }

  updateViewport() {
    this.updateSheetDimensions();
    this.cellRenderer.updateCells();
    this.row.updateViewport();
    this.col.updateViewport();
    this.cellRenderer.updateCellsStyles();
    this.selector.updateSelectedCells();
    this.spreadsheet.toolbar?.updateActiveStates();
    this.spreadsheet.formulaBar?.updateValue(
      this.selector.selectedFirstCell?.id() ?? ''
    );
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
