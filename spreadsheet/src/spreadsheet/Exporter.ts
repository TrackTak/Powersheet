import { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx';
import Spreadsheet from './Spreadsheet';
import { isNil } from 'lodash';
import { isText, isDate } from 'numfmt';
import { SheetId } from './sheet/Sheet';
import RangeSimpleCellAddress from './sheet/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress, {
  CellId,
} from './sheet/cells/cell/SimpleCellAddress';
import { SheetRowColId } from './sheet/cells/cell/RowColAddress';

class Export {
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private getWorksheet(sheetId: SheetId) {
    const worksheet: WorkSheet = {};

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(sheetId, 0, 0),
      new SimpleCellAddress(sheetId, 0, 0)
    );

    for (const key in this.spreadsheet.data.spreadsheetData.cells) {
      const cellId = key as CellId;
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
      const cell = this.spreadsheet.data.spreadsheetData.cells![cellId];
      const cellString = simpleCellAddress.addressToString();
      const mergedCell =
        this.spreadsheet.data.spreadsheetData.mergedCells?.[cellId];

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

      const textFormatPattern = cell?.textFormatPattern;

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

      if (mergedCell) {
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

    const colInfos: ColInfo[] = [];
    const rowInfos: RowInfo[] = [];
    const cols = this.spreadsheet.data.spreadsheetData.cols ?? {};
    const rows = this.spreadsheet.data.spreadsheetData.rows ?? {};

    Object.keys(cols).forEach((key) => {
      const sheetRowColId = key as SheetRowColId;
      const index = parseInt(key, 10);
      const value = cols[sheetRowColId];

      colInfos[index] = {
        wpx: value.size,
      };
    });

    Object.keys(rows).forEach((key) => {
      const sheetRowColId = key as SheetRowColId;
      const index = parseInt(key, 10);
      const value = rows[sheetRowColId];

      rowInfos[index] = {
        hpx: value.size,
      };
    });

    worksheet['!cols'] = colInfos;
    worksheet['!rows'] = rowInfos;

    return worksheet;
  }

  private getWorkbook(utils: XLSX$Utils) {
    const workbook = utils.book_new();

    Object.keys(this.spreadsheet.data.spreadsheetData.sheets ?? {}).forEach(
      (key) => {
        const sheetIndex = parseInt(key, 10);
        const sheetData =
          this.spreadsheet.data.spreadsheetData.sheets![sheetIndex];
        const worksheet = this.getWorksheet(sheetData.id);

        utils.book_append_sheet(workbook, worksheet, sheetData.sheetName);
      }
    );

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
