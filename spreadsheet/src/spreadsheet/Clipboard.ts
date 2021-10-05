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

    let pastedData = this.getRange(this.sourceRange, targetRange, true);

    this.spreadsheet.hyperformula?.setCellContents(
      targetRange.topLeftSimpleCellAddress,
      pastedData
    );

    const sheetData = this.spreadsheet.data.getSheetData();
    const cellDatas = pastedData.reduce((all, rowData, rowIndex) => {
      const colData = rowData.reduce(
        (allColumnData, currentValue, colIndex) => {
          this.sourceRange!.topLeftSimpleCellAddress.row +=
            rowIndex % this.sourceRange!.height();

          this.sourceRange!.topLeftSimpleCellAddress.col +=
            colIndex % this.sourceRange!.width();

          const sourceCellId =
            this.sourceRange!.topLeftSimpleCellAddress.addressToCellId();
          const targetCellId = SimpleCellAddress.rowColToCellId(
            targetRange.topLeftSimpleCellAddress.row + rowIndex,
            targetRange.topLeftSimpleCellAddress.col + colIndex
          );

          const sourceCellData = sheetData?.cellsData?.[sourceCellId] ?? {};

          if (this.isCut) {
            this.spreadsheet.data.deleteCellData(
              this.sourceRange!.topLeftSimpleCellAddress
            );
          }

          return {
            ...allColumnData,
            [targetCellId]: {
              ...sourceCellData,
              value: currentValue,
            },
          };
        },
        {}
      );

      return {
        ...all,
        ...colData,
      };
    }, {});

    this.spreadsheet.data.setCellDataBatch(cellDatas);
    this.spreadsheet.getActiveSheet()?.updateViewport();
    this.isCut = false;
  }

  private getRange = (
    sourceRange: RangeSimpleCellAddress,
    targetRange: RangeSimpleCellAddress,
    offset: boolean
  ) => {
    const data = this.spreadsheet.data.getSheetData(
      targetRange.topLeftSimpleCellAddress.sheet
    );

    return targetRange.getArrayOfAddresses().map((arr) =>
      arr.map((address) => {
        const height = sourceRange.height();
        const width = sourceRange.width();

        const row =
          ((((address.row -
            (offset ? targetRange : sourceRange).topLeftSimpleCellAddress.row) %
            height) +
            height) %
            height) +
          sourceRange.topLeftSimpleCellAddress.row;

        const col =
          ((((address.col -
            (offset ? targetRange : sourceRange).topLeftSimpleCellAddress.col) %
            width) +
            width) %
            width) +
          sourceRange.topLeftSimpleCellAddress.col;

        const cellId = new SimpleCellAddress(
          targetRange.topLeftSimpleCellAddress.sheet,
          row,
          col
        ).addressToCellId();

        return data.cellsData?.[cellId].value;
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
