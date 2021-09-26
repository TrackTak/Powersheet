import { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx';
import {
  convertFromCellIdToRowColId,
  IRowColAddress,
} from './sheetsGroup/sheet/CellRenderer';
import Sheet, { ISheetData } from './sheetsGroup/sheet/Sheet';
import Spreadsheet from './Spreadsheet';
import { isNil } from 'lodash';
import { isText, isDate } from 'numfmt';

class Export {
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private getWorksheet(sheet: Sheet, data: ISheetData) {
    const worksheet: WorkSheet = {};
    const cellsData = data.cellsData ?? {};
    const sheetId = this.spreadsheet.hyperformula?.getSheetId(data.sheetName)!;

    let startRowColAddress: Partial<IRowColAddress> = {
      row: 0,
      col: 0,
    };

    const endRowColAddress: IRowColAddress = {
      row: 0,
      col: 0,
    };

    for (const key in cellsData) {
      const cell = cellsData[key];
      const { row, col } = convertFromCellIdToRowColId(key);
      const address = {
        sheet: sheetId,
        row,
        col,
      };
      const cellId = this.spreadsheet.hyperformula?.simpleCellAddressToString(
        address,
        address.sheet
      )!;

      startRowColAddress = {
        row: Math.min(row, startRowColAddress.row ?? Infinity),
        col: Math.min(col, startRowColAddress.col ?? Infinity),
      };

      endRowColAddress.row = Math.max(row, endRowColAddress.row);
      endRowColAddress.col = Math.max(col, endRowColAddress.col);

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

      worksheet[cellId] = {
        z: textFormatPattern,
        v: cell.value,
        t: type,
      };

      if (this.spreadsheet.hyperformula?.doesCellHaveFormula(address)) {
        worksheet[cellId].f = cell.value!.slice(1);
      }
    }

    for (const [cellId, { row, col }] of sheet.merger
      .associatedMergedCellIdMap) {
      const isTopLeftCell = sheet.merger.getIsCellTopLeftMergedCell(cellId);

      if (isTopLeftCell) {
        if (!worksheet['!merges']) {
          worksheet['!merges'] = [];
        }

        worksheet['!merges'].push({
          s: {
            r: row.x,
            c: col.x,
          },
          e: {
            r: row.y,
            c: col.y,
          },
        });
      }
    }

    const startCellAddress =
      this.spreadsheet.hyperformula?.simpleCellAddressToString(
        {
          row: startRowColAddress.row ?? 0,
          col: startRowColAddress.col ?? 0,
          sheet: sheetId,
        },
        sheetId
      )!;

    const endCellAddress =
      this.spreadsheet.hyperformula?.simpleCellAddressToString(
        {
          ...endRowColAddress,
          sheet: sheetId,
        },
        sheetId
      )!;

    worksheet['!ref'] = `${startCellAddress}:${endCellAddress}`;

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

    this.spreadsheet.data.forEach((sheetsGroupData, i) => {
      sheetsGroupData.sheetData.forEach((data) => {
        const sheet = Array.from(
          this.spreadsheet.sheetsGroups[i].sheets.values()
        ).find((x) => x.getData().sheetName === data.sheetName)!;

        const worksheet = this.getWorksheet(sheet, data);

        utils.book_append_sheet(workbook, worksheet, data.sheetName);
      });
    });

    return workbook;
  }

  async exportWorkbook() {
    const { writeFile, utils } = await import('xlsx');

    const workbook = this.getWorkbook(utils);

    writeFile(workbook, this.spreadsheet.options.exportSpreadsheetName);
  }
}

export default Export;
