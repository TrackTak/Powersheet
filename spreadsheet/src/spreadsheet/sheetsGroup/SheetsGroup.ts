import BottomBar from '../bottomBar/BottomBar';
import Sheet, { IData } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

export type SheetId = string;

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
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

    this.bottomBar = new BottomBar(this);

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

    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);
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
      this.activeSheet.destroy();
    }

    sheet.layer.show();

    this.activeSheet = sheet;
  }

  createNewSheet(data: IData) {
    const sheet = new Sheet(this, data);

    this.sheets.set(data.sheetName, sheet);

    this.sheetIndex++;
  }
}

export default SheetsGroup;
