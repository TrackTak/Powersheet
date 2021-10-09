import Sheet from './Sheet';
import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress';
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress';
import Spreadsheet from '../Spreadsheet';

class Merger {
  associatedMergedCellAddressMap: Map<CellId, RangeSimpleCellAddress>;
  spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.associatedMergedCellAddressMap = new Map();
  }

  setAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const mergedCell =
      this.spreadsheet.data.spreadsheetData.mergedCells?.[cellId];

    if (mergedCell) {
      const sheetId = this.sheet.sheetId;
      const { row, col } = mergedCell;

      const rangeSimpleCellAddress = new RangeSimpleCellAddress(
        new SimpleCellAddress(sheetId, row.x, col.x),
        new SimpleCellAddress(sheetId, row.y, col.y)
      );

      for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          const associatedSimpleCellAddress = new SimpleCellAddress(
            sheetId,
            ri,
            ci
          );

          this.associatedMergedCellAddressMap.set(
            associatedSimpleCellAddress.toCellId(),
            rangeSimpleCellAddress
          );
        }
      }
    }
  }

  addMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const mergedCellId =
      rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId();
    const existingTopLeftCellStyle =
      this.spreadsheet.data.spreadsheetData.cellStyles?.[mergedCellId];

    this.spreadsheet.data.setMergedCell(
      rangeSimpleCellAddress.topLeftSimpleCellAddress,
      {
        row: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
        },
        col: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
        },
      }
    );

    for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
      for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(
          this.sheet.sheetId,
          ri,
          ci
        );
        const cellId = simpleCellAddress.toCellId();

        if (simpleCellAddress.toCellId() !== mergedCellId) {
          delete this.spreadsheet.data.spreadsheetData.cells?.[cellId];
        }
      }
    }

    if (existingTopLeftCellStyle) {
      this.spreadsheet.data.setCellStyle(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        existingTopLeftCellStyle
      );
    }

    this.sheet.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress;

    this.spreadsheet.updateViewport();
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const mergedCells = this.spreadsheet.data.spreadsheetData.mergedCells;

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
          const cellId = simpleCellAddress.toCellId();

          delete mergedCells[cellId];
        }
      }
    });

    if (
      this.spreadsheet.data.getIsCellAMergedCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      )
    ) {
      const style =
        this.spreadsheet.data.spreadsheetData.cellStyles?.[
          rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
        ];

      if (style) {
        for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
          for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom(
            'col'
          )) {
            const associatedSimpleCellAddress = new SimpleCellAddress(
              rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet,
              ri,
              ci
            );

            this.spreadsheet.data.setCellStyle(
              associatedSimpleCellAddress,
              style
            );
          }
        }
      }
    }

    this.spreadsheet.updateViewport();
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
