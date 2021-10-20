import { isNil } from 'lodash';
import Spreadsheet from '../../Spreadsheet';
import Cell from './cell/Cell';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from '../Sheet';
import { Group } from 'konva/lib/Group';
import { Rect } from 'konva/lib/shapes/Rect';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedStyledCells: StyleableCell[] = [];
  cachedCellRect: Rect;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.cellsMap = new Map();
    this.cachedCellRect = new Rect({
      ...this.spreadsheet.styles.cell.rect,
      width: this.spreadsheet.options.col.defaultSize,
      height: this.spreadsheet.options.row.defaultSize,
    });

    this.cachedCellRect.cache();
  }

  private clearAll() {
    this.cellsMap.clear();
  }

  setCachedCells() {
    this.cachedStyledCells = [];

    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        const cell = new StyleableCell(this.sheet, simpleCellAddress);

        this.cachedStyledCells.push(cell);
      }
    }
  }

  destroyOutOfViewportItems() {
    for (const [key, cell] of this.cellsMap) {
      const clientRect = cell.group.getClientRect();
      const isShapeOutsideOfSheet = !this.sheet.isClientRectOnSheet({
        ...clientRect,
        x: clientRect.x - 0.001,
        y: clientRect.y - 0.001,
      });

      if (isShapeOutsideOfSheet) {
        this.cellsMap.delete(key);
        this.cachedStyledCells.push(cell);
      }
    }
  }

  // forceDraw is turned off for scrolling for performance
  drawViewport(forceDraw = false) {
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

        this.drawCell(simpleCellAddress, forceDraw);
      }
    }
  }

  private getShouldDraw = (
    simpleCellAddress: SimpleCellAddress,
    forceDraw: boolean
  ) => {
    const cellId = simpleCellAddress.toCellId();
    const cellAlreadyExists = !!this.cellsMap.get(cellId);
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    const hasCellData = !!(
      cell || this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    return (forceDraw || !cellAlreadyExists) && hasCellData;
  };

  private drawMergedCellIfAssociatedCellShowing(
    simpleCellAddress: SimpleCellAddress
  ) {
    const rangeSimpleCellAddress =
      this.sheet.merger.associatedMergedCellAddressMap.get(
        simpleCellAddress.toCellId()
      );

    if (rangeSimpleCellAddress) {
      const mergedCellId =
        rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId();
      const mergedCell = this.cellsMap.get(mergedCellId);

      if (!mergedCell) {
        // this.initializeCell(rangeSimpleCellAddress.topLeftSimpleCellAddress);
      }
    }
  }

  drawCell(simpleCellAddress: SimpleCellAddress, forceDraw: boolean) {
    // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);
    const cellId = simpleCellAddress.toCellId();

    if (!this.getShouldDraw(simpleCellAddress, forceDraw)) return;
    if (this.cellsMap.has(cellId)) return;

    // this.initializeCell(simpleCellAddress);

    const cachedCell = this.cachedStyledCells.shift();

    if (!cachedCell) return;

    cachedCell.updateCell(simpleCellAddress);

    this.cellsMap.set(cellId, cachedCell);
  }

  updateViewport() {
    this.clearAll();
    this.drawViewport();
    // this.drawViewport(true);
  }
}

export default Cells;
