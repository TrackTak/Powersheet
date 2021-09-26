import BottomBar from '../bottomBar/BottomBar';
import Sheet, { ISheetData, SheetId, SheetIndex } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

export type SheetsGroupId = number;

export interface ISheetsGroupData {
  height?: number;
  width?: number;
  sheetData: ISheetData[];
}

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  bottomBar?: BottomBar;
  activeSheetId?: number;

  constructor(public spreadsheet: Spreadsheet, public sheetsGroupId: number) {
    this.spreadsheet = spreadsheet;
    this.sheets = new Map();
    this.sheetsGroupId = sheetsGroupId;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    this.sheetsGroupEl.prepend(this.sheetsEl);

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  setBottomBar(bottomBar: BottomBar) {
    this.bottomBar = bottomBar;
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  getSheetIndexFromSheetId(sheetId: SheetId) {
    return this.sheets.get(sheetId)!.sheetIndex;
  }

  getSheetIdFromSheetIndex(sheetIndex: SheetIndex) {
    return Array.from(this.sheets.values())[sheetIndex].sheetId;
  }

  onDOMContentLoaded = () => {
    const data = this.getData();

    if (data.sheetData.length) {
      data.sheetData.forEach((data, i) => {
        this.createNewSheet(data, i);
      });
    } else {
      this.createNewSheet(
        {
          sheetName: this.getSheetName(),
        },
        0
      );
    }

    this.switchSheet(this.getSheetIdFromSheetIndex(0));

    this.sheets.forEach((sheet) => {
      const data = sheet.getData().cellsData || {};

      Object.keys(data).forEach((id) => {
        sheet.cellRenderer.setHyperformulaCellData(id, data[id].value);
      });
    });

    this.updateViewport();
  };

  getData() {
    return this.spreadsheet.data[this.sheetsGroupId];
  }

  getSheetName() {
    return `Sheet${this.spreadsheet.totalSheetIndex + 1}`;
  }

  updateViewport() {
    this.bottomBar?.updateSheetTabs();

    this.sheets.forEach((sheet) => {
      if (sheet.sheetId === this.activeSheetId) {
        sheet.show();
        sheet.updateViewport();
      } else {
        sheet.hide();
      }
    });
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this.sheets.get(sheetId)!;

    if (this.activeSheetId === sheetId) {
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

    const sheetIndex = this.getSheetIndexFromSheetId(sheetId);

    delete this.getData().sheetData[sheetIndex];

    this.updateViewport();
  }

  switchSheet(sheetId: SheetId) {
    const activeSheet = this.activeSheetId
      ? this.sheets.get(this.activeSheetId)
      : null;

    if (activeSheet) {
      activeSheet.hide();
    }

    this.activeSheetId = sheetId;

    this.updateViewport();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    const sheetIndex = this.getSheetIndexFromSheetId(sheetId);

    this.getData().sheetData[sheetIndex].sheetName = sheetName;

    this.spreadsheet.hyperformula?.renameSheet(sheetId, sheetName);

    this.updateViewport();
  }

  createNewSheet(data: ISheetData, sheetIndex: SheetIndex) {
    this.spreadsheet.hyperformula?.addSheet(data.sheetName);

    const sheetId = this.spreadsheet.hyperformula?.getSheetId(data.sheetName)!;

    // Cannot use Hyperformula sheetId as our data index because we have an array of arrays for sheetsGroups
    this.spreadsheet.data[this.sheetsGroupId].sheetData[sheetIndex] = data;

    const sheet = new Sheet(this, sheetId, sheetIndex);

    this.sheets.set(sheetId, sheet);

    this.spreadsheet.totalSheetIndex++;

    this.updateViewport();
  }
}

export default SheetsGroup;
