import type { SimpleCellAddress, SimpleCellRange } from 'hyperformula';
import { isEmpty } from 'lodash';
import { getCellId } from './sheet/CellRenderer';
import Spreadsheet from './Spreadsheet';

const getHeightOfRange = (range: SimpleCellRange) => {
  return range.end.row - range.start.row + 1;
};

const getWidthOfRange = (range: SimpleCellRange) => {
  return range.end.col - range.start.col + 1;
};

const getArrayOfAddresses = (range: SimpleCellRange) => {
  const addresses: SimpleCellAddress[][] = [];

  for (let y = 0; y < getHeightOfRange(range); ++y) {
    addresses[y] = [];

    for (let x = 0; x < getWidthOfRange(range); ++x) {
      const value = {
        sheet: range.start.sheet,
        row: range.start.row + y,
        col: range.start.col + x,
      };

      addresses[y].push(value);
    }
  }
  return addresses;
};

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
    this.spreadsheet.hyperformula?.cut(cellRange);
    this.isCut = true;
  }

  copy() {
    const cellRange = this.getCellRangeForSelection();
    if (!cellRange) {
      return;
    }
    this.sourceRange = cellRange;
    this.spreadsheet.hyperformula?.copy(cellRange);
  }

  paste() {
    const targetRange = this.getCellRangeForSelection(true);
    if (!targetRange || !this.sourceRange) {
      return;
    }

    let pastedData = this.getRange(this.sourceRange, targetRange, true);

    this.spreadsheet.hyperformula?.setCellContents(
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

    const sheetData = this.spreadsheet.getActiveSheet()?.getData();
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
            this.spreadsheet.addToHistory();

            this.spreadsheet
              .getActiveSheet()
              ?.cellRenderer.deleteCellData(sourceCellId);
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

    this.spreadsheet.getActiveSheet()?.cellRenderer.setCellDataBatch(cellData);
    this.spreadsheet.getActiveSheet()?.updateViewport();
    this.isCut = false;
  }

  private getRange = (
    sourceRange: SimpleCellRange,
    targetRange: SimpleCellRange,
    offset: boolean
  ) => {
    const data = this.spreadsheet.data.sheetData[targetRange.start.sheet];

    return getArrayOfAddresses(targetRange).map((arr) =>
      arr.map((address) => {
        const row =
          ((((address.row - (offset ? targetRange : sourceRange).start.row) %
            getHeightOfRange(sourceRange)) +
            getHeightOfRange(sourceRange)) %
            getHeightOfRange(sourceRange)) +
          sourceRange.start.row;

        const col =
          ((((address.col - (offset ? targetRange : sourceRange).start.col) %
            getWidthOfRange(sourceRange)) +
            getWidthOfRange(sourceRange)) %
            getWidthOfRange(sourceRange)) +
          sourceRange.start.col;

        const cellId = this.spreadsheet.sheets
          .get(targetRange.start.sheet)!
          .cellRenderer.convertFromRowColIdToCell(row, col)
          .id();

        return data.cellsData?.[cellId].value;
      })
    );
  };

  private getCellRangeForSelection(
    expandSelectionForPaste: boolean = false
  ): SimpleCellRange | null {
    const selectedCells =
      this.spreadsheet.getActiveSheet()?.selector.selectedCells;

    if (
      isEmpty(selectedCells) ||
      (expandSelectionForPaste && !this.sourceRange)
    ) {
      return null;
    }

    const startCellAddress = this.spreadsheet
      .getActiveSheet()
      ?.cellRenderer.getCellHyperformulaAddress(selectedCells![0].attrs.id)!;

    let endCellAddress = this.spreadsheet
      .getActiveSheet()
      ?.cellRenderer.getCellHyperformulaAddress(
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
