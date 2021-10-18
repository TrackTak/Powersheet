import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress';
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress';
import Spreadsheet from '../Spreadsheet';

class Merger {
  associatedMergedCellAddressMap: Map<CellId, RangeSimpleCellAddress>;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.associatedMergedCellAddressMap = new Map();
  }

  getIsCellPartOfMerge(simpleCellAddress: SimpleCellAddress) {
    return this.associatedMergedCellAddressMap.has(
      simpleCellAddress.toCellId()
    );
  }

  setAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId();
    const mergedCell =
      this.spreadsheet.data.spreadsheetData.mergedCells?.[cellId];

    if (mergedCell) {
      const { row, col } = mergedCell;

      const rangeSimpleCellAddress = new RangeSimpleCellAddress(
        new SimpleCellAddress(simpleCellAddress.sheet, row.x, col.x),
        new SimpleCellAddress(simpleCellAddress.sheet, row.y, col.y)
      );

      for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          const associatedSimpleCellAddress = new SimpleCellAddress(
            simpleCellAddress.sheet,
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
    const sheet = rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet;
    const mergedCellId =
      rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId();
    const existingTopLeftCell =
      this.spreadsheet.data.spreadsheetData.cells?.[mergedCellId];

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

    this.spreadsheet.hyperformula.batch(() => {
      for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          const simpleCellAddress = new SimpleCellAddress(sheet, ri, ci);

          if (simpleCellAddress.toCellId() !== mergedCellId) {
            this.spreadsheet.data.deleteCell(simpleCellAddress);
          }
        }
      }

      if (existingTopLeftCell) {
        this.spreadsheet.data.setCell(
          rangeSimpleCellAddress.topLeftSimpleCellAddress,
          existingTopLeftCell
        );
      }
    });

    this.spreadsheet.sheets.get(sheet)!.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress;

    this.spreadsheet.updateViewport();
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const sheet = rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet;
    const mergedCells = this.spreadsheet.data.spreadsheetData.mergedCells;

    if (
      this.spreadsheet.data.getIsCellAMergedCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      )
    ) {
      const cell =
        this.spreadsheet.data.spreadsheetData.cells?.[
          rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
        ];

      if (cell) {
        this.spreadsheet.hyperformula.batch(() => {
          for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom(
            'row'
          )) {
            for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom(
              'col'
            )) {
              const associatedSimpleCellAddress = new SimpleCellAddress(
                sheet,
                ri,
                ci
              );

              this.spreadsheet.data.setCell(associatedSimpleCellAddress, cell);
            }
          }
        });
      }
    }

    this.spreadsheet.sheets
      .get(sheet)!
      .cells.cellsMap.forEach((cell, cellId) => {
        const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);

        if (
          this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress) &&
          mergedCells
        ) {
          const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
            rangeSimpleCellAddress,
            cell.rangeSimpleCellAddress
          );

          if (areMergedCellsOverlapping) {
            this.spreadsheet.data.deleteMergedCell(simpleCellAddress);
          }
        }
      });

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
    const sheet = this.spreadsheet.getActiveSheet()!;
    const selectedCells = sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const rangeSimpleCellAddress =
      sheet.getMinMaxRangeSimpleCellAddress(selectedCells);

    this.spreadsheet.pushToHistory(() => {
      this.removeMergedCells(rangeSimpleCellAddress);
      this.addMergedCells(rangeSimpleCellAddress);
    });
  }

  unMergeSelectedCells() {
    const sheet = this.spreadsheet.getActiveSheet()!;
    const selectedCells = sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const rangeSimpleCellAddress =
      sheet.getMinMaxRangeSimpleCellAddress(selectedCells);

    this.spreadsheet.pushToHistory(() => {
      this.removeMergedCells(rangeSimpleCellAddress);
    });
  }
}

export default Merger;
