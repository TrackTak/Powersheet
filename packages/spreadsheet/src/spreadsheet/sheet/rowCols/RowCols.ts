import { Line } from 'konva/lib/shapes/Line';
import { Vector2d } from 'konva/lib/types';

import ScrollBar from './scrollBars/ScrollBar';
import Spreadsheet from '../../Spreadsheet';

import { isNil } from 'lodash';
import Sheet from '../Sheet';
import RowCol from './rowCol/RowCol';
import Resizer from './rowCol/Resizer';
import RowColAddress, { SheetRowColId } from '../cells/cell/RowColAddress';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { centerRectTwoInRectOne } from '../../utils';
import { Group } from 'konva/lib/Group';

export type RowColType = 'row' | 'col';
export type RowColsType = 'rows' | 'cols';

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

export type HeaderGroupId = number;

export type RowColId = number;

class RowCols {
  scrollBar: ScrollBar;
  rowColMap: Map<RowColId, RowCol>;
  totalSize: number;
  frozenLine?: Line;
  functions: IRowColFunctions;
  oppositeType: RowColType;
  oppositeFunctions: IRowColFunctions;
  isCol: boolean;
  spreadsheet: Spreadsheet;
  resizer: Resizer;
  pluralType: RowColsType;
  cachedHeaderGroup: Group;
  cachedGridLine: Line;
  cachedRowCols: Group[] = [];

  constructor(public type: RowColType, public sheet: Sheet) {
    this.type = type;
    this.pluralType = `${this.type}s`;
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

    const headerRect = new Rect({
      ...this.spreadsheet.styles[this.type].headerRect,
      [this.functions.size]: this.spreadsheet.options[this.type].defaultSize,
    });

    const headerText = new Text(this.spreadsheet.styles[this.type].headerText);

    const headerTextMidPoints = centerRectTwoInRectOne(
      headerRect.getClientRect(),
      headerText.getClientRect()
    );

    headerText.position(headerTextMidPoints);
    headerText.size(headerRect.size());

    const headerResizeLine = new Line({
      ...this.spreadsheet.styles[this.type].resizeLine,
      points: this.isCol
        ? [0, 0, 0, this.sheet.getViewportVector().y]
        : [0, 0, this.sheet.getViewportVector().x, 0],
    });

    this.cachedHeaderGroup = new Group();

    this.cachedHeaderGroup.add(headerRect, headerText, headerResizeLine);

    this.cachedHeaderGroup.cache();

    this.cachedGridLine = new Line({
      ...this.spreadsheet.styles[this.type].gridLine,
      points: this.getLinePoints(this.getSheetSize()),
    }).cache();
  }

  setCachedRowCols() {
    const sheetRowColAddressesForCache: RowColAddress[] = [];

    for (const index of this.sheet[
      this.pluralType
    ].scrollBar.sheetViewportPosition.iterateFromXToY()) {
      sheetRowColAddressesForCache.push(
        new RowColAddress(this.sheet.sheetId, index)
      );
    }

    const rowColsToDestroy = Array.from(this.rowColMap).filter(([index]) => {
      return sheetRowColAddressesForCache.every(
        (rowColAddress) => rowColAddress.rowCol !== index
      );
    });

    rowColsToDestroy.forEach(([rowColId, rowCol]) => {
      rowCol.destroy();
      this.rowColMap.delete(rowColId);
    });

    sheetRowColAddressesForCache.forEach((rowColAddress) => {
      if (this.rowColMap.has(rowColAddress.rowCol)) {
        return;
      }

      const clonedHeaderGroup = this.cachedHeaderGroup.clone();

      this.cachedRowCols.push(clonedHeaderGroup);

      const stickyGroup = this.getStickyGroupCellBelongsTo(simpleCellAddress);

      this.sheet.scrollGroups[stickyGroup].cellGroup.add(clonedCellGroup);

      this.setStyleableCells(simpleCellAddress);
    });
  }

