import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheets from '../Sheets';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Text } from 'konva/lib/shapes/Text';
import { Line } from 'konva/lib/shapes/Line';
import { isNil } from 'lodash';
import { Node } from 'konva/lib/Node';
import { ICellConfig } from '../../styles';
import { ShapeConfig } from 'konva/lib/Shape';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellGroups: Group[] = [];
  cachedCellGroup: Group;
  cachedCellRect: Rect;
  spreadsheet: Spreadsheet;
  numberOfCachedCells = 0;

  constructor(private sheets: Sheets) {
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;
    this.cellsMap = new Map();
    this.cachedCellRect = new Rect({
      ...this.spreadsheet.styles.cell.rect,
      ...this.getDefaultCellRectAttrs(),
      name: 'rect',
    }).cache();
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

  private getDefaultCellRectAttrs() {
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
      const cachedCellGroup = this.cachedCellGroup.clone();

      this.cachedCellGroups.push(cachedCellGroup);
    }

    this.numberOfCachedCells =
      this.sheets.rows.numberOfCachedRowCols *
      this.sheets.cols.numberOfCachedRowCols;
  }

  private resetNodeAttrs(node: Node) {
    const { name, ...attrs } = node.getAttrs();
    const cellConfigKey = name as keyof ICellConfig | undefined;

    const resetValues: Partial<ShapeConfig> = {};

    for (const key in attrs) {
      let styleValue = null;

      if (cellConfigKey) {
        styleValue = this.spreadsheet.styles.cell[cellConfigKey][key] ?? null;
      }

      resetValues[key] = styleValue;
    }

    node.setAttrs(resetValues);
  }

  // The reason we do this instead of destroy() & clone()
  // is that this is much much faster in terms of performance
  resetAttrs(cell: StyleableCell) {
    this.resetNodeAttrs(cell.group);

    cell.group.getChildren().forEach((child) => {
      this.resetNodeAttrs(child);
    });

    cell.rect.setAttrs(this.getDefaultCellRectAttrs());
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (!cell.group.isClientRectOnScreen()) {
        this.resetAttrs(cell);
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

  clearAll() {
    this.cellsMap.forEach((cell, cellId) => {
      // const clone = this.cachedCellGroup.clone();

      // cell.destroy();

      // this.cellsMap.delete(cellId);
      // this.cachedCellGroups.push(clone);
      this.resetAttrs(cell);

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
  }

  updateCell(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();

    const rangeSimpleCellAddress =
      this.spreadsheet.sheets.merger.associatedMergedCellAddressMap.get(cellId);

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
