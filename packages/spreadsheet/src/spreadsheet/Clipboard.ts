import { SimpleCellRange } from 'hyperformula';
import { isEmpty } from 'lodash';
import RangeSimpleCellAddress from './sheet/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress from './sheet/cells/cell/SimpleCellAddress';
import Spreadsheet from './Spreadsheet';

class Clipboard {
  private sourceRange: RangeSimpleCellAddress | null = null;
  private isCut = false;

  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private async writeToClipboard(source: SimpleCellRange) {
    const rangeData = this.spreadsheet.hyperformula.getRangeSerialized(source);

    let clipboardText = '';

    rangeData.forEach((rowData) => {
      rowData.forEach((value) => {
        clipboardText += value ?? '';
      });
    });

    await navigator.clipboard.writeText(clipboardText);
  }

  async cut() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }

    this.sourceRange = cellRange;

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress,
    };

    this.spreadsheet.hyperformula.cut(source);
    this.isCut = true;

    await this.writeToClipboard(source);
  }

  async copy() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }

    this.sourceRange = cellRange;

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress,
    };

    this.spreadsheet.hyperformula.copy(source);

    await this.writeToClipboard(source);
  }

  paste() {
    const targetRange = this.getCellRangeForSelection(true);
    if (!targetRange || !this.sourceRange) {
      return;
    }

    const rangeData = this.spreadsheet.hyperformula.getFillRangeData(
      {
        start: this.sourceRange.topLeftSimpleCellAddress,
        end: this.sourceRange.bottomRightSimpleCellAddress,
      },
      {
        start: targetRange.topLeftSimpleCellAddress,
        end: targetRange.bottomRightSimpleCellAddress,
      },
      true
    );

    this.spreadsheet.pushToHistory(() => {
      rangeData.forEach((rowData, rowIndex) => {
        rowData.forEach((_, colIndex) => {
          let { row, col } = this.sourceRange!.topLeftSimpleCellAddress;

          row += rowIndex % this.sourceRange!.height();
          col += colIndex % this.sourceRange!.width();

          const soureSimpleCellAddress = new SimpleCellAddress(
            this.sourceRange!.topLeftSimpleCellAddress.sheet,
            row,
            col
          );

          const targetSimpleCellAddress = new SimpleCellAddress(
            targetRange.topLeftSimpleCellAddress.sheet,
            targetRange.topLeftSimpleCellAddress.row + rowIndex,
            targetRange.topLeftSimpleCellAddress.col + colIndex
          );

          const data = this.spreadsheet.data.spreadsheetData;
          const cell = data.cells?.[soureSimpleCellAddress.toCellId()];

          if (cell) {
            this.spreadsheet.data.setCell(targetSimpleCellAddress, cell);
          } else {
            this.spreadsheet.data.deleteCell(targetSimpleCellAddress);
          }

          if (this.isCut) {
            this.spreadsheet.data.deleteCell(soureSimpleCellAddress);
          }
        });
      });
    });

    this.spreadsheet.updateViewport();

    if (this.isCut) {
      this.sourceRange = null;
      this.isCut = false;
    }
  }

  private getCellRangeForSelection(
    expandSelectionForPaste = false
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