  private getSheetSize() {
    return (
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis]
    );
  }

  getLinePoints = (size: number) => {
    return this.isCol ? [0, 0, 0, size] : [0, 0, size, 0];
  };

  destroy() {
    this.scrollBar.destroy();
  }

  getAxis(index: number) {
    const data = this.spreadsheet.data.spreadsheetData;
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;
    const rowCols = data.sheets?.[this.sheet.sheetId][this.pluralType];

    let totalPreviousCustomSizeDifferences = 0;

    for (const key in rowCols) {
      const sheetRowColId = key as SheetRowColId;
      const sheetRowColAddress =
        RowColAddress.sheetRowColIdToAddress(sheetRowColId);
      const rowCol = data[this.pluralType]![sheetRowColId];

      if (sheetRowColAddress.rowCol >= index) break;

      totalPreviousCustomSizeDifferences += rowCol?.size - defaultSize;
    }

    const axis =
      defaultSize * index +
      totalPreviousCustomSizeDifferences +
      this.sheet.getViewportVector()[this.functions.axis];

    return axis;
  }

  getSize(index: number) {
    const sheetRowColId = new RowColAddress(
      this.sheet.sheetId,
      index
    ).toSheetRowColId();
    const size =
      this.spreadsheet.data.spreadsheetData[this.pluralType]?.[sheetRowColId]
        ?.size;

    return size ?? this.spreadsheet.options[this.type].defaultSize;
  }

  getIsLastFrozen(index: number) {
    return (
      index ===
      this.spreadsheet.data.spreadsheetData.frozenCells?.[this.sheet.sheetId]?.[
        this.type
      ]
    );
  }

  getIsFrozen(index: number) {
    const data = this.spreadsheet.data.spreadsheetData;
    const frozenCell = data.frozenCells?.[this.sheet.sheetId]?.[this.type];

    return isNil(frozenCell) ? false : index <= frozenCell;
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

  getTotalSize() {
    const rowCols = Object.keys(
      this.spreadsheet.data.spreadsheetData[this.pluralType] ?? {}
    );

    const totalSizeDifference = rowCols.reduce((currentSize, key) => {
      const sheetRowColId = key as SheetRowColId;
      const rowColAddress = RowColAddress.sheetRowColIdToAddress(sheetRowColId);
      const size = this.getSize(rowColAddress.rowCol);

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
    const data = this.spreadsheet.data.spreadsheetData;

    const frozenCell = data.frozenCells?.[this.sheet.sheetId]?.[this.type];

    if (!isNil(frozenCell)) {
      for (let index = 0; index <= frozenCell; index++) {
        this.draw(index, forceDraw);
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

  *getSizeForFrozenCell() {
    const { frozenCells } = this.spreadsheet.data.spreadsheetData;
    const frozenCell = frozenCells?.[this.sheet.sheetId]?.[this.type];

    if (isNil(frozenCell)) return null;

    let size = 0;

    for (let index = 0; index <= frozenCell; index++) {
      size += this.getSize(index);

      yield { size, index };
    }

    return size;
  }

  getTopBottomIndexFromPosition(position: Vector2d) {
    const sheetViewportStartYIndex = this.scrollBar.sheetViewportPosition.x;

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
    if (index > this.spreadsheet.options[this.type].amount) return;

    const existingRowCol = this.rowColMap.get(index);

    existingRowCol?.destroy();

    const rowCol = new RowCol(this, index);

    if (this.getIsLastFrozen(index)) {
      rowCol.gridLine.setAttrs(this.spreadsheet.styles[this.type].frozenLine);

      this.frozenLine = rowCol.gridLine;

      this.frozenLine[this.functions.axis](
        this.getAxis(index) +
          this.getSize(index) -
          this.sheet.getViewportVector()[this.functions.axis]
      );

      this.sheet.scrollGroups.xySticky.sheetGroup.add(this.frozenLine);
    }

    this.rowColMap.set(index, rowCol);
  }
}

export default RowCols;
