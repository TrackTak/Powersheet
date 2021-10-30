import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheets from '../Sheets';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Text } from 'konva/lib/shapes/Text';
import { Line } from 'konva/lib/shapes/Line';
import { isNil } from 'lodash';
import RowColAddress from './cell/RowColAddress';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellGroups: Group[] = [];
  spreadsheet: Spreadsheet;
  numberOfCachedCells = 0;

  constructor(private sheets: Sheets) {
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;
    this.cellsMap = new Map();
  }

  getDefaultCellRectAttrs() {
    return {
      width: this.spreadsheet.options.col.defaultSize,
      height: this.spreadsheet.options.row.defaultSize,
    };
  }

  setCachedCells() {
    // TODO: Remove * 2 and measure the
    // outOfViewport for freeze correctly instead
    const currentNumberOfCachedCells =
      this.sheets.rows.numberOfCachedRowCols *
      this.sheets.cols.numberOfCachedRowCols *
      2;

    for (
      let index = this.numberOfCachedCells;
      index < currentNumberOfCachedCells;
      index++
    ) {
      this.cachedCellGroups.push(this.getCellGroup());
    }

    this.numberOfCachedCells =
      this.sheets.rows.numberOfCachedRowCols *
      this.sheets.cols.numberOfCachedRowCols;
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (!cell.group.isClientRectOnScreen()) {
        cell.group.remove();

        this.cellsMap.delete(cellId);
        this.cachedCellGroups.push(cell.group);
      }
    });
  }
  getHasCellData(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    // Need to check hyperformula value too because some
    // functions spill values into adjacent cells
    const cellSerializedValueExists = !isNil(
      this.spreadsheet.hyperformula.getCellValue(simpleCellAddress)
    );
    const hasCellData = !!(
      cell ||
      cellSerializedValueExists ||
      this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    return hasCellData;
  }

  private updateFrozenCells(frozenRow?: number, frozenCol?: number) {
    if (!isNil(frozenRow)) {
      for (let ri = 0; ri <= frozenRow; ri++) {
        for (const ci of this.sheets.cols.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this.sheets.activeSheetId,
            ri,
            ci
          );

          this.updateCell(simpleCellAddress);
        }
      }
    }

    if (!isNil(frozenCol)) {
      for (let ci = 0; ci <= frozenCol; ci++) {
        for (const ri of this.sheets.rows.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this.sheets.activeSheetId,
            ri,
            ci
          );

          this.updateCell(simpleCellAddress);
        }
      }
    }
  }

  getCellGroup() {
    const cellGroup = new Group({
      name: 'stylableCellGroup',
      listening: false,
    });
    const cellRect = new Rect({
      ...this.spreadsheet.styles.cell.rect,
      ...this.getDefaultCellRectAttrs(),
      name: 'rect',
    });
    const borderLine = new Line({
      ...this.spreadsheet.styles.cell.borderLine,
      name: 'borderLine',
    });
    const commentMarker = new Line({
      ...this.spreadsheet.styles.cell.commentMarker,
      name: 'commentMarker',
    });
    const cellText = new Text({
      name: 'text',
      ...this.spreadsheet.styles.cell.text,
    });

    const borderLines = [
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone(),
    ];

    cellGroup.add(cellRect, cellText, commentMarker, ...borderLines);

    return cellGroup;
  }

  clearCells() {
    this.cellsMap.forEach((cell, cellId) => {
      cell.destroy();

      this.cellsMap.delete(cellId);
      this.cachedCellGroups.push(this.getCellGroup().clone());
    });
  }

  resetCachedCells() {
    this.cellsMap.forEach((cell, cellId) => {
      cell.group.remove();

      this.cellsMap.delete(cellId);
      this.cachedCellGroups.push(cell.group);
    });
  }

  updateViewport() {
    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[
        this.sheets.activeSheetId
      ];
    const frozenRow = frozenCells?.row;
    const frozenCol = frozenCells?.col;

    this.updateFrozenCells(frozenRow, frozenCol);

    for (const ri of this.sheets.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheets.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheets.activeSheetId,
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
      this.sheets,
      simpleCellAddress,
      cachedCellGroup
    );

    const cellId = simpleCellAddress.toCellId();

    this.cellsMap.set(cellId, styleableCell);

    if (
      !this.spreadsheet.sheets.merger.getIsCellPartOfMerge(simpleCellAddress)
    ) {
      const height = this.sheets.rows.getSize(simpleCellAddress.row);
      const cellHeight = styleableCell.rect.height();

      if (cellHeight > height) {
        this.spreadsheet.data.setRowCol(
          'rows',
          new RowColAddress(this.sheets.activeSheetId, simpleCellAddress.row),
          {
            size: cellHeight,
          }
        );

        this.spreadsheet.updateViewport();
      }
    }
  }

  updateCell(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const mergedCellId =
      this.spreadsheet.sheets.merger.associatedMergedCellAddressMap[cellId];

    const sheetName =
      this.spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ?? '';

    if (!this.spreadsheet.hyperformula.doesSheetExist(sheetName)) {
      return;
    }

    if (mergedCellId) {
      const mergedCell = this.cellsMap.get(mergedCellId);

      if (!mergedCell) {
        this.setStyleableCell(SimpleCellAddress.cellIdToAddress(mergedCellId));
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
