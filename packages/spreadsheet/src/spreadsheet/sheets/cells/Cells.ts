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
  spreadsheet: Spreadsheet;

  constructor(private sheets: Sheets) {
    this.spreadsheet = this.sheets.spreadsheet;
    this.cellsMap = new Map();
  }

  getDefaultCellRectAttrs() {
    return {
      width: this.spreadsheet.options.col.defaultSize,
      height: this.spreadsheet.options.row.defaultSize,
    };
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (!cell.group.isClientRectOnScreen()) {
        cell.group.remove();
        cell.bordersGroup.remove();

        this.cellsMap.delete(cellId);
        this.sheets.cachedGroups.cells.push({
          group: cell.group,
          borderGroup: cell.bordersGroup,
        });
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

          this.updateCell(simpleCellAddress, true);
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

          this.updateCell(simpleCellAddress, true);
        }
      }
    }
  }

  getCellGroup() {
    const cellGroup = new Group({
      name: 'stylableCellGroup',
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

    // Cell borders must be in a seperate group as they
    // need to take precedent over all cell strokes in their zIndex
    const cellBordersGroup = new Group({
      name: 'stylableCellBordersGroup',
    });

    cellBordersGroup.add(...borderLines);

    cellGroup.add(cellRect, cellText, commentMarker);

    return {
      cellGroup,
      cellBordersGroup,
    };
  }

  destroy() {
    this.cellsMap.forEach((cell) => {
      const { cellGroup, cellBordersGroup } = this.getCellGroup();

      cell.destroy();

      this.sheets.cachedGroups.cells.push({
        group: cellGroup,
        borderGroup: cellBordersGroup,
      });
    });
  }

  setCachedCells() {
    // TODO: Remove * 2 and measure the
    // outOfViewport for freeze correctly instead
    const currentNumberOfCachedCells =
      this.sheets.cachedGroupsNumber.rows *
      this.sheets.cachedGroupsNumber.cols *
      2;

    for (
      let index = this.sheets.cachedGroupsNumber.cells;
      index < currentNumberOfCachedCells;
      index++
    ) {
      const { cellGroup, cellBordersGroup } = this.getCellGroup();

      this.sheets.cachedGroups.cells.push({
        group: cellGroup,
        borderGroup: cellBordersGroup,
      });
    }

    this.sheets.cachedGroupsNumber.cells = currentNumberOfCachedCells;
  }

  resetCachedCells() {
    this.cellsMap.forEach((cell, cellId) => {
      cell.group.remove();
      cell.bordersGroup.remove();

      this.cellsMap.delete(cellId);
      this.sheets.cachedGroups.cells.push({
        group: cell.group,
        borderGroup: cell.bordersGroup,
      });
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

        this.updateCell(simpleCellAddress, false);
      }
    }
  }

  setStyleableCell(simpleCellAddress: SimpleCellAddress) {
    const { group, borderGroup } = this.sheets.cachedGroups.cells.pop() ?? {};

    if (!group || !borderGroup) return;

    const styleableCell = new StyleableCell(
      this.sheets,
      simpleCellAddress,
      group,
      borderGroup
    );

    const cellId = simpleCellAddress.toCellId();

    this.cellsMap.set(cellId, styleableCell);

    if (
      !this.spreadsheet.sheets.merger.getIsCellPartOfMerge(simpleCellAddress)
    ) {
      const height = this.sheets.rows.getSize(simpleCellAddress.row);
      const cellHeight = Math.max(
        styleableCell.rect.height(),
        styleableCell.text.height()
      );

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

  updateCell(simpleCellAddress: SimpleCellAddress, isOnFrozenRowCol = false) {
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
      return;
    }

    // We always render frozenRowCol cells so they hide the cells beneath it
    if (!this.getHasCellData(simpleCellAddress) && !isOnFrozenRowCol) return;

    const cellExists = this.cellsMap.has(cellId);

    if (!cellExists) {
      this.setStyleableCell(simpleCellAddress);
    }
  }
}

export default Cells;
