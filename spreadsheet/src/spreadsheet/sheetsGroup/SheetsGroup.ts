import BottomBar from '../bottomBar/BottomBar';
import Sheet, { IData, ISheetsData, SheetId } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';
import Manager from 'undo-redo-manager';
import { isEmpty, cloneDeep } from 'lodash';

const HISTORY_SIZE = 20;
class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  bottomBar: BottomBar;
  activeSheetId!: SheetId;
  sheetIndex: number;
  history: Manager;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.sheets = new Map();
    this.sheetIndex = 1;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    this.bottomBar = new BottomBar(this);

    this.sheetsGroupEl.prepend(this.sheetsEl);
    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);

    this.history = new Manager((data: ISheetsData) => {
      const currentData = this.spreadsheet.data;
      this.spreadsheet.data = data;
      return currentData;
    }, HISTORY_SIZE);

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  onDOMContentLoaded = () => {
    const dataKeysArray = Object.keys(this.spreadsheet.data);

    if (dataKeysArray.length) {
      dataKeysArray.forEach((key) => {
        const data = this.spreadsheet.data[key];

        this.createNewSheet(key, data);
      });

      this.switchSheet(dataKeysArray[0]);
    } else {
      const sheetName = this.getSheetName();

      this.createNewSheet(sheetName, {
        sheetName,
      });

      this.switchSheet(sheetName);
    }

    this.sheets.forEach((sheet) => {
      sheet.restoreHyperformulaData();
    });
  };

  getSheetName() {
    return `Sheet${this.sheetIndex}`;
  }

  update() {
    this.bottomBar.updateSheetTabs();
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

  renameSheet(oldSheetId: SheetId, sheetName: SheetId) {
    const sheet = this.sheets.get(oldSheetId)!;
    const sheetData = this.spreadsheet.data?.[oldSheetId];

    sheet.setSheetId(sheetName);

    const newSheets = new Map<SheetId, Sheet>();

    for (const [currentSheetId, sheet] of this.sheets) {
      if (currentSheetId === oldSheetId) {
        newSheets.set(sheetName, sheet);
      } else {
        newSheets.set(currentSheetId, sheet);
      }
    }

    this.sheets = newSheets;

    delete this.spreadsheet.data[oldSheetId];

    this.spreadsheet.data[sheetName] = {
      ...sheetData,
      sheetName,
    };

    this.activeSheetId = sheetName;

    this.update();
  }

  createNewSheet(sheetId: SheetId, data: IData) {
    this.setSheetData(
      sheetId,
      {
        sheetName: data.sheetName,
      },
      false
    );

    const sheet = new Sheet(this, sheetId);

    this.sheets.set(sheetId, sheet);

    sheet.hide();

    this.sheetIndex++;

    this.update();

    sheet.setSize();
  }

  setSheetData(sheetId: SheetId, newValue: IData, withHistory: boolean = true) {
    if (withHistory) {
      const sheetsData = cloneDeep(this.spreadsheet.data);
      const dataToPush = isEmpty(sheetsData)
        ? { [sheetId]: newValue }
        : sheetsData;
      this.history.push(dataToPush);
    }

    this.spreadsheet.data[sheetId] = {
      ...this.spreadsheet.data[sheetId],
      ...newValue,
    };
  }

  undo = () => {
    if (!this.history.canUndo) return;
    this.history.undo();
  };

  redo = () => {
    if (!this.history.canRedo) return;
    this.history.redo();
  };
}

export default SheetsGroup;
