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
      if (this.cellsMap.has(simpleCellAddress.toCellId())) {
        return;
      }

      const cachedCellGroup = this.cachedCellGroup.clone();

      this.cachedCellsGroups.push(cachedCellGroup);
    });
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (cell.getIsOutsideSheet()) {
        this.cellsMap.delete(cellId);
        this.cachedCellsGroups.push(cell.group);
      }
    });
  }

  getHasCellData(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    const hasCellData = !!(
      cell || this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    return hasCellData;
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

  setStyleableCell(simpleCellAddress: SimpleCellAddress) {
    const cachedCellGroup = this.cachedCellsGroups.pop()!;

    if (!cachedCellGroup) return;

    const styleableCell = new StyleableCell(
      this.sheet,
      simpleCellAddress,
      cachedCellGroup
    );

    const cellId = simpleCellAddress.toCellId();

    this.cellsMap.set(cellId, styleableCell);
  }

  updateCell(simpleCellAddress: SimpleCellAddress) {
    // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);

    const cellId = simpleCellAddress.toCellId();

    if (!this.getHasCellData(simpleCellAddress)) return;

    const cell = this.cellsMap.get(cellId);

    if (cell) {
      if (
        !this.sheet.rows.scrollBar.isScrolling &&
        !this.sheet.cols.scrollBar.isScrolling
      ) {
        cell.update();
      }
    } else {
      this.setStyleableCell(simpleCellAddress);
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
