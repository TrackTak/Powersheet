import BottomBar from '../bottomBar/BottomBar';
import Sheet, { IData } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

export type SheetId = string;

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  bottomBar?: BottomBar;
  activeSheet: Sheet;
  sheetIndex: number;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.sheets = new Map();
    this.sheetIndex = 1;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    if (this.spreadsheet.data?.length) {
      const firstSheetName = this.spreadsheet.data[0].sheetName;

      this.spreadsheet.data.forEach((data) => {
        this.createNewSheet(data);
      });

      this.switchSheet(firstSheetName);

      this.activeSheet = this.sheets.get(firstSheetName)!;
    } else {
      const sheetName = this.getSheetName();

      this.createNewSheet({
        sheetName,
      });

      this.switchSheet(sheetName);

      this.activeSheet = this.sheets.get(sheetName)!;
    }

    this.sheetsGroupEl.appendChild(this.sheetsEl);
    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);

    this.bottomBar = new BottomBar(this);
  }

  getSheetName() {
    return `Sheet${this.sheetIndex}`;
  }

  switchSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId);

    if (!sheet) {
      throw new Error(`No sheet with the id ${sheetId} exists.`);
    }

    if (this.activeSheet) {
      this.activeSheet.hide();
    }

    sheet.show();

    this.activeSheet = sheet;
  }

  createNewSheet(data: IData) {
    const sheet = new Sheet(this, data);

    this.sheets.set(data.sheetName, sheet);

    sheet.hide();

    this.sheetIndex++;
  }
}

export default SheetsGroup;
