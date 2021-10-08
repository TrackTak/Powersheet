import { isEmpty } from 'lodash';
import RangeSimpleCellAddress from './sheet/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress from './sheet/cells/cell/SimpleCellAddress';
import Spreadsheet from './Spreadsheet';

class Clipboard {
  private sourceRange: RangeSimpleCellAddress | null = null;
  private isCut: boolean = false;

  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  cut() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }
    this.sourceRange = cellRange;
    this.spreadsheet.hyperformula?.cut({
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress,
    });
    this.isCut = true;
  }

  copy() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }
    this.sourceRange = cellRange;
    this.spreadsheet.hyperformula?.copy({
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress,
    });
  }

  paste() {
    const targetRange = this.getCellRangeForSelection(true);
    if (!targetRange || !this.sourceRange) {
      return;
    }

    let rangeData = this.getRange(this.sourceRange, targetRange);

    this.spreadsheet.hyperformula?.setCellContents(
      targetRange.topLeftSimpleCellAddress,
      rangeData.map((arr) => arr.map((cell) => cell?.value))
    );

    const cellsData = rangeData.reduce((all, rowData, rowIndex) => {
      const colData = rowData.reduce((cellsData, cellData, colIndex) => {
        let row = this.sourceRange!.topLeftSimpleCellAddress.row;
        let col = this.sourceRange!.topLeftSimpleCellAddress.col;

        row += rowIndex % this.sourceRange!.height();
        col += colIndex % this.sourceRange!.width();

        const targetCellId = SimpleCellAddress.rowColToCellId(
          targetRange.topLeftSimpleCellAddress.row + rowIndex,
          targetRange.topLeftSimpleCellAddress.col + colIndex
        );

        if (this.isCut) {
          this.spreadsheet.data.deleteCellData(
            new SimpleCellAddress(
              this.sourceRange!.topLeftSimpleCellAddress.sheet,
              row,
              col
            )
          );
        }

        return {
          ...cellsData,
          [targetCellId]: cellData,
        };
      }, {});

      return {
        ...all,
        ...colData,
      };
    }, {});

    this.spreadsheet.data.setCellDataBatch(
      this.spreadsheet.convertCellsDataToCellsMap(cellsData)
    );
    this.spreadsheet.updateViewport();

    if (this.isCut) {
      this.sourceRange = null;
      this.isCut = false;
    }
  }

  private getRange = (
    sourceRange: RangeSimpleCellAddress,
    targetRange: RangeSimpleCellAddress
  ) => {
    const data = this.spreadsheet.data.getSheetData(
      sourceRange.topLeftSimpleCellAddress.sheet
    );

    return targetRange.getArrayOfAddresses().map((arr) =>
      arr.map((targetSimpleCellAddress) => {
        const height = sourceRange.height();
        const width = sourceRange.width();

        const row =
          ((((targetSimpleCellAddress.row -
            targetRange.topLeftSimpleCellAddress.row) %
            height) +
            height) %
            height) +
          sourceRange.topLeftSimpleCellAddress.row;

        const col =
          ((((targetSimpleCellAddress.col -
            targetRange.topLeftSimpleCellAddress.col) %
            width) +
            width) %
            width) +
          sourceRange.topLeftSimpleCellAddress.col;

        const sourceCellId = new SimpleCellAddress(
          sourceRange.topLeftSimpleCellAddress.sheet,
          row,
          col
        ).toCellId();

        return data.cellsData?.[sourceCellId];
      })
    );
  };

  private getCellRangeForSelection(
    expandSelectionForPaste: boolean = false
  ): RangeSimpleCellAddress | null {
    const selectedCells =
      this.spreadsheet.getActiveSheet()?.selector.selectedCells;

    if (
      isEmpty(selectedCells) ||
      (expandSelectionForPaste && !this.sourceRange)
    ) {
      return null;
    }

    const sheet = this.spreadsheet.getActiveSheet()!;
    const firstSelectedCell = selectedCells![0];
    const lastSelectedCell = selectedCells![selectedCells!.length - 1];

    const topLeftSimpleCellAddress = new SimpleCellAddress(
      sheet.sheetId,
      firstSelectedCell.simpleCellAddress.row,
      firstSelectedCell.simpleCellAddress.col
    );

    const bottomRightSimpleCellAddress = new SimpleCellAddress(
      sheet.sheetId,
      lastSelectedCell.simpleCellAddress.row,
      lastSelectedCell.simpleCellAddress.col
    );

    if (expandSelectionForPaste) {
      const sourceRangeColSize =
        this.sourceRange!.bottomRightSimpleCellAddress.col -
        this.sourceRange!.topLeftSimpleCellAddress.col;

      const sourceRangeRowSize =
        this.sourceRange!.bottomRightSimpleCellAddress.row -
        this.sourceRange!.topLeftSimpleCellAddress.row;

      const targetRangeColSize =
        bottomRightSimpleCellAddress.col - topLeftSimpleCellAddress.col;
      const targetRangeRowSize =
        bottomRightSimpleCellAddress.row - topLeftSimpleCellAddress.row;

      if (this.isCut || targetRangeColSize < sourceRangeColSize) {
        bottomRightSimpleCellAddress.col =
          topLeftSimpleCellAddress.col + sourceRangeColSize;
      }
      if (this.isCut || targetRangeRowSize < sourceRangeRowSize) {
        bottomRightSimpleCellAddress.row =
          topLeftSimpleCellAddress.row + sourceRangeRowSize;
      }
    }

    return new RangeSimpleCellAddress(
      topLeftSimpleCellAddress,
      bottomRightSimpleCellAddress
    );
  }
}

export default Clipboard;
