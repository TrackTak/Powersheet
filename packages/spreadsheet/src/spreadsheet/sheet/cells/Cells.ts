import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from '../Sheet';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Text } from 'konva/lib/shapes/Text';
import { Line } from 'konva/lib/shapes/Line';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellsGroups: Group[] = [];
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
    }).hide();
    const commentMarker = new Line({
      ...this.spreadsheet.styles.cell.commentMarker,
      name: 'commentMarker',
    }).hide();

    const cellText = new Text({
      name: 'cellText',
      ...this.spreadsheet.styles.cell.text,
    }).hide();

    this.cachedCellGroup = new Group({
      listening: false,
    });

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
      if (cell.getIsOutsideSheet()) {
        this.cellsMap.delete(cellId);
        this.cachedCellsGroups.push(cell.group);
      }
    });
  }

  updateViewportForScroll() {
    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromYToX()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromYToX()) {
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

    if (this.cellsMap.has(cellId) || !this.getHasCellData(simpleCellAddress))
      return;

    const cachedCellGroup = this.cachedCellsGroups.pop()!;

    if (!cachedCellGroup) return;

    const styleableCell = new StyleableCell(
      this.sheet,
      simpleCellAddress,
      cachedCellGroup
    );

    this.cellsMap.set(cellId, styleableCell);
  }

  updateViewport() {
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
    const cachedCellGroup = cell ? cell.group : this.cachedCellGroup.clone();
    const stickyGroup = this.getStickyGroupCellBelongsTo(simpleCellAddress);

    this.sheet.scrollGroups[stickyGroup].cellGroup.add(cachedCellGroup);

    if (cell) {
      cell.update();
    } else {
      const styleableCell = new StyleableCell(
        this.sheet,
        simpleCellAddress,
        cachedCellGroup
      );

      this.cellsMap.set(cellId, styleableCell);
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
}

export default Cells;
