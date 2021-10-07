import { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx';
import Spreadsheet from './Spreadsheet';
import { isNil } from 'lodash';
import { isText, isDate } from 'numfmt';
import Sheet from './sheet/Sheet';
import { ISheetData } from './sheet/Data';
import RangeSimpleCellAddress from './sheet/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress, {
  CellId,
} from './sheet/cells/cell/SimpleCellAddress';

class Export {
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private getWorksheet(sheet: Sheet, data: ISheetData) {
    const worksheet: WorkSheet = {};
    const cellsData = data.cellsData ?? {};

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(sheet.sheetId, 0, 0),
      new SimpleCellAddress(sheet.sheetId, 0, 0)
    );

    for (const key in cellsData) {
      const cellId = key as CellId;
      const cell = cellsData[cellId];
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(
        sheet.sheetId,
        cellId
      );
      const cellString = simpleCellAddress.addressToString();

      rangeSimpleCellAddress.topLeftSimpleCellAddress.row = Math.min(
        simpleCellAddress.row,
        rangeSimpleCellAddress.topLeftSimpleCellAddress.row
      );
      rangeSimpleCellAddress.topLeftSimpleCellAddress.col = Math.min(
        simpleCellAddress.col,
        rangeSimpleCellAddress.topLeftSimpleCellAddress.col
      );

      rangeSimpleCellAddress.bottomRightSimpleCellAddress.row = Math.max(
        simpleCellAddress.row,
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.row
      );
      rangeSimpleCellAddress.bottomRightSimpleCellAddress.col = Math.max(
        simpleCellAddress.col,
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.col
      );

      let type;

      const textFormatPattern = cell.style?.textFormatPattern;

      if (isNil(cell.value) && isNil(textFormatPattern)) {
        type = 'z';
      } else if (isText(textFormatPattern) || isNil(textFormatPattern)) {
        type = 's';
      } else if (isDate(textFormatPattern)) {
        type = 'd';
      } else {
        type = 'n';
      }

      worksheet[cellString] = {
        z: textFormatPattern,
        v: cell.value,
        t: type,
      };

      if (cell.value?.charAt(0) === '=') {
        worksheet[cellString].f = cell.value!.slice(1);
      }
    }

    for (const [simpleCellAddressFormat, rangeSimpleCellAddress] of sheet.merger
      .associatedMergedCellAddressMap) {
      const isTopLeftCell = this.spreadsheet.data.getIsCellAMergedCell(
        SimpleCellAddress.stringFormatToAddress(simpleCellAddressFormat)
      );

      if (isTopLeftCell) {
        if (!worksheet['!merges']) {
          worksheet['!merges'] = [];
        }

        worksheet['!merges'].push({
          s: {
            r: rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
            c: rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
          },
          e: {
            r: rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
            c: rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
          },
        });
      }
    }

    worksheet[
      '!ref'
    ] = `${rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()}:${rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()}`;

    const cols: ColInfo[] = [];
    const rows: RowInfo[] = [];
    const colSizes = data.col?.sizes ?? {};
    const rowSizes = data.row?.sizes ?? {};

    Object.keys(colSizes).forEach((key) => {
      const index = parseInt(key, 10);
      const value = colSizes[index];

      cols[index] = {
        wpx: value,
      };
    });

    Object.keys(rowSizes).forEach((key) => {
      const index = parseInt(key, 10);
      const value = rowSizes[index];

      rows[index] = {
        hpx: value,
      };
    });

    worksheet['!cols'] = cols;
    worksheet['!rows'] = rows;

    return worksheet;
  }

  private getWorkbook(utils: XLSX$Utils) {
    const workbook = utils.book_new();

    this.spreadsheet.data.spreadsheetData.sheetData.forEach((data) => {
      const sheet = Array.from(this.spreadsheet.sheets.values()).find(
        (x) => x.spreadsheet.data.getSheetData().sheetName === data.sheetName
      )!;

      const worksheet = this.getWorksheet(sheet, data);

      utils.book_append_sheet(workbook, worksheet, data.sheetName);
    });

    return workbook;
  }

  async exportWorkbook() {
    const { writeFile, utils } = await import('xlsx');

    const workbook = this.getWorkbook(utils);

    writeFile(
      workbook,
      this.spreadsheet.data.spreadsheetData.exportSpreadsheetName ??
        this.spreadsheet.options.exportSpreadsheetName
    );
  }
}

export default Export;
