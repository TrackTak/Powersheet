import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from '../Sheets';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Text } from 'konva/lib/shapes/Text';
import { Line } from 'konva/lib/shapes/Line';
import { isNil } from 'lodash';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellGroups: Group[] = [];
  cachedCellGroup: Group;
  cachedCellRect: Rect;
  spreadsheet: Spreadsheet;
  numberOfCachedCells = 0;

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
    // * 2 to account for frozen cells
    const currentNumberOfCachedCells =
      this.sheet.rows.numberOfCachedRowCols *
      this.sheet.cols.numberOfCachedRowCols *
      2;

    for (
      let index = this.numberOfCachedCells;
      index < currentNumberOfCachedCells;
      index++
    ) {
      const cachedCellGroup = this.cachedCellGroup.clone();

      this.cachedCellGroups.push(cachedCellGroup);
    }

    this.numberOfCachedCells =
      this.sheet.rows.numberOfCachedRowCols *
      this.sheet.cols.numberOfCachedRowCols;
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (!cell.group.isClientRectOnScreen()) {
        this.cellsMap.delete(cellId);
        this.cachedCellGroups.push(cell.group);
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

  private updateFrozenCells(frozenRow?: number, frozenCol?: number) {
    if (!isNil(frozenRow)) {
      for (let ri = 0; ri <= frozenRow; ri++) {
        for (const ci of this.sheet.cols.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            ri,
            ci
          );

          this.updateCell(simpleCellAddress);
        }
      }
    }

    if (!isNil(frozenCol)) {
      for (let ci = 0; ci <= frozenCol; ci++) {
        for (const ri of this.sheet.rows.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            ri,
            ci
          );

          this.updateCell(simpleCellAddress);
        }
      }
    }
  }

  clearAll() {
    this.cellsMap.forEach((cell, cellId) => {
      const clone = this.cachedCellGroup.clone();

      cell.destroy();

      this.cellsMap.delete(cellId);
      this.cachedCellGroups.push(clone);
    });
  }

  updateViewport() {
    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[this.sheet.sheetId];
    const frozenRow = frozenCells?.row;
    const frozenCol = frozenCells?.col;

    this.updateFrozenCells(frozenRow, frozenCol);

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
    const cachedCellGroup = this.cachedCellGroups.pop()!;

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
    const cellId = simpleCellAddress.toCellId();

    const rangeSimpleCellAddress =
      this.spreadsheet.merger.associatedMergedCellAddressMap.get(cellId);

    if (rangeSimpleCellAddress) {
      const mergedCellId =
        rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId();
      const mergedCell = this.cellsMap.get(mergedCellId);

      if (!mergedCell) {
        this.setStyleableCell(rangeSimpleCellAddress.topLeftSimpleCellAddress);
      }
    }

    if (!this.getHasCellData(simpleCellAddress)) return;

    const cellExists = this.cellsMap.has(cellId);

    if (!cellExists) {
      this.setStyleableCell(simpleCellAddress);
    }
  }
}

export default Cells;
