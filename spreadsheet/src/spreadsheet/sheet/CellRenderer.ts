import { isNil } from 'lodash';
import Spreadsheet from '../Spreadsheet';
import Cell from './cell/Cell';
import SimpleCellAddress from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from './Sheet';

class CellRenderer {
  cellsMap: Map<SimpleCellAddress, Cell>;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.cellsMap = new Map();
  }

  private clearAll() {
    this.cellsMap.clear();
    this.sheet.merger.associatedMergedCellAddressMap.clear();
  }

  destroyOutOfViewportItems() {
    for (const [key, cell] of this.cellsMap) {
      if (this.sheet.isShapeOutsideOfViewport(cell.group)) {
        cell.destroy();

        this.cellsMap.delete(key);
      }
    }
  }

  // forceDraw is turned off for scrolling for performance
  drawViewport(forceDraw = false) {
    const data = this.spreadsheet.data.getSheetData();

    if (data.frozenCells) {
      const frozenRow = data.frozenCells.row;
      const frozenCol = data.frozenCells.col;

      if (!isNil(frozenRow)) {
        for (let ri = 0; ri <= frozenRow; ri++) {
          for (const ci of this.sheet.col.headerGroupMap.keys()) {
            const simpleCellAddress = new SimpleCellAddress(
              this.sheet.sheetId,
              ri,
              ci
            );

            this.drawCell(simpleCellAddress, forceDraw);
          }
        }
      }

      if (!isNil(frozenCol)) {
        for (let ci = 0; ci <= frozenCol; ci++) {
          for (const ri of this.sheet.row.headerGroupMap.keys()) {
            const simpleCellAddress = new SimpleCellAddress(
              this.sheet.sheetId,
              ri,
              ci
            );

            this.drawCell(simpleCellAddress, forceDraw);
          }
        }
      }
    }

    console.log(this.sheet.row.scrollBar.sheetViewportPosition.y);

    for (const ri of this.sheet.row.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.col.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        this.drawCell(simpleCellAddress, forceDraw);
      }
    }
  }

  drawCell(simpleCellAddress: SimpleCellAddress, forceDraw: boolean) {
    const cellAlreadyExists = this.cellsMap.get(simpleCellAddress);

    const shouldDraw = forceDraw || !cellAlreadyExists;

    if (!shouldDraw) return;

    if (this.sheet.cellRenderer.cellsMap.has(simpleCellAddress)) {
      this.sheet.cellRenderer.cellsMap.get(simpleCellAddress)!.destroy();
    }

    const cell = new StyleableCell(this.sheet, simpleCellAddress);

    cell.draw();

    this.sheet.cellRenderer.cellsMap.set(simpleCellAddress, cell);
  }

  updateViewport() {
    this.clearAll();
    this.drawViewport(true);
  }
}

export default CellRenderer;
