import { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx';
import {
  convertFromCellIdToRowCol,
  IRowColAddress,
} from './sheetsGroup/sheet/CellRenderer';
import Sheet, { IData } from './sheetsGroup/sheet/Sheet';
import Spreadsheet from './Spreadsheet';
import numfmt from 'numfmt';
import { isNil } from 'lodash';

class Export {
  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private getWorksheet(sheet: Sheet, data: IData) {
    const worksheet: WorkSheet = {};
    const cellsData = data.cellsData ?? {};
    const sheetId = this.spreadsheet.hyperformula.getSheetId(data.sheetName)!;

    let startRowColAddress: IRowColAddress | null = null;

    const endRowColAddress: IRowColAddress = {
      row: 0,
      col: 0,
    };

    Object.keys(cellsData).forEach((key) => {
      const cell = cellsData[key];
      const { row, col } = convertFromCellIdToRowCol(key);
      const address = {
        sheet: sheetId,
        row,
        col,
      };
      const cellId = this.spreadsheet.hyperformula.simpleCellAddressToString(
        address,
        address.sheet
      )!;

      startRowColAddress = {
        row: Math.min(row, startRowColAddress?.row ?? Infinity),
        col: Math.min(col, startRowColAddress?.col ?? Infinity),
      };

      endRowColAddress.row = Math.max(row, endRowColAddress.row);
      endRowColAddress.col = Math.max(col, endRowColAddress.col);

      let t;

      const textFormatPattern = cell.style?.textFormatPattern;

      if (isNil(cell.value) && isNil(textFormatPattern)) {
        t = 'z';
      } else if (numfmt.isText(textFormatPattern) || isNil(textFormatPattern)) {
        t = 's';
      } else if (numfmt.isDate(textFormatPattern)) {
        t = 'd';
      } else {
        t = 'n';
      }

      worksheet[cellId] = {
        z: textFormatPattern,
        v: cell.value,
        t,
      };

      if (this.spreadsheet.hyperformula.doesCellHaveFormula(address)) {
        worksheet[cellId].f = cell.value!.slice(1);
      }
    });

    for (const [cellId, { row, col }] of sheet.merger
      .associatedMergedCellIdMap) {
      const isTopLeftCell = sheet.merger.getIsTopLeftCell(cellId);

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
      this.spreadsheet.hyperformula.simpleCellAddressToString(
        {
          ...(startRowColAddress ?? {
            row: 0,
            col: 0,
          }),
          sheet: sheetId,
        },
        sheetId
      )!;

    const endCellAddress =
      this.spreadsheet.hyperformula.simpleCellAddressToString(
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
      const value = colSizes[parseInt(key, 10)];

      cols.push({
        wpx: value,
      });
    });

    Object.keys(rowSizes).forEach((key) => {
      const value = rowSizes[parseInt(key, 10)];

      rows.push({
        hpx: value,
      });
    });

    worksheet['!cols'] = cols;
    worksheet['!rows'] = rows;

    return worksheet;
  }

  private getWorkbook(utils: XLSX$Utils) {
    const workbook = utils.book_new();

    this.spreadsheet.data.forEach((sheetsGroupData, i) => {
      sheetsGroupData.forEach((data) => {
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

    console.log(workbook);

    writeFile(workbook, this.spreadsheet.options.exportSpreadsheetName);
  }
}

export default Export;
