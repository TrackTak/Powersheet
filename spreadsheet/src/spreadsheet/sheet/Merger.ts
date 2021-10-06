import Sheet from './Sheet';
import SimpleCellAddress from './cells/cell/SimpleCellAddress';
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress';
import Spreadsheet from '../Spreadsheet';
import { merge } from 'lodash';

class Merger {
  associatedMergedCellAddressMap: Map<
    SimpleCellAddress,
    RangeSimpleCellAddress
  >;
  spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.associatedMergedCellAddressMap = new Map();
  }

  setAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.addressToCellId();
    const { mergedCells } = this.spreadsheet.data.getSheetData();
    const mergedCell = mergedCells?.[cellId];

    if (mergedCell) {
      const sheetId = this.sheet.sheetId;
      const { row, col } = mergedCell;

      const rangeSimpleCellAddress = new RangeSimpleCellAddress(
        new SimpleCellAddress(sheetId, row.x, col.x),
        new SimpleCellAddress(sheetId, row.y, col.y)
      );

      for (const _ of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const __ of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          this.associatedMergedCellAddressMap.set(
            simpleCellAddress,
            rangeSimpleCellAddress
          );
        }
      }
    }
  }

  addMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const mergedCellId =
      rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToCellId();
    const existingTopLeftCellStyle = this.spreadsheet.data.getCellData(
      rangeSimpleCellAddress.topLeftSimpleCellAddress
    )?.style;

    const sheetData = merge({}, this.spreadsheet.data.getSheetData(), {
      [mergedCellId]: {
        row: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
        },
        col: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
        },
      },
    });

    this.spreadsheet.data.setSheetData(sheetData);

    for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
      for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );
        const cellId = simpleCellAddress.addressToCellId();

        if (
          simpleCellAddress.addressToCellId() !== mergedCellId &&
          sheetData.cellsData?.[cellId]
        ) {
          this.spreadsheet.data.deleteCellData(simpleCellAddress);
        }
      }
    }

    if (existingTopLeftCellStyle) {
      this.spreadsheet.data.setCellDataStyle(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        existingTopLeftCellStyle
      );
    }

    this.sheet.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress;
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const { mergedCells } = this.spreadsheet.data.getSheetData();

    this.sheet.cells.cellsMap.forEach((cell, simpleCellAddress) => {
      if (
        this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress) &&
        mergedCells
      ) {
        const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
          rangeSimpleCellAddress,
          cell.rangeSimpleCellAddress
        );

        if (areMergedCellsOverlapping) {
          const cellId = simpleCellAddress.addressToCellId();

          delete mergedCells[cellId];
        }
      }
    });

    if (
      !this.spreadsheet.data.getIsCellAMergedCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      )
    )
      return;

    const style = this.spreadsheet.data.getCellData(
      rangeSimpleCellAddress.topLeftSimpleCellAddress
    )?.style;

    if (style) {
      for (const _ of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const __ of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          this.spreadsheet.data.setCellDataStyle(
            rangeSimpleCellAddress.topLeftSimpleCellAddress,
            style
          );
        }
      }
    }
  }

  getAreMergedCellsOverlapping(
    firstRangeSimpleCellAddress: RangeSimpleCellAddress,
    secondRangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    const isFirstOverlappingSecond =
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col;

    const isSecondOverlappingFirst =
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col;

    return isFirstOverlappingSecond || isSecondOverlappingFirst;
  }

  mergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const rangeSimpleCellAddress =
      this.sheet.getMinMaxRangeSimpleCellAddress(selectedCells);

    this.removeMergedCells(rangeSimpleCellAddress);
    this.addMergedCells(rangeSimpleCellAddress);
  }

  unMergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const rangeSimpleCellAddress =
      this.sheet.getMinMaxRangeSimpleCellAddress(selectedCells);

    this.removeMergedCells(rangeSimpleCellAddress);
  }
}

export default Merger;
