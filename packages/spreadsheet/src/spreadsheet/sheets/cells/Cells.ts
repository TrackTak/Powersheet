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
import RowColAddress from './cell/RowColAddress';
import Cell from './cell/Cell';

class Cells {
  cellsMap: Map<CellId, StyleableCell>;
  cachedCellGroups: Map<CellId, Group> = new Map();
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
    // const currentNumberOfCachedCells =
    //   this.sheets.rows.numberOfCachedRowCols *
    //   this.sheets.cols.numberOfCachedRowCols *
    //   2;
    // for (
    //   let index = this.numberOfCachedCells;
    //   index < currentNumberOfCachedCells;
    //   index++
    // ) {
    //   this.cachedCellGroups.push(this.getCellGroup());
    // }
    // this.numberOfCachedCells =
    //   this.sheets.rows.numberOfCachedRowCols *
    //   this.sheets.cols.numberOfCachedRowCols;
  }

  private resetNodeAttrs(node: Node) {
    const { name, ...attrs } = node.getAttrs();
    const cellConfigKey = name as keyof ICellConfig;

    const resetValues: Partial<ShapeConfig> = {};

    for (const key in attrs) {
      resetValues[key] =
        this.spreadsheet.styles.cell[cellConfigKey]?.[key] ?? null;
    }

    node.setAttrs(resetValues);
  }

  // The reason we do this instead of destroy() & clone()
  // is that this is much much faster in terms of performance
  // Do not reset the group because we want to keep the position
  resetAttrs(cell: StyleableCell) {
    cell.group.getChildren().forEach((child) => {
      this.resetNodeAttrs(child);
    });

    cell.rect.setAttrs(this.getDefaultCellRectAttrs());
  }

  isCellOutsideViewport(cell: Cell) {
    const simpleCellAddress = cell.simpleCellAddress;

    // TODO: Merged cells won't work for this
    return (
      simpleCellAddress.row <
        this.sheets.rows.scrollBar.sheetViewportPosition.x ||
      simpleCellAddress.row >
        this.sheets.rows.scrollBar.sheetViewportPosition.y ||
      simpleCellAddress.col <
        this.sheets.cols.scrollBar.sheetViewportPosition.x ||
      simpleCellAddress.col > this.sheets.cols.scrollBar.sheetViewportPosition.y
    );
  }

  cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (this.isCellOutsideViewport(cell)) {
        // cell.group.remove();

        this.resetAttrs(cell);
        this.cellsMap.delete(cellId);
        // this.cachedCellGroups.push(cell.group);
      }
    });
  }

  getHasCellData(simpleCellAddress: SimpleCellAddress) {
    const sheetName =
      this.spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ?? '';

    if (!this.spreadsheet.hyperformula.doesSheetExist(sheetName)) {
      return false;
    }

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
    // this.cellsMap.forEach((cell, cellId) => {
    //   cell.destroy();
    //   this.cellsMap.delete(cellId);
    //   // this.cachedCellGroups.push(this.getCellGroup().clone());
    // });
  }

  resetCachedCells() {
    // this.cellsMap.forEach((cell, cellId) => {
    //   cell.group.remove();
    //   this.resetAttrs(cell);
    //   this.cellsMap.delete(cellId);
    //   //   this.cachedCellGroups.push(cell.group);
    // });
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
    const row =
      simpleCellAddress.row -
      this.sheets.rows.scrollBar.sheetViewportPosition.x;

    const col =
      simpleCellAddress.col -
      this.sheets.cols.scrollBar.sheetViewportPosition.x;

    const cachedCellGroupId: CellId = `${simpleCellAddress.sheet}_${row}_${col}`;

    let cachedCellGroup = this.cachedCellGroups.get(cachedCellGroupId);

    if (!cachedCellGroup) {
      cachedCellGroup = this.getCellGroup();
    }

    const styleableCell = new StyleableCell(
      this.sheets,
      simpleCellAddress,
      cachedCellGroup
    );

    const cachedCellGroupExists = this.cachedCellGroups.has(cachedCellGroupId);

    if (!cachedCellGroupExists) {
      styleableCell.updatePosition();

      this.cachedCellGroups.set(cachedCellGroupId, cachedCellGroup);
    }

    console.log(cachedCellGroup.parent?.children?.length);

    const cellId = simpleCellAddress.toCellId();

    this.cellsMap.set(cellId, styleableCell);

    if (
      !this.spreadsheet.sheets.merger.getIsCellPartOfMerge(simpleCellAddress)
    ) {
      const height = this.sheets.rows.getSize(simpleCellAddress.row);
      const cellHeight = styleableCell.getClientRectWithoutStroke().height;

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

    if (mergedCellId) {
      const mergedCell = this.cellsMap.get(mergedCellId);

      if (!mergedCell) {
        this.setStyleableCell(SimpleCellAddress.cellIdToAddress(mergedCellId));
      }
    }

    if (!this.getHasCellData(simpleCellAddress)) return;

    this.setStyleableCell(simpleCellAddress);
  }
}

export default Cells;
