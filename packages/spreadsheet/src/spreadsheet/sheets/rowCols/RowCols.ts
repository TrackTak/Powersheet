import { Line } from 'konva/lib/shapes/Line';
import { Vector2d } from 'konva/lib/types';

import ScrollBar from './scrollBars/ScrollBar';
import Spreadsheet from '../../Spreadsheet';

import { isNil } from 'lodash';
import RowCol from './rowCol/RowCol';
import Resizer from './rowCol/Resizer';
import RowColAddress, { SheetRowColId } from '../cells/cell/RowColAddress';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Group } from 'konva/lib/Group';
import Sheets from '../Sheets';

export type RowColType = 'row' | 'col';
export type RowColsType = 'rows' | 'cols';

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

export type HeaderGroupId = number;

export type RowColId = number;

interface ICachedGridLines {
  main: Line[];
  xFrozenLines: Line[];
  yFrozenLines: Line[];
  xyFrozenLines: Line[];
}

interface ICachedRowColGroup {
  headerGroups: Group[];
  gridLines: ICachedGridLines;
}

class RowCols {
  scrollBar: ScrollBar;
  rowColMap: Map<RowColId, RowCol>;
  totalSize: number;
  frozenLine: Line;
  functions: IRowColFunctions;
  oppositeType: RowColType;
  oppositeFunctions: IRowColFunctions;
  isCol: boolean;
  spreadsheet: Spreadsheet;
  resizer: Resizer;
  pluralType: RowColsType;
  oppositePluralType: RowColsType;
  cachedHeaderGroup: Group;
  cachedGridLine: Line;
  cachedRowColGroups: ICachedRowColGroup = {
    headerGroups: [],
    gridLines: {
      main: [],
      xFrozenLines: [],
      yFrozenLines: [],
      xyFrozenLines: [],
    },
  };
  numberOfCachedRowCols = 0;

  constructor(public type: RowColType, public sheets: Sheets) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;
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
    this.pluralType = `${this.type}s`;
    this.oppositePluralType = `${this.oppositeType}s`;

    this.resizer = new Resizer(this);
    this.scrollBar = new ScrollBar(this);

    const headerRect = new Rect({
      ...this.spreadsheet.styles[this.type].headerRect,
      name: 'headerRect',
      [this.functions.size]: this.spreadsheet.options[this.type].defaultSize,
    });

    const headerText = new Text({
      ...this.spreadsheet.styles[this.type].headerText,
      name: 'headerText',
    });

    const headerResizeLine = new Line({
      ...this.spreadsheet.styles[this.type].resizeLine,
      name: 'headerResizeLine',
      points: this.isCol
        ? [0, 0, 0, this.sheets.getViewportVector().y]
        : [0, 0, this.sheets.getViewportVector().x, 0],
    });

    this.cachedHeaderGroup = new Group();

    this.cachedHeaderGroup.add(headerRect, headerText, headerResizeLine);

    this.cachedHeaderGroup.cache();

    this.cachedGridLine = new Line({
      ...this.spreadsheet.styles[this.type].gridLine,
      name: 'gridLine',
      listening: false,
    }).cache();

    this.frozenLine = new Line({
      ...this.spreadsheet.styles[this.type].frozenLine,
      visible: false,
      name: 'frozenLine',
    });

