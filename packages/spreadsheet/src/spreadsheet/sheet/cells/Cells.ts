import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from '../Sheet';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Text } from 'konva/lib/shapes/Text';
import { Line } from 'konva/lib/shapes/Line';
import { rotateAroundCenter } from '../../utils';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellsGroupsQueue: Group[] = [];
  cachedCellGroup: Group;
  cachedCellRect: Rect;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.cellsMap = new Map();
    this.cachedCellRect = new Rect({
      ...this.spreadsheet.styles.cell.rect,
      name: 'cellRect',
      width: this.spreadsheet.options.col.defaultSize,
      height: this.spreadsheet.options.row.defaultSize,
    }).cache();
    const borderLine = new Line({
      ...this.spreadsheet.styles.cell.borderLine,
      name: 'borderLine',
    });
    const commentMarker = new Line({
      ...this.spreadsheet.styles.cell.commentMarker,
      name: 'commentMarker',
    });
    rotateAroundCenter(commentMarker, 180);

    const cellText = new Text({
      name: 'cellText',
      ...this.spreadsheet.styles.cell.text,
    });

    this.cachedCellGroup = new Group();

    const borderLines = [
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone(),
    ];

    this.cachedCellGroup.add(
      this.cachedCellRect,
      cellText,
      commentMarker,
      ...borderLines
    );

    this.cachedCellGroup.cache();
  }

  setCachedCells() {
    const simpleCellAddressesForCache: SimpleCellAddress[] = [];

    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        simpleCellAddressesForCache.push(simpleCellAddress);
      }
    }

    const cellsToDestroy = Array.from(this.cellsMap).filter(([cellId]) => {
      return simpleCellAddressesForCache.every(
        (simpleCellAddress) => simpleCellAddress.toCellId() !== cellId
      );
    });

    cellsToDestroy.forEach(([cellId, cell]) => {
      cell.destroy();
      this.cellsMap.delete(cellId);
    });

    simpleCellAddressesForCache.forEach((simpleCellAddress) => {
      const cellId = simpleCellAddress.toCellId();

      if (this.cellsMap.has(cellId)) {
        return;
      }

      const clonedCellGroup = this.cachedCellGroup.clone();

      this.cachedCellsGroupsQueue.push(clonedCellGroup);

      const stickyGroup = this.getStickyGroupCellBelongsTo(simpleCellAddress);

      this.sheet.scrollGroups[stickyGroup].cellGroup.add(clonedCellGroup);

      this.setStyleableCells(simpleCellAddress);
    });
  }

  getStickyGroupCellBelongsTo(simpleCellAddress: SimpleCellAddress) {
    return this.sheet.getStickyGroupType(
      this.isCellOnFrozenRow(simpleCellAddress),
      this.isCellOnFrozenCol(simpleCellAddress)
    );
  }

  isCellOnFrozenRow(simpleCellAddress: SimpleCellAddress) {
    return this.sheet.rows.getIsFrozen(simpleCellAddress.row);
  }

  isCellOnFrozenCol(simpleCellAddress: SimpleCellAddress) {
    return this.sheet.cols.getIsFrozen(simpleCellAddress.col);
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      const clientRect = cell.getClientRectWithoutStroke();
      const isShapeOutsideOfSheet = !this.sheet.isClientRectOnSheet({
        ...clientRect,
        x: clientRect.x - 0.001,
        y: clientRect.y - 0.001,
      });

      if (isShapeOutsideOfSheet) {
        this.cellsMap.delete(cellId);
        this.cachedCellsGroupsQueue.push(cell.group);
      }
    });
  }

  updateViewportForScroll() {
    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        this.setStyleableCells(simpleCellAddress);
      }
    }
  }

  getHasCellData(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    const hasCellData = !!(
      cell || this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    return hasCellData;
  }

  setStyleableCells(simpleCellAddress: SimpleCellAddress) {
    // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);

    const cellId = simpleCellAddress.toCellId();
    const cellAlreadyExists = this.cellsMap.has(cellId);

    if (cellAlreadyExists || !this.getHasCellData(simpleCellAddress)) return;

    const cachedCellGroup = this.cachedCellsGroupsQueue.shift()!;

    const styleableCell = new StyleableCell(
      this.sheet,
      simpleCellAddress,
      cachedCellGroup
    );

    this.cellsMap.set(cellId, styleableCell);
  }

  updateViewport() {
    const data = this.spreadsheet.data.spreadsheetData;

    const frozenRow = data.frozenCells?.[this.sheet.sheetId]?.row;
    const frozenCol = data.frozenCells?.[this.sheet.sheetId]?.col;

    // if (!isNil(frozenRow)) {
    //   for (let ri = 0; ri <= frozenRow; ri++) {
    //     for (const ci of this.sheet.cols.rowColMap.keys()) {
    //       const simpleCellAddress = new SimpleCellAddress(
    //         this.sheet.sheetId,
    //         ri,
    //         ci
    //       );

    //       this.drawCell(simpleCellAddress, forceDraw);
    //     }
    //   }
    // }

    // if (!isNil(frozenCol)) {
    //   for (let ci = 0; ci <= frozenCol; ci++) {
    //     for (const ri of this.sheet.rows.rowColMap.keys()) {
    //       const simpleCellAddress = new SimpleCellAddress(
    //         this.sheet.sheetId,
    //         ri,
    //         ci
    //       );

    //       this.drawCell(simpleCellAddress, forceDraw);
    //     }
    //   }
    // }

    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        this.updateCell(simpleCellAddress);
      }
    }
  }

  updateCell(simpleCellAddress: SimpleCellAddress) {
    // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);

    const cellId = simpleCellAddress.toCellId();

    if (!this.getHasCellData(simpleCellAddress)) return;

    const cell = this.cellsMap.get(cellId);

    if (cell) {
      cell.update();
    }
  }

  private drawMergedCellIfAssociatedCellShowing(
    simpleCellAddress: SimpleCellAddress
  ) {
    const cellId = simpleCellAddress.toCellId();
    const rangeSimpleCellAddress =
      this.spreadsheet.merger.associatedMergedCellAddressMap.get(cellId);
    if (rangeSimpleCellAddress) {
      const mergedCellId =
        rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId();
      const mergedCell = this.cellsMap.get(mergedCellId);

      if (!mergedCell) {
        // this.initializeCell(rangeSimpleCellAddress.topLeftSimpleCellAddress);
      }
    }
  }

  // drawCell(simpleCellAddress: SimpleCellAddress, forceDraw: boolean) {
  //   // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);
  //   const cellId = simpleCellAddress.toCellId();

  //   if (!this.getShouldDraw(simpleCellAddress, forceDraw)) return;

  //   const cachedCell = this.cachedStyledCellsQueue.shift();

  //   if (!cachedCell) return;

  //   cachedCell.updateCell(simpleCellAddress);

  //   this.cellsMap.set(cellId, cachedCell);
  // }
}

export default Cells;
