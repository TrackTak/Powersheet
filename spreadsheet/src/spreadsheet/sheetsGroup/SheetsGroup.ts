import BottomBar from '../bottomBar/BottomBarNew';
import Sheet, { IData } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

export type SheetId = string;

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  bottomBar: BottomBar;
  activeSheetId!: SheetId;
  sheetIndex: number;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.sheets = new Map();
    this.sheetIndex = 1;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    this.bottomBar = new BottomBar(this);

    if (this.spreadsheet.data?.length) {
      const sheetName = this.spreadsheet.data[0].sheetName;

      this.spreadsheet.data.forEach((data) => {
        this.createNewSheet(data);
      });

      this.switchSheet(sheetName);
    } else {
      const sheetName = this.getSheetName();

      this.createNewSheet({
        sheetName,
      });

      this.switchSheet(sheetName);
    }

    this.sheetsGroupEl.prepend(this.sheetsEl);
    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);
  }

  getSheetName() {
    return `Sheet${this.sheetIndex}`;
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;

    sheet.destroy();

    this.sheets.delete(sheetId);

    this.bottomBar.updateSheetTabs();
  }

  switchSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;

    if (this.activeSheetId) {
      const activeSheet = this.sheets.get(this.activeSheetId)!;

      activeSheet.hide();
    }

    sheet.show();

    this.activeSheetId = sheetId;

    this.bottomBar.updateSheetTabs();
  }

  createNewSheet(data: IData) {
    const sheet = new Sheet(this, data);

    this.sheets.set(data.sheetName, sheet);

    sheet.hide();

    this.sheetIndex++;

    this.bottomBar.updateSheetTabs();
  }
}

export default SheetsGroup;
