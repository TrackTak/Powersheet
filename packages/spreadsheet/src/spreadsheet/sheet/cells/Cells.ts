import Spreadsheet from '../../Spreadsheet';
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress';
import StyleableCell from './cell/StyleableCell';
import Sheet from '../Sheet';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellsGroupsQueue: Group[] = [];
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

  setCachedCells() {
    this.cachedCellsGroupsQueue.forEach((cachedCellGroup) =>
      cachedCellGroup.destroy()
    );
    this.cachedCellsGroupsQueue = [];

    for (const ri of this.sheet.rows.scrollBar.sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this.sheet.cols.scrollBar.sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );

        const cachedCellGroup = new Group();
        const rect = this.sheet.cells.cachedCellRect.clone();

        cachedCellGroup.add(rect);

        this.cachedCellsGroupsQueue.push(cachedCellGroup);

        const stickyGroup = this.getStickyGroupCellBelongsTo(simpleCellAddress);

        this.sheet.scrollGroups[stickyGroup].cellGroup.add(cachedCellGroup);

        this.setStyleableCells(simpleCellAddress);
      }
    }
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
    for (const [key, cell] of this.cellsMap) {
      const clientRect = cell.group.getClientRect();
      const isShapeOutsideOfSheet = !this.sheet.isClientRectOnSheet({
        ...clientRect,
        x: clientRect.x - 0.001,
        y: clientRect.y - 0.001,
      });

      if (isShapeOutsideOfSheet) {
        this.cellsMap.delete(key);
        this.cachedCellsGroupsQueue.push(cell.group);
      }
    }
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

  setStyleableCells(simpleCellAddress: SimpleCellAddress) {
    // this.drawMergedCellIfAssociatedCellShowing(simpleCellAddress);

    const cellId = simpleCellAddress.toCellId();
    const cellAlreadyExists = !!this.cellsMap.get(cellId);
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    const hasCellData = !!(
      cell || this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    if (cellAlreadyExists || !hasCellData) return;

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
    const cellData = this.spreadsheet.data.spreadsheetData.cells?.[cellId];
    const hasCellData = !!(
      cellData || this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    );

    if (!hasCellData) return;

    const cell = this.cellsMap.get(cellId);

    if (cell) {
      //  cell.update();
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
