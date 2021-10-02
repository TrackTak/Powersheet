import { Group } from 'konva/lib/Group';
import { ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import Sheet, {
  centerRectTwoInRectOne,
  iterateRowColVector,
  iterateXToY,
} from './Sheet';
import Resizer from './Resizer';
import ScrollBar from './scrollBars/ScrollBar';
import Spreadsheet from '../Spreadsheet';
import {
  Cell,
  CellId,
  convertFromCellIdToRowColId,
  convertFromCellsToMinMax,
  getCellId,
} from './CellRenderer';
import { isNil } from 'lodash';

interface IShapes {
  headerGroup: Group;
  headerRect: Rect;
  headerText: Text;
  gridLine: Line;
}

export type RowColType = 'row' | 'col';

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

export type HeaderGroupId = number;

export type RowColGroupId = number;

export const getGridLineFromRowColGroup = (group: Group) => {
  const gridLine = group.children?.find(
    (x) => x.attrs.type === 'gridLine'
  ) as Line;

  return gridLine;
};

export const getHeaderRectFromHeader = (group: Group) => {
  const headerRect = group.children?.find(
    (x) => x.attrs.type === 'headerRect'
  ) as Line;

  return headerRect;
};

class RowCol {
  resizer: Resizer;
  scrollBar: ScrollBar;
  headerGroupMap: Map<HeaderGroupId, Group>;
  rowColMap: Map<RowColGroupId, Line>;
  xFrozenRowColMap = new Map<RowColGroupId, Line>();
  yFrozenRowColMap = new Map<RowColGroupId, Line>();
  xyFrozenRowColMap = new Map<RowColGroupId, Line>();
  totalSize: number;
  shapes: IShapes;
  frozenLine?: Line;
  getHeaderText: (index: number) => string;
  private getLinePoints: (size: number) => number[];
  private functions: IRowColFunctions;
  private oppositeType: RowColType;
  private oppositeFunctions: IRowColFunctions;
  private isCol: boolean;
  private spreadsheet: Spreadsheet;

  constructor(private type: RowColType, private sheet: Sheet) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.headerGroupMap = new Map();
    this.rowColMap = new Map();

    this.totalSize = 0;
    this.shapes = {
      headerRect: new Rect({
        type: 'headerRect',
      }),
      headerGroup: new Group(),
      headerText: new Text(),
      gridLine: new Line({
        ...this.spreadsheet.styles.gridLine,
        type: 'gridLine',
      }),
    };
    if (this.isCol) {
      this.oppositeType = 'row';
      this.functions = {
        axis: 'x',
        size: 'width',
      };
      this.oppositeFunctions = {
        axis: 'y',
        size: 'height',
      };
      this.shapes.headerText.setAttrs(this.spreadsheet.styles.colHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.spreadsheet.styles.colHeader.rect,
        width: this.spreadsheet.options[this.type].defaultSize,
      });
      this.getHeaderText = (index) => {
        const startCharCode = 'A'.charCodeAt(0);
        const letter = String.fromCharCode(startCharCode + index);
        return letter;
      };
      this.getLinePoints = (height: number) => {
        return [0, 0, 0, height];
      };
    } else {
      this.oppositeType = 'col';
      this.functions = {
        axis: 'y',
        size: 'height',
      };
      this.oppositeFunctions = {
        axis: 'x',
        size: 'width',
      };
      this.shapes.headerText.setAttrs(this.spreadsheet.styles.rowHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.spreadsheet.styles.rowHeader.rect,
        height: this.spreadsheet.options[this.type].defaultSize,
      });
      this.getHeaderText = (index) => {
        return (index + 1).toString();
      };
      this.getLinePoints = (width: number) => {
        return [0, 0, width, 0];
      };
    }

    this.scrollBar = new ScrollBar(
      this.sheet,
      this.type,
      this.isCol,
      this.functions
    );

    this.resizer = new Resizer(sheet, this.type, this.isCol, this.functions);

    this.shapes.headerRect.cache();
    this.shapes.gridLine.cache();
  }

  updateViewportSize() {
    this.scrollBar.setYIndex();

    let sumOfSizes = 0;

    for (
      let index = this.scrollBar.sheetViewportPosition.x;
      index < this.scrollBar.sheetViewportPosition.y;
      index++
    ) {
      sumOfSizes += this.getSize(index);
    }

    this.totalSize = sumOfSizes;
  }

  calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number
  ) => {
    let sumOfSizes = 0;
    let i = sheetViewportStartYIndex;

    const getSize = () => {
      return this.getSize(i);
    };

    while (sumOfSizes + getSize() < sheetViewportDimensionSize) {
      sumOfSizes += getSize();
      i += 1;
    }

    return i;
  };

  destroy() {
    this.scrollBar.destroy();
    this.resizer.destroy();
  }

  convertFromCellsToRange(cells: Cell[]) {
    const { min, max } = convertFromCellsToMinMax(
      cells,
      (cell) => cell.attrs[this.type].x,
      (cell) => cell.attrs[this.type].y
    );

    return {
      x: min,
      y: max,
    };
  }

  convertFromRangeToRowCols(vector: Vector2d) {
    const rowCols: Group[] = [];

    for (const index of iterateRowColVector(vector)) {
      const rowCol = this.sheet[this.type].headerGroupMap.get(index);

      if (rowCol) {
        rowCols.push(rowCol);
      }
    }

    return rowCols;
  }

  getTotalSize() {
    const sizes = Object.keys(this.sheet.getData()[this.type]?.sizes ?? {});

    const totalSizeDifference = sizes.reduce((currentSize, key) => {
      const index = parseInt(key, 10);
      const size = this.getSize(index);

      return (
        size - this.spreadsheet.options[this.type].defaultSize + currentSize
      );
    }, 0);

    const totalSize =
      this.spreadsheet.options[this.type].amount *
        this.spreadsheet.options[this.type].defaultSize +
      totalSizeDifference;

    return totalSize;
  }

  setSizeData(index: number, size: number) {
    this.sheet.setData({
      [this.type]: {
        sizes: {
          [index]: size,
        },
      },
    });
  }

  private moveData(
    index: number,
    amount: number,
    hyperformulaColumnFunctionName: 'addColumns' | 'removeColumns',
    hyperformulaRowFunctionName: 'addRows' | 'removeRows',
    modifyCallback: (value: number, amount: number) => number,
    sizesCallback: (sizeIndex: number) => void,
    cellsDataCallback: (cellId: CellId) => void,
    comparer?: (a: string, b: string) => number
  ) {
    const data = this.sheet.getData();
    const { frozenCells, mergedCells, cellsData } = data;
    const sizes = data[this.type]?.sizes!;

    if (this.getIsFrozen(index)) {
      frozenCells![this.type] = modifyCallback(
        frozenCells![this.type]!,
        amount
      );
    }

    if (data[this.type]?.sizes) {
      Object.keys(sizes)
        .sort(comparer)
        .forEach((key) => {
          const sizeIndex = parseInt(key, 10);

          sizesCallback(sizeIndex);
        });
    }

    if (mergedCells) {
      Object.keys(mergedCells)
        .sort(comparer)
        .forEach((topLeftCellId) => {
          const mergedCell = mergedCells[topLeftCellId];

          if (mergedCell[this.type].x > index) {
            mergedCell[this.type].x = modifyCallback(
              mergedCell[this.type].x,
              amount
            );
          }

          if (mergedCell[this.type].y >= index) {
            mergedCell[this.type].y = modifyCallback(
              mergedCell[this.type].y,
              amount
            );
          }
        });
    }

    if (cellsData) {
      Object.keys(cellsData)
        .sort(comparer)
        .forEach((cellId) => {
          cellsDataCallback(cellId);
        });
    }

    if (this.isCol) {
      this.spreadsheet.hyperformula?.[hyperformulaColumnFunctionName](
        this.sheet.sheetId,
        [index, amount]
      );
    } else {
      this.spreadsheet.hyperformula?.[hyperformulaRowFunctionName](
        this.sheet.sheetId,
        [index, amount]
      );
    }

    this.sheet.setData({
      [this.type]: {
        sizes,
      },
      frozenCells,
      mergedCells,
      cellsData,
    });

    this.sheet.updateViewport();
  }

  insert(index: number, amount: number) {
    const { cellsData, ...data } = this.sheet.getData();
    const modifyCallback = (value: number, amount: number) => {
      return value + amount;
    };

    this.moveData(
      index,
      amount,
      'addColumns',
      'addRows',
      modifyCallback,
      (sizeIndex) => {
        const sizes = data[this.type]?.sizes!;
        const size = sizes[sizeIndex];

        if (sizeIndex >= index) {
          const newIndex = modifyCallback(sizeIndex, amount);

          sizes[newIndex] = size;

          delete sizes[sizeIndex];
        }
      },
      (cellId) => {
        const rowCol = convertFromCellIdToRowColId(cellId);

        if (rowCol[this.type] >= index) {
          const params: [number, number] = this.isCol
            ? [rowCol.row, modifyCallback(rowCol.col, amount)]
            : [modifyCallback(rowCol.row, amount), rowCol.col];

          const newCellId = getCellId(...params);

          cellsData![newCellId] = cellsData![cellId];

          this.sheet.cellRenderer.deleteCellData(cellId);
        }
      },
      (a, b) => {
        return b.localeCompare(a);
      }
    );
  }

  delete(index: number, amount: number) {
    const { cellsData, ...data } = this.sheet.getData();
    const modifyCallback = (value: number, amount: number) => {
      return value - amount;
    };

    this.moveData(
      index,
      amount,
      'removeColumns',
      'removeRows',
      modifyCallback,
      (sizeIndex) => {
        const sizes = data[this.type]?.sizes!;
        const size = sizes[sizeIndex];

        if (sizeIndex < index) return;

        if (sizeIndex > index) {
          const newIndex = modifyCallback(sizeIndex, amount);

          sizes[newIndex] = size;
        }

        delete sizes[sizeIndex];
      },
      (cellId) => {
        const rowCol = convertFromCellIdToRowColId(cellId);

        if (rowCol[this.type] < index) return;

        if (rowCol[this.type] > index) {
          const params: [number, number] = this.isCol
            ? [rowCol.row, modifyCallback(rowCol.col, amount)]
            : [modifyCallback(rowCol.row, amount), rowCol.col];

          const newCellId = getCellId(...params);

          cellsData![newCellId] = cellsData![cellId];
        }

        this.sheet.cellRenderer.deleteCellData(cellId);
      }
    );
  }

  getSize(index: number) {
    let size =
      this.sheet.getData()[this.type]?.sizes?.[index] ??
      this.spreadsheet.options[this.type].defaultSize;

    return size;
  }

  private clearAll() {
    this.xFrozenRowColMap.clear();
    this.yFrozenRowColMap.clear();
    this.xyFrozenRowColMap.clear();
    this.headerGroupMap.clear();
    this.rowColMap.clear();
  }

  destroyOutOfViewportItems() {
    for (const [key, rowCol] of this.rowColMap) {
      if (this.sheet.isShapeOutsideOfViewport(rowCol)) {
        rowCol.destroy();

        this.rowColMap.delete(key);
      }
    }

    for (const [key, header] of this.headerGroupMap) {
      if (this.sheet.isShapeOutsideOfViewport(header)) {
        header.destroy();

        this.headerGroupMap.delete(key);
      }
    }
  }

  // forceDraw is turned off for scrolling for performance
  drawViewport(forceDraw = false) {
    const getShouldDraw = (index: number) => {
      const rowColAlreadyExists =
        this.headerGroupMap.get(index) && this.rowColMap.get(index);

      return forceDraw || !rowColAlreadyExists;
    };

    const data = this.sheet.getData();

    if (data.frozenCells) {
      const frozenCell = data.frozenCells[this.type];

      if (!isNil(frozenCell)) {
        for (let index = 0; index <= frozenCell; index++) {
          if (getShouldDraw(index)) {
            this.draw(index);
          }
        }
      }
    }

    for (const index of iterateXToY(this.scrollBar.sheetViewportPosition)) {
      if (getShouldDraw(index)) {
        this.draw(index);
      }
    }
  }

  updateViewport() {
    this.clearAll();
    this.drawViewport(true);

    this.scrollBar.setScrollSize();
  }

  *getSizeForFrozenCell(type: RowColType) {
    const { frozenCells } = this.sheet.getData();
    const frozenCell = frozenCells?.[type];

    if (isNil(frozenCell)) return null;

    let size = 0;

    for (let index = 0; index <= frozenCell; index++) {
      size += this.getSize(index);

      yield { size, index };
    }

    return size;
  }

  getIndexesBetweenVectors(position: Vector2d) {
    let sheetViewportStartYIndex = this.scrollBar.sheetViewportPosition.x;

    const indexes = {
      x: this.calculateSheetViewportEndPosition(
        position.x,
        sheetViewportStartYIndex
      ),
      y: this.calculateSheetViewportEndPosition(
        position.y,
        sheetViewportStartYIndex
      ),
    };

    let xIndex = null;
    let yIndex = null;

    for (const { size, index } of this.getSizeForFrozenCell(this.type)) {
      if (xIndex === null && position.x <= size) {
        xIndex = index;
      }

      if (yIndex === null && position.y <= size) {
        yIndex = index;
      }
    }

    if (xIndex !== null) {
      indexes.x = xIndex;
    }

    if (yIndex !== null) {
      indexes.y = yIndex;
    }

    return indexes;
  }

  getIsFrozen(index: number) {
    const data = this.sheet.getData();
    const frozenCell = data.frozenCells?.[this.type];

    return isNil(frozenCell) ? false : index <= frozenCell;
  }

  getIsLastFrozen(index: number) {
    return index === this.sheet.getData().frozenCells?.[this.type];
  }

  draw(index: number) {
    if (index < this.spreadsheet.options[this.type].amount) {
      this.drawHeader(index);
      this.drawGridLine(index);
      this.drawFrozenGridLine(index);
    }
  }

  getAxisAtIndex(index: number) {
    const data = this.sheet.getData();
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;

    let totalPreviousCustomSizeDifferences =
      this.scrollBar.totalPreviousCustomSizeDifferences;

    for (let i = this.scrollBar.sheetViewportPosition.x; i < index; i++) {
      const size = data[this.type]?.sizes?.[i];

      if (size) {
        totalPreviousCustomSizeDifferences += size - defaultSize;
      }
    }

    const axis =
      this.spreadsheet.options[this.type].defaultSize * index +
      totalPreviousCustomSizeDifferences +
      this.sheet.getViewportVector()[this.functions.axis];

    return axis;
  }

  private drawHeader(index: number) {
    if (this.headerGroupMap.has(index)) {
      this.headerGroupMap.get(index)!.destroy();
    }

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: this.getSize(index),
      [this.functions.axis]: this.getAxisAtIndex(index),
    };
    const headerGroup = this.shapes.headerGroup.clone(groupConfig) as Group;
    const header = this.getHeader(index);
    const resizeLine = this.getResizeLine(index);
    const isFrozen = this.getIsFrozen(index);

    headerGroup.add(header.rect, header.text, resizeLine);
    headerGroup.setAttr('isFrozen', isFrozen);

    this.headerGroupMap.set(index, headerGroup);

    if (isFrozen) {
      this.sheet.scrollGroups.xySticky.headerGroup.add(headerGroup);
    } else {
      if (this.isCol) {
        this.sheet.scrollGroups.ySticky.headerGroup.add(headerGroup);
      } else {
        this.sheet.scrollGroups.xSticky.headerGroup.add(headerGroup);
      }
    }
  }

  private getHeader(index: number) {
    const size = this.getSize(index);
    const rectConfig: RectConfig = {
      [this.functions.size]: size,
    };
    const rect = this.shapes.headerRect.clone(rectConfig) as Rect;
    const text = new Text({
      text: this.getHeaderText(index),
    });

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
    };
  }

  private getGridLine(index: number, lineConfig: LineConfig) {
    const headerGroup = this.headerGroupMap.get(index)!;
    const mergedLineConfig: LineConfig = {
      index,
      [this.functions.axis]:
        headerGroup[this.functions.axis]() +
        headerGroup[this.functions.size]() -
        this.sheet.getViewportVector()[this.functions.axis],
      ...lineConfig,
    };

    const gridLine = this.shapes.gridLine.clone(mergedLineConfig) as Line;

    return gridLine;
  }

  private getFrozenGridLine(
    index: number,
    rowColGroup: Group,
    map: Map<number, Line>,
    getLine: (size: number) => Line
  ) {
    let size = 0;

    for (const value of this.sheet[this.oppositeType].getSizeForFrozenCell(
      this.oppositeType
    )) {
      size = value.size;
    }

    const line = getLine(size);

    rowColGroup.add(line);

    map.set(index, line);
  }

  private drawXRowFrozenGridLine(index: number, frozenCell: number) {
    if (!this.isCol && index > frozenCell) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xSticky.rowColGroup,
        this.xFrozenRowColMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawXColFrozenGridLine(index: number, frozenCell: number) {
    if (this.isCol && index < frozenCell) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xSticky.rowColGroup,
        this.xFrozenRowColMap,
        (size) =>
          this.getGridLine(index, {
            y: size,
            points: this.getLinePoints(this.sheet.sheetDimensions.height),
          })
      );
    }
  }

  private drawYRowFrozenGridLine(index: number, frozenCell: number) {
    if (!this.isCol && index < frozenCell) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.ySticky.rowColGroup,
        this.yFrozenRowColMap,
        (size) =>
          this.getGridLine(index, {
            x: size,
            points: this.getLinePoints(this.sheet.sheetDimensions.width),
          })
      );
    }
  }

  private drawYColFrozenGridLine(index: number, frozenCell: number) {
    if (this.isCol && index > frozenCell) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.ySticky.rowColGroup,
        this.yFrozenRowColMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawXYFrozenGridLine(index: number, frozenCell: number) {
    if (index < frozenCell) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xySticky.rowColGroup,
        this.xyFrozenRowColMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawFrozenGridLine(index: number) {
    const { frozenCells } = this.sheet.getData();
    const frozenRow = frozenCells?.row;
    const frozenCol = frozenCells?.col;

    if (!isNil(frozenRow)) {
      this.drawXRowFrozenGridLine(index, frozenRow);
      this.drawYRowFrozenGridLine(index, frozenRow);
    }

    if (!isNil(frozenCol)) {
      this.drawXColFrozenGridLine(index, frozenCol);
      this.drawYColFrozenGridLine(index, frozenCol);
    }

    if (!isNil(!frozenRow) && !isNil(!frozenCol)) {
      const frozenCell = frozenCells?.[this.type];

      this.drawXYFrozenGridLine(index, frozenCell!);
    }
  }

  private drawGridLine(index: number) {
    if (this.rowColMap.has(index)) {
      this.rowColMap.get(index)!.destroy();
    }

    const isLastFrozen = this.getIsLastFrozen(index);

    const sheetSize =
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis];

    const line = this.getGridLine(index, {
      points: this.getLinePoints(sheetSize),
    });

    this.rowColMap.set(index, line);

    if (isLastFrozen) {
      line.setAttrs(this.spreadsheet.styles.frozenLine);

      this.frozenLine = line;

      this.sheet.scrollGroups.xySticky.sheetGroup.add(line);
    } else {
      this.sheet.scrollGroups.main.rowColGroup.add(line);
    }
  }

  private getResizeLine(index: number) {
    const size = this.getSize(index);
    const lineConfig: LineConfig = {
      [this.functions.axis]: size,
    };
    const clone = this.resizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }
}

export default RowCol;
