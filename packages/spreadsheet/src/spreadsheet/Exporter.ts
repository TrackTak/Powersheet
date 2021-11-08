import type { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx';
import Spreadsheet from './Spreadsheet';
import { isNil } from 'lodash';
import { isText, isDate, isPercent } from 'numfmt';
import { SheetId } from './sheets/Sheets';
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress';
import SimpleCellAddress, {
  CellId,
} from './sheets/cells/cell/SimpleCellAddress';
import RowColAddress, {
  SheetRowColId,
} from './sheets/cells/cell/RowColAddress';
import { CellType, CellValue, FunctionPluginDefinition } from 'hyperformula';
// TODO: Make dynamic async import when https://github.com/parcel-bundler/parcel/issues/7268 is fixed
// @ts-ignore
import { writeFile, utils } from 'xlsx/dist/xlsx.mini.min';

export interface ICustomRegisteredPluginDefinition {
  implementedFunctions: FunctionPluginDefinition['implementedFunctions'];
  aliases?: FunctionPluginDefinition['aliases'];
}

class Exporter {
  spreadsheet!: Spreadsheet;

  constructor(
    public customRegisteredPluginDefinitions: ICustomRegisteredPluginDefinition[]
  ) {}

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  private getWorksheet(sheetId: SheetId) {
    const worksheet: WorkSheet = {};

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(sheetId, 0, 0),
      new SimpleCellAddress(sheetId, 0, 0)
    );

    const cellIds =
      this.spreadsheet.data.spreadsheetData.sheets?.[sheetId].cells;

    for (const key in cellIds) {
      const cellId = key as CellId;
      const cells = this.spreadsheet.data.spreadsheetData.cells!;
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
      const cell = { ...cells[cellId] };
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

      worksheet[cellString] = {
        ...worksheet[cellString],
      };

      if (
        this.spreadsheet.hyperformula.doesCellHaveFormula(simpleCellAddress)
      ) {
        worksheet[cellString].f = cell.value?.toString()?.slice(1);

        const setFormula = (functionName: string) => {
          // TODO: Not perfect regex, doesn't handle nested custom functions
          const regex = new RegExp(`${functionName}\\(.*?\\)`, 'g');
          const matches = worksheet[cellString].f?.match(regex) ?? [];

          // Replace any custom functon calls with
          // the actual value because excel won't support
          // custom functions natively
          matches.forEach((match: string) => {
            let formulaResult = this.spreadsheet.hyperformula.calculateFormula(
              `=${match}`,
              simpleCellAddress.sheet
            );

            const cellType =
              this.spreadsheet.hyperformula.getCellType(simpleCellAddress);

            if (
              cellType === CellType.ARRAY ||
              cellType === CellType.ARRAYFORMULA
            ) {
              (formulaResult as CellValue[][]).forEach((colData, row) => {
                colData.forEach((data, col) => {
                  const cellString = new SimpleCellAddress(
                    simpleCellAddress.sheet,
                    simpleCellAddress.row + row,
                    simpleCellAddress.col + col
                  ).addressToString();

                  let type;

                  if (isNil(data)) {
                    type = 'z';
                  } else if (isNaN(Number(data))) {
                    type = 's';
                  } else {
                    type = 'n';
                  }

                  worksheet[cellString] = {
                    ...worksheet[cellString],
                    t: type,
                    v: data,
                  };
                });
              });
              delete worksheet[cellString].f;
              delete cell.value;
            } else if (cellType === CellType.FORMULA) {
              if (typeof formulaResult === 'string') {
                if (formulaResult) {
                  formulaResult = `"${formulaResult}"`;
                } else {
                  formulaResult = '0';
                }
              }

              worksheet[cellString].f = worksheet[cellString].f?.replace(
                match,
                formulaResult?.toString() ?? ''
              );

              worksheet[cellString].t = 's';
            }
          });
        };

        this.customRegisteredPluginDefinitions.forEach(
          ({ aliases, implementedFunctions }) => {
            Object.keys(aliases ?? {}).forEach((key) => {
              setFormula(key);
            });

            Object.keys(implementedFunctions).forEach((key) => {
              setFormula(key);
            });
          }
        );
      }

      const value = worksheet[cellString].v ?? cell?.value;

      let type;

      let textFormatPattern = cell?.textFormatPattern;

      if (isPercent(value)) {
        textFormatPattern = undefined;
      }

      if (isNil(value) && isNil(textFormatPattern)) {
        type = 'z';
      } else if (isText(textFormatPattern) || isNil(textFormatPattern)) {
        type = 's';
      } else if (isDate(textFormatPattern)) {
        type = 'd';
      } else {
        type = 'n';
      }

      if (value) {
        worksheet[cellString].v = value;
      }

      worksheet[cellString].z = textFormatPattern;
      worksheet[cellString].t = type;

      if (mergedCell) {
        if (!worksheet['!merges']) {
          worksheet['!merges'] = [];
        }

        worksheet['!merges'].push({
          s: {
            r: mergedCell.row.x,
            c: mergedCell.col.x,
          },
          e: {
            r: mergedCell.row.y,
            c: mergedCell.col.y,
          },
        });
      }
    }

    worksheet[
      '!ref'
    ] = `${rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()}:${rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()}`;

    const colInfos: ColInfo[] = [];
    const rowInfos: RowInfo[] = [];
    const colIds =
      this.spreadsheet.data.spreadsheetData.sheets?.[sheetId].cols ?? {};
    const rowIds =
      this.spreadsheet.data.spreadsheetData.sheets?.[sheetId].rows ?? {};

    Object.keys(colIds).forEach((key) => {
      const sheetColId = key as SheetRowColId;
      const address = RowColAddress.sheetRowColIdToAddress(sheetColId);
      const col = this.spreadsheet.data.spreadsheetData.cols![sheetColId];

      colInfos[address.rowCol] = {
        wpx: col.size,
      };
    });

    Object.keys(rowIds).forEach((key) => {
      const sheetRowId = key as SheetRowColId;
      const address = RowColAddress.sheetRowColIdToAddress(sheetRowId);
      const row = this.spreadsheet.data.spreadsheetData.rows![sheetRowId];

      rowInfos[address.rowCol] = {
        hpx: row.size,
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

  exportWorkbook() {
    const workbook = this.getWorkbook(utils);

    writeFile(
      workbook,
      this.spreadsheet.data.spreadsheetData.exportSpreadsheetName ??
        this.spreadsheet.options.exportSpreadsheetName
    );
  }
}

export default Exporter;
