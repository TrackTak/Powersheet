import { Line } from 'konva/lib/shapes/Line';
import { Vector2d } from 'konva/lib/types';

import ScrollBar from './scrollBars/ScrollBar';
import Spreadsheet from '../../Spreadsheet';

import { isNil } from 'lodash';
import RangeSimpleCellAddress from '../cells/cell/RangeSimpleCellAddress';
import Sheet from '../Sheet';
import RowCol from './rowCol/RowCol';
import Resizer from './rowCol/Resizer';

export type RowColType = 'row' | 'col';

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

export type HeaderGroupId = number;

export type RowColIndex = number;

class RowCols {
  scrollBar: ScrollBar;
  rowColMap: Map<RowColIndex, RowCol>;
  totalSize: number;
  frozenLine?: Line;
  functions: IRowColFunctions;
  oppositeType: RowColType;
  oppositeFunctions: IRowColFunctions;
  isCol: boolean;
  spreadsheet: Spreadsheet;
  resizer: Resizer;

  constructor(public type: RowColType, public sheet: Sheet) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.rowColMap = new Map();

    this.totalSize = 0;

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
    }

    this.resizer = new Resizer(this);
    this.scrollBar = new ScrollBar(this);
  }

  destroy() {
    this.scrollBar.destroy();
  }

  getSize(index: number) {
    return (
      this.spreadsheet.data.getSheetData()[this.type]?.sizes?.[index] ??
      this.spreadsheet.options[this.type].defaultSize
    );
  }

  updateViewportSize() {
    this.scrollBar.setYIndex();

    let sumOfSizes = 0;

    for (const index of this.scrollBar.sheetViewportPosition.iterateFromXToY()) {
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

  getRowColsFromRangeSimpleCellAddress(
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    const rowCols: RowCol[] = [];

    for (const index of rangeSimpleCellAddress.iterateFromTopToBottom(
      this.type
    )) {
      const rowCol = this.rowColMap.get(index);

      if (rowCol) {
        rowCols.push(rowCol);
      }
    }

    return rowCols;
  }

  getTotalSize() {
    const sizes = Object.keys(
      this.spreadsheet.data.getSheetData()[this.type]?.sizes ?? {}
    );

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

  destroyOutOfViewportItems() {
    for (const [key, rowCol] of this.rowColMap) {
      if (this.sheet.isShapeOutsideOfViewport(rowCol.headerGroup)) {
        rowCol.destroy();

        this.rowColMap.delete(key);
      }
    }
  }

  // forceDraw is turned off for scrolling for performance
  drawViewport(forceDraw = false) {
    const data = this.spreadsheet.data.getSheetData();

    if (data.frozenCells) {
      const frozenCell = data.frozenCells[this.type];

      if (!isNil(frozenCell)) {
        for (let index = 0; index <= frozenCell; index++) {
          this.draw(index, forceDraw);
        }
      }
    }

    for (const index of this.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      this.draw(index, forceDraw);
    }
  }

  updateViewport() {
    this.rowColMap.clear();
    this.drawViewport(true);

    this.scrollBar.setScrollSize();
  }

  *getSizeForFrozenCell(type: RowColType = this.type) {
    const { frozenCells } = this.spreadsheet.data.getSheetData();
    const frozenCell = frozenCells?.[type];

    if (isNil(frozenCell)) return null;

    let size = 0;

    for (let index = 0; index <= frozenCell; index++) {
      size += this.getSize(index);

      yield { size, index };
    }

    return size;
  }

  getTopBottomIndexFromPosition(position: Vector2d) {
    let sheetViewportStartYIndex = this.scrollBar.sheetViewportPosition.x;

    let topIndex = null;
    let bottomIndex = null;

    for (const { size, index } of this.getSizeForFrozenCell()) {
      if (topIndex === null && position.x <= size) {
        topIndex = index;
      }

      if (bottomIndex === null && position.y <= size) {
        bottomIndex = index;
      }
    }

    if (topIndex === null) {
      topIndex = this.calculateSheetViewportEndPosition(
        position.x,
        sheetViewportStartYIndex
      );
    }

    if (bottomIndex === null) {
      bottomIndex = this.calculateSheetViewportEndPosition(
        position.y,
        sheetViewportStartYIndex
      );
    }

    return {
      topIndex,
      bottomIndex,
    };
  }

  private getShouldDraw = (index: number, forceDraw: boolean) => {
    const rowColAlreadyExists = !!this.rowColMap.get(index);

    return forceDraw || !rowColAlreadyExists;
  };

  draw(index: number, forceDraw: boolean) {
    if (!this.getShouldDraw(index, forceDraw)) return;

    if (index < this.spreadsheet.options[this.type].amount) {
      const existingRowCol = this.rowColMap.get(index);

      existingRowCol?.destroy();

      const rowCol = new RowCol(this, index);

      if (rowCol.getIsLastFrozen()) {
        rowCol.gridLine.setAttrs(this.spreadsheet.styles[this.type].frozenLine);

        this.frozenLine = rowCol.gridLine;

        this.sheet.scrollGroups.xySticky.sheetGroup.add(this.frozenLine);
      }

      this.rowColMap.set(index, rowCol);
    }
  }
}

export default RowCols;
