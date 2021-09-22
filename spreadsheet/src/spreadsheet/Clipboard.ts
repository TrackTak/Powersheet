import { SimpleCellRange } from 'hyperformula';
import { isEmpty } from 'lodash';
import { getCellId } from './sheetsGroup/sheet/CellRenderer';
import Spreadsheet from './Spreadsheet';

class Clipboard {
  private sourceRange: SimpleCellRange | null = null;
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
    this.spreadsheet.hyperformula.cut(cellRange);
    this.isCut = true;
  }

  copy() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }
    this.sourceRange = cellRange;
    this.spreadsheet.hyperformula.copy(cellRange);
  }

  paste() {
    const targetRange = this.getCellRangeForSelection(true);
    if (!targetRange || !this.sourceRange) {
      return;
    }

    const pastedData = this.spreadsheet.hyperformula.getFillRangeData(
      this.sourceRange,
      targetRange,
      true
    );
    this.spreadsheet.hyperformula.setCellContents(
      targetRange.start,
      pastedData
    );

    const getIndex = (
      cellRange: SimpleCellRange,
      rowCol: 'row' | 'col',
      currentIndex: number
    ) => {
      const index =
        currentIndex % (cellRange.end[rowCol] - cellRange.start[rowCol] + 1);

      const result = cellRange.start[rowCol] + index;

      return result;
    };

    const sheetData = this.spreadsheet.focusedSheet?.getData();
    const cellData = pastedData.reduce((all, rowData, rowIndex) => {
      const colData = rowData.reduce(
        (allColumnData, currentValue, columnIndex) => {
          const sourceRowIndex = getIndex(this.sourceRange!, 'row', rowIndex);
          const sourceColIndex = getIndex(
            this.sourceRange!,
            'col',
            columnIndex
          );
          const sourceCellId = getCellId(sourceRowIndex, sourceColIndex);
          const targetCellId = getCellId(
            targetRange.start.row + rowIndex,
            targetRange.start.col + columnIndex
          );
          const sourceCellData = sheetData?.cellsData?.[sourceCellId] ?? {};

          if (this.isCut) {
            this.spreadsheet.focusedSheet?.cellRenderer.deleteCellData(
              sourceCellId
            );
          }
          this.spreadsheet.focusedSheet?.cellRenderer.deleteCellData(
            targetCellId
          );

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

    this.spreadsheet.focusedSheet?.cellRenderer.setCellDataBatch(cellData);
    this.spreadsheet.focusedSheet?.updateViewport();
    this.isCut = false;
  }

  private getCellRangeForSelection(
    expandSelectionForPaste: boolean = false
  ): SimpleCellRange | null {
    const selectedCells = this.spreadsheet.focusedSheet?.selector.selectedCells;

    if (
      isEmpty(selectedCells) ||
      (expandSelectionForPaste && !this.sourceRange)
    ) {
      return null;
    }

    const startCellAddress =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellHyperformulaAddress(
        selectedCells![0].attrs.id
      )!;

    let endCellAddress =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellHyperformulaAddress(
        selectedCells![selectedCells!.length - 1].attrs.id
      )!;

    if (expandSelectionForPaste) {
      const sourceRangeColSize =
        this.sourceRange!.end.col - this.sourceRange!.start.col;
      const sourceRangeRowSize =
        this.sourceRange!.end.row - this.sourceRange!.start.row;
      const targetRangeColSize = endCellAddress.col - startCellAddress.col;
      const targetRangeRowSize = endCellAddress.row - startCellAddress.row;

      if (this.isCut || targetRangeColSize < sourceRangeColSize) {
        endCellAddress.col = startCellAddress.col + sourceRangeColSize;
      }
      if (this.isCut || targetRangeRowSize < sourceRangeRowSize) {
        endCellAddress.row = startCellAddress.row + sourceRangeRowSize;
      }
    }

    return {
      start: {
        sheet: startCellAddress?.sheet,
        col: startCellAddress.col,
        row: startCellAddress.row,
      },
      end: {
        sheet: endCellAddress.sheet,
        col: endCellAddress.col,
        row: endCellAddress.row,
      },
    };
  }
}

export default Clipboard;
