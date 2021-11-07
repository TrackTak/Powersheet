import {
  SimpleCellAddress as HFSimpleCellAddress,
  SimpleCellRange,
} from 'hyperformula';
// @ts-ignore
import { isSimpleCellAddress } from 'hyperformula/es/Cell';
import { isEmpty } from 'lodash';
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress from './sheets/cells/cell/SimpleCellAddress';
import Sheets from './sheets/Sheets';
import Spreadsheet from './Spreadsheet';

class Clipboard {
  sourceRange: RangeSimpleCellAddress | null = null;
  isCut = false;
  spreadsheet: Spreadsheet;

  constructor(public sheets: Sheets) {
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;
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
    const sourceRange = this.sourceRange;

    if (!targetRange || !sourceRange) {
      return;
    }

    this.spreadsheet.pushToHistory(() => {
      const rangeData = this.spreadsheet.hyperformula.getFillRangeData(
        {
          start: sourceRange.topLeftSimpleCellAddress,
          end: sourceRange.bottomRightSimpleCellAddress,
        },
        {
          start: targetRange.topLeftSimpleCellAddress,
          end: targetRange.bottomRightSimpleCellAddress,
        },
        true
      );

      if (this.isCut) {
        const cellDependents = this.spreadsheet.hyperformula.getCellDependents({
          sheet: sourceRange.topLeftSimpleCellAddress.sheet,
          col: sourceRange.topLeftSimpleCellAddress.col,
          row: sourceRange.topLeftSimpleCellAddress.row,
        });

        // Because the source data changes then the formulas
        // can also change so we must paste to update dependent formulas
        this.spreadsheet.hyperformula.paste({
          sheet: targetRange.topLeftSimpleCellAddress.sheet,
          col: targetRange.topLeftSimpleCellAddress.col,
          row: targetRange.topLeftSimpleCellAddress.row,
        });

        cellDependents.forEach((value) => {
          if (isSimpleCellAddress(value)) {
            const hfSimpleCelladdress = value as HFSimpleCellAddress;
            const simpleCellAddress = new SimpleCellAddress(
              hfSimpleCelladdress.sheet,
              hfSimpleCelladdress.row,
              hfSimpleCelladdress.col
            );
            const cellId = simpleCellAddress.toCellId();
            const cellSerializedValue =
              this.spreadsheet.hyperformula.getCellSerialized(
                hfSimpleCelladdress
              );
            const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];

            if (cell?.value !== cellSerializedValue) {
              this.spreadsheet.data.setCell(
                simpleCellAddress,
                {
                  value: cellSerializedValue?.toString(),
                },
                false
              );
            }
          }
        });
      }

      // Loop backwards because otherwise setting subsequent
      // cells will incorrectly mess up iteration after it
      for (let ri = rangeData.length - 1; ri >= 0; ri--) {
        const rowData = rangeData[ri];

        for (let ci = rowData.length - 1; ci >= 0; ci--) {
          let { row, col } = this.sourceRange!.topLeftSimpleCellAddress;

          row += ri % this.sourceRange!.height();
          col += ci % this.sourceRange!.width();

          const soureSimpleCellAddress = new SimpleCellAddress(
            this.sourceRange!.topLeftSimpleCellAddress.sheet,
            row,
            col
          );

          const targetSimpleCellAddress = new SimpleCellAddress(
            targetRange.topLeftSimpleCellAddress.sheet,
            targetRange.topLeftSimpleCellAddress.row + ri,
            targetRange.topLeftSimpleCellAddress.col + ci
          );
          const sourceCellId = soureSimpleCellAddress.toCellId();
          const data = this.spreadsheet.data.spreadsheetData;
          const cell = data.cells?.[sourceCellId];
          const mergedCell = data.mergedCells?.[sourceCellId];

          if (rangeData.length !== 1 || rowData.length !== 1) {
            this.spreadsheet.data.deleteMergedCell(targetSimpleCellAddress);
          }

          this.spreadsheet.data.deleteCell(
            targetSimpleCellAddress,
            true,
            false
          );

          if (mergedCell) {
            const newMergedCell = {
              ...mergedCell,
              row: {
                x: targetSimpleCellAddress.row,
                y:
                  targetSimpleCellAddress.row +
                  (mergedCell.row.y - mergedCell.row.x),
              },
              col: {
                x: targetSimpleCellAddress.col,
                y:
                  targetSimpleCellAddress.col +
                  (mergedCell.col.y - mergedCell.col.x),
              },
            };

            this.spreadsheet.data.setMergedCell(
              targetSimpleCellAddress,
              newMergedCell
            );
          }

          if (cell) {
            this.spreadsheet.data.setCell(targetSimpleCellAddress, cell);
          }

          if (this.isCut) {
            this.spreadsheet.data.deleteCell(soureSimpleCellAddress);
          }
        }
      }
    });

    this.spreadsheet.updateViewport();

    if (this.isCut) {
      this.sourceRange = null;
      this.isCut = false;
    }
  }

  private getCellRangeForSelection(
    isPasting = false
  ): RangeSimpleCellAddress | null {
    const selectedCells = this.sheets.selector.selectedCells;

    if (isEmpty(selectedCells) || (isPasting && !this.sourceRange)) {
      return null;
    }

    const firstSelectedCell = selectedCells![0];
    const lastSelectedCell = selectedCells![selectedCells!.length - 1];

    const topLeftSimpleCellAddress = new SimpleCellAddress(
      this.sheets.activeSheetId,
      firstSelectedCell.simpleCellAddress.row,
      firstSelectedCell.simpleCellAddress.col
    );

    const bottomRightSimpleCellAddress = new SimpleCellAddress(
      this.sheets.activeSheetId,
      lastSelectedCell.simpleCellAddress.row,
      lastSelectedCell.simpleCellAddress.col
    );

    const setCellRangeForMerges = () => {
      selectedCells.forEach((cell) => {
        const cellId = cell.simpleCellAddress.toCellId();
        const mergedCell =
          this.spreadsheet.data.spreadsheetData.mergedCells?.[cellId];

        if (mergedCell) {
          bottomRightSimpleCellAddress.col = Math.max(
            mergedCell.col.y,
            bottomRightSimpleCellAddress.col
          );
          bottomRightSimpleCellAddress.row = Math.max(
            mergedCell.row.y,
            bottomRightSimpleCellAddress.row
          );
        }
      });
    };

    if (isPasting) {
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

      if (selectedCells.length !== 1) {
        setCellRangeForMerges();
      }
    } else {
      setCellRangeForMerges();
    }

    return new RangeSimpleCellAddress(
      topLeftSimpleCellAddress,
      bottomRightSimpleCellAddress
    );
  }
}

export default Clipboard;