    this.sheets.scrollGroups.xySticky.sheetGroup.add(this.frozenLine);
  }

  cacheOutOfViewportRowCols() {
    this.rowColMap.forEach((rowCol, index) => {
      if (rowCol.getIsOutsideSheet()) {
        this.rowColMap.delete(index);
        this.cachedRowColGroups.headerGroups.push(rowCol.headerGroup);
        this.cachedRowColGroups.gridLines.main.push(rowCol.gridLine);
        this.cachedRowColGroups.gridLines.xFrozenLines.push(
          rowCol.xFrozenGridLine
        );
        this.cachedRowColGroups.gridLines.yFrozenLines.push(
          rowCol.yFrozenGridLine
        );
        this.cachedRowColGroups.gridLines.xyFrozenLines.push(
          rowCol.xyFrozenGridLine
        );
      }
    });
  }

  cloneGroupsAndPush() {
    const clonedHeaderGroup = this.cachedHeaderGroup.clone();
    const clonedGridLine = this.cachedGridLine.clone({
      points: this.getLinePoints(this.getSheetSize()),
    }) as Line;
    const clonedXFrozenGridLine = this.cachedGridLine.clone({
      visible: false,
    }) as Line;
    const clonedYFrozenGridLine = this.cachedGridLine.clone({
      visible: false,
    }) as Line;
    const clonedXYFrozenGridLine = this.cachedGridLine.clone({
      visible: false,
    }) as Line;

    this.cachedRowColGroups.headerGroups.push(clonedHeaderGroup);
    this.cachedRowColGroups.gridLines.main.push(clonedGridLine);
    this.cachedRowColGroups.gridLines.xFrozenLines.push(clonedXFrozenGridLine);
    this.cachedRowColGroups.gridLines.yFrozenLines.push(clonedYFrozenGridLine);
    this.cachedRowColGroups.gridLines.xyFrozenLines.push(
      clonedXYFrozenGridLine
    );
  }

  setCachedRowCols() {
    const numberOfCachedRowCols = this.numberOfCachedRowCols;

    const maxNumberOfCachedRoCols = Math.max(
      this.sheets.stage[this.functions.size]() /
        this.spreadsheet.options[this.type].minSize,
      this.numberOfCachedRowCols
    );

    this.numberOfCachedRowCols = maxNumberOfCachedRoCols;

    for (
      let index = numberOfCachedRowCols;
      index < maxNumberOfCachedRoCols;
      index++
    ) {
      this.cloneGroupsAndPush();
    }
  }

  private updateFrozenRowCols(frozenRowCol?: number) {
    if (!isNil(frozenRowCol)) {
      for (let index = 0; index <= frozenRowCol; index++) {
        const rowColAddress = new RowColAddress(
          this.sheets.activeSheetId,
          index
        );

        this.updateRowCol(rowColAddress);
      }
    }
  }

  clearAll() {
    this.rowColMap.forEach((rowCol, rowColId) => {
      this.cloneGroupsAndPush();

      rowCol.destroy();

      this.rowColMap.delete(rowColId);
    });
  }

  updateViewport() {
    this.scrollBar.setScrollSize();

    this.frozenLine.hide();

    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[
        this.sheets.activeSheetId
      ];
    const frozenRowCol = frozenCells?.[this.type];

    this.updateFrozenRowCols(frozenRowCol);

    // Backwards so we ignore frozen row/cols
    // when they don't exist in the cache
    for (const index of this.scrollBar.sheetViewportPosition.iterateFromYToX()) {
      const rowColAddress = new RowColAddress(this.sheets.activeSheetId, index);

      this.updateRowCol(rowColAddress);
    }

    if (!isNil(frozenRowCol)) {
      this.frozenLine[this.functions.axis](
        this.getAxis(frozenRowCol) +
          this.getSize(frozenRowCol) -
          this.sheets.getViewportVector()[this.functions.axis]
      );
      this.frozenLine.points(
        this.getLinePoints(
          this.isCol
            ? this.sheets.sheetDimensions.height
            : this.sheets.sheetDimensions.width
        )
      );
      this.frozenLine.show();
    }
  }

  updateRowCol(rowColAddress: RowColAddress) {
    const rowCol = this.rowColMap.get(rowColAddress.rowCol);

    if (!rowCol) {
      this.setRowCol(rowColAddress);
    }
  }

  setRowCol(rowColAddress: RowColAddress) {
    const cachedHeaderGroup = this.cachedRowColGroups.headerGroups.pop()!;
    const cachedGridLine = this.cachedRowColGroups.gridLines.main.pop()!;
    const cachedXFrozenGridLine =
      this.cachedRowColGroups.gridLines.xFrozenLines.pop()!;
    const cachedYFrozenGridLine =
      this.cachedRowColGroups.gridLines.yFrozenLines.pop()!;
    const cachedXYFrozenGridLine =
      this.cachedRowColGroups.gridLines.xyFrozenLines.pop()!;

    if (!cachedHeaderGroup) return;

    const rowCol = new RowCol(
      this,
      rowColAddress.rowCol,
      cachedHeaderGroup,
      cachedGridLine,
      cachedXFrozenGridLine,
      cachedYFrozenGridLine,
      cachedXYFrozenGridLine
    );

    this.rowColMap.set(rowColAddress.rowCol, rowCol);
  }

  private getSheetSize() {
    return (
      this.sheets.sheetDimensions[this.oppositeFunctions.size] +
      this.sheets.getViewportVector()[this.oppositeFunctions.axis]
    );
  }

  getLinePoints = (size: number) => {
    return this.isCol ? [0, 0, 0, size] : [0, 0, size, 0];
  };

  destroy() {
    this.scrollBar.destroy();
    this.frozenLine.destroy();
  }

  getAxis(index: number) {
    const data = this.spreadsheet.data.spreadsheetData;
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;
    const rowCols = data.sheets?.[this.sheets.activeSheetId][this.pluralType];

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
      this.sheets.getViewportVector()[this.functions.axis];

    return axis;
  }

  getSize(index: number) {
    const sheetRowColId = new RowColAddress(
      this.sheets.activeSheetId,
      index
    ).toSheetRowColId();
    const data = this.spreadsheet.data.spreadsheetData;
    const size = data[this.pluralType]?.[sheetRowColId]?.size;

    return size ?? this.spreadsheet.options[this.type].defaultSize;
  }

  getIsFrozen(index: number) {
    const data = this.spreadsheet.data.spreadsheetData;
    const frozenCell =
      data.frozenCells?.[this.sheets.activeSheetId]?.[this.type];

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

  getSizeUpToFrozenRowCol() {
    let size = 0;

    for (const value of this.getSizeForFrozenCell()) {
      size = value.size;
    }
    return size;
  }

  *getSizeForFrozenCell() {
    const { frozenCells } = this.spreadsheet.data.spreadsheetData;
    const frozenCell = frozenCells?.[this.sheets.activeSheetId]?.[this.type];

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
}

export default RowCols;
