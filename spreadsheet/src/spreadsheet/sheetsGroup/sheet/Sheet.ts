import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Line } from 'konva/lib/shapes/Line';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import { performanceProperties } from '../../styles';
import Selector from './Selector';
import Merger, { IMergedCell, TopLeftMergedCellId } from './Merger';
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
import { isNil, merge } from 'lodash';
import { Shape } from 'konva/lib/Shape';
import events from '../../events';

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
  frozenLine: Line;
  topLeftRect: Rect;
}

export type SheetId = number;
export type SheetIndex = number;

export interface IFrozenCells {
  row?: number;
  col?: number;
}

export interface IMergedCells {
  [index: TopLeftMergedCellId]: IMergedCell;
}

export interface ISizes {
  [index: number]: number;
}

export interface IRowColData {
  sizes?: ISizes;
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

export interface ISheetData {
  sheetName: string;
  frozenCells?: IFrozenCells;
  mergedCells?: IMergedCells;
  cellsData?: ICellsData;
  row?: IRowColData;
  col?: IRowColData;
}

export interface ICellsData {
  [cellId: CellId]: ICellData;
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

export const getFrozenBackgroundFromScrollGroup = (scrollGroup: Group) => {
  const frozenBackground = getSheetGroupFromScrollGroup(
    scrollGroup
  ).children?.find((x) => x.attrs.type === 'frozenBackground') as Group;

  return frozenBackground;
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

export function* iterateRowColVector(vector: Vector2d) {
  for (let index = vector.x; index <= vector.y; index++) {
    yield index;
  }
}

export function* iterateXToY(vector: Vector2d) {
  for (let index = vector.x; index < vector.y; index++) {
    yield index;
  }
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
  isSaving = false;
  private spreadsheet: Spreadsheet;

  constructor(
    public sheetsGroup: SheetsGroup,
    public sheetId: SheetId,
    public sheetIndex: SheetIndex
  ) {
    this.sheetsGroup = sheetsGroup;
    this.sheetId = sheetId;
    this.sheetIndex = sheetIndex;
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

    Object.keys(this.scrollGroups).forEach((key) => {
      const scrollGroup =
        this.scrollGroups[key as keyof typeof this.scrollGroups];

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

      const frozenBackground = new Rect({
        ...performanceProperties,
        type: 'frozenBackground',
        fill: 'white',
        visible: false,
      });

      if (key !== 'main') {
        sheetGroup.add(frozenBackground);
      }

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
      frozenLine: new Line({
        ...this.spreadsheet.styles.frozenLine,
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

    this.shapes.frozenLine.cache();

    Object.values(this.scrollGroups).forEach((group) => {
      this.layer.add(group);
    });

    this.cellRenderer = new CellRenderer(this);
    this.col = new RowCol('col', this);
    this.row = new RowCol('row', this);

    this.col.setup();
    this.row.setup();

    this.merger = new Merger(this);
    this.selector = new Selector(this);
    this.rightClickMenu = new RightClickMenu(this);
    this.comment = new Comment(this);

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

    const width = this.col.totalSize + this.getViewportVector().x;
    const height = this.row.totalSize + this.getViewportVector().y;

    this.stage.width(width);
    this.stage.height(height);

    const context = this.layer.canvas.getContext();

    context.translate(0.5, 0.5);

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    this.col.scrollBar.setYIndex();
    this.row.scrollBar.setYIndex();

    this.updateViewport();

    // TODO: use scrollBar size instead of hardcoded value
    this.row.scrollBar.scrollBarEl.style.bottom = `${18}px`;

    this.selector.startSelection({ x: 0, y: 0 }, { x: 0, y: 0 });

    this.cellEditor = new CellEditor(this);
  }

  stageOnClick = () => {
    if (!this.cellEditor.getIsHidden()) {
      this.cellEditor.saveContentToCell();
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
        this.comment.show(id);
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
      case 'Escape': {
        break;
      }
      case e.ctrlKey && 'z': {
        this.spreadsheet.undo();
        break;
      }
      case e.ctrlKey && 'y': {
        this.spreadsheet.redo();
        break;
      }
      case e.ctrlKey && 'x': {
        this.spreadsheet.clipboard.cut();
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

  isShapeOutsideOfViewport(shape: Group | Shape, margin?: Partial<Vector2d>) {
    return !shape.isClientRectOnScreen({
      x: -(this.getViewportVector().x + (margin?.x ?? 0)),
      y: -(this.getViewportVector().y + (margin?.y ?? 0)),
    });
  }

  setData(value: Partial<ISheetData>, addToHistory: boolean = true) {
    const updatedData = merge({}, this.getData(), value);

    if (value.frozenCells) {
      const frozenCells = updatedData.frozenCells!;

      if (!isNil(frozenCells.row)) {
        if (frozenCells.row < 0) {
          delete frozenCells.row;
        }
      }

      if (!isNil(frozenCells.col)) {
        if (frozenCells.col < 0) {
          delete frozenCells.col;
        }
      }

      if (isNil(frozenCells.row) && isNil(frozenCells.col)) {
        delete updatedData.frozenCells;
      }
    }

    if (value.mergedCells) {
      Object.keys(value.mergedCells).forEach((topLeftCellId) => {
        const mergedCell = value.mergedCells![topLeftCellId];

        if (mergedCell.col.x < 0) {
          mergedCell.col.x = 0;
        }

        if (mergedCell.row.x < 0) {
          mergedCell.row.x = 0;
        }

        const newTopLeftCellId = getCellId(mergedCell.row.x, mergedCell.col.x);

        delete updatedData.mergedCells![topLeftCellId];

        updatedData.mergedCells![newTopLeftCellId] = mergedCell;

        if (
          mergedCell.col.x >= mergedCell.col.y &&
          mergedCell.row.x >= mergedCell.row.y
        ) {
          delete updatedData.mergedCells![newTopLeftCellId];
        }
      });
    }

    if (addToHistory) {
      this.spreadsheet.addToHistory();
    }

    this.spreadsheet.data[this.sheetsGroup.sheetsGroupId].sheetData[
      this.sheetIndex
    ] = updatedData;

    const done = () => {
      this.isSaving = false;
      this.updateViewport();
    };

    this.isSaving = true;

    this.spreadsheet.eventEmitter.emit(
      events.sheet.setData,
      this,
      updatedData,
      done
    );
  }

  getData(): ISheetData {
    return this.sheetsGroup.getData().sheetData[this.sheetIndex];
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

    for (const ri of iterateRowColVector(rowIndexes)) {
      for (const ci of iterateRowColVector(colIndexes)) {
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

    const rows = this.row.convertFromRangeToRowCols(rowIndexes);
    const cols = this.col.convertFromRangeToRowCols(colIndexes);

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

    this.spreadsheet.hyperformula?.removeSheet(this.sheetId);
  }

  drawTopLeftOffsetRect() {
    this.scrollGroups.xySticky.add(this.shapes.topLeftRect);

    this.shapes.topLeftRect.moveToTop();
  }

  updateFrozenBackgrounds() {
    const frozenCells = this.getData().frozenCells;
    const xStickyFrozenBackground = getFrozenBackgroundFromScrollGroup(
      this.scrollGroups.xSticky
    );
    const yStickyFrozenBackground = getFrozenBackgroundFromScrollGroup(
      this.scrollGroups.ySticky
    );
    const xyStickyFrozenBackground = getFrozenBackgroundFromScrollGroup(
      this.scrollGroups.xySticky
    );

    if (frozenCells && this.row.frozenLine && this.col.frozenLine) {
      const colClientRect = this.col.frozenLine.getClientRect({
        skipStroke: true,
      });
      const rowClientRect = this.row.frozenLine.getClientRect({
        skipStroke: true,
      });

      colClientRect.x -= this.getViewportVector().x;
      rowClientRect.y -= this.getViewportVector().y;

      xStickyFrozenBackground.width(colClientRect.x);
      xStickyFrozenBackground.height(this.sheetDimensions.height);
      xStickyFrozenBackground.y(rowClientRect.y);

      yStickyFrozenBackground.width(this.sheetDimensions.width);
      yStickyFrozenBackground.height(rowClientRect.y);
      yStickyFrozenBackground.x(colClientRect.x);

      xyStickyFrozenBackground.width(colClientRect.x);
      xyStickyFrozenBackground.height(rowClientRect.y);

      xStickyFrozenBackground.show();
      yStickyFrozenBackground.show();
      xyStickyFrozenBackground.show();
    } else {
      xStickyFrozenBackground.hide();
      yStickyFrozenBackground.hide();
      xyStickyFrozenBackground.hide();
    }
  }

  updateViewport() {
    this.updateSheetDimensions();
    this.row.updateViewport();
    this.col.updateViewport();
    this.cellRenderer.updateViewport();
    this.selector.updateSelectedCells();
    this.spreadsheet.toolbar?.updateActiveStates();
    this.spreadsheet.formulaBar?.updateValue(
      this.selector.selectedFirstCell?.id() ?? ''
    );
    this.updateFrozenBackgrounds();
  }
}

export default Sheet;
