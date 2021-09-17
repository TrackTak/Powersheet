import BottomBar from '../bottomBar/BottomBar';
import Sheet, { IData, SheetId } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

export type SheetsGroupId = number;

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  bottomBar: BottomBar;

  constructor(public spreadsheet: Spreadsheet, public sheetsGroupId: number) {
    this.spreadsheet = spreadsheet;
    this.sheets = new Map();
    this.sheetsGroupId = sheetsGroupId;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    this.bottomBar = new BottomBar(this);

    this.sheetsGroupEl.prepend(this.sheetsEl);
    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  onDOMContentLoaded = () => {
    const data = this.getData();

    if (data.length) {
      data.forEach((data) => {
        this.createNewSheet(data);
      });
    } else {
      this.createNewSheet({
        sheetName: this.getSheetName(),
      });
    }

    this.switchSheet(0);

    this.sheets.forEach((sheet) => {
      const data = sheet.getData().cellsData || {};

      Object.keys(data).forEach((id) => {
        sheet.cellRenderer.setHyperformulaCellData(id, data[id].value);
      });
    });

    this.update();
  };

  getData() {
    return this.spreadsheet.data[this.sheetsGroupId];
  }

  getSheetName() {
    return `Sheet${this.spreadsheet.sheetIndex + 1}`;
  }

  getActiveSheetId() {
    return this.spreadsheet.focusedSheet!.sheetId;
  }

  update() {
    this.bottomBar.updateSheetTabs();
    this.sheets.forEach((sheet) => {
      sheet.updateViewport();
    });
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;

    if (this.getActiveSheetId() === sheetId) {
      const sheetIds = Array.from(this.sheets.keys());
      const currentIndex = sheetIds.indexOf(sheetId);

      if (currentIndex === 0) {
        this.switchSheet(sheetIds[1]);
      } else {
        this.switchSheet(sheetIds[currentIndex - 1]);
      }
    }

    sheet.destroy();

    this.sheets.delete(sheetId);

    delete this.getData()[sheetId];

    this.update();
  }

  switchSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;
    const activeSheet = this.sheets.get(this.getActiveSheetId());

    if (activeSheet) {
      activeSheet.hide();
    }

    sheet.show();

    this.spreadsheet.setFocusedSheet(sheet);

    this.update();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this.getData()[sheetId].sheetName = sheetName;

    this.update();
  }

  createNewSheet(data: IData, sheetId: SheetId = this.spreadsheet.sheetIndex) {
    this.spreadsheet.data[this.sheetsGroupId][sheetId] = data;

    const sheet = new Sheet(this, sheetId);

    this.sheets.set(sheetId, sheet);

    sheet.hide();

    this.spreadsheet.sheetIndex++;

    this.update();

    sheet.setSize();
  }
}

export default SheetsGroup;
