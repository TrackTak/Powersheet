import BottomBar from '../bottomBar/BottomBarNew';
import Sheet, { IData, ISheetData, SheetId } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

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

    const dataArray = Object.values(this.spreadsheet.data);

    if (dataArray.length) {
      const sheetName = dataArray[0].sheetName;

      dataArray.forEach((data) => {
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

  update() {
    this.bottomBar.updateSheetTabs();
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;

    sheet.destroy();

    this.sheets.delete(sheetId);

    delete this.spreadsheet.data[sheetId];

    this.update();
  }

  switchSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;
    const activeSheet = this.sheets.get(this.activeSheetId);

    if (activeSheet) {
      activeSheet.hide();
    }

    sheet.show();

    this.activeSheetId = sheetId;

    this.update();
  }

  renameSheet(oldSheetId: SheetId, sheetId: SheetId) {
    const sheet = this.sheets.get(oldSheetId)!;
    const sheetData = this.spreadsheet.data?.[oldSheetId];

    sheet.setSheetId(sheetId);

    const newSheets = new Map<SheetId, Sheet>();

    for (const [currentSheetId, sheet] of this.sheets) {
      if (currentSheetId === oldSheetId) {
        newSheets.set(sheetId, sheet);
      } else {
        newSheets.set(currentSheetId, sheet);
      }
    }

    this.sheets = newSheets;

    delete this.spreadsheet.data[oldSheetId];

    this.spreadsheet.data[sheetId] = {
      ...sheetData,
      sheetName: sheetId,
    };

    this.activeSheetId = sheetId;

    this.update();
  }

  createNewSheet(data: IData) {
    const sheetName = data.sheetName;

    this.spreadsheet.data[sheetName] = {
      sheetName,
    };

    const sheet = new Sheet(this, sheetName);

    this.sheets.set(sheetName, sheet);

    sheet.hide();

    this.sheetIndex++;

    this.update();
  }
}

export default SheetsGroup;
