import BottomBar from '../bottomBar/BottomBar';
import Sheet, { IData } from './sheet/Sheet';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';

class SheetsGroup {
  sheetsGroupEl: HTMLDivElement;
  sheets: Sheet[];
  bottomBar?: BottomBar;
  activeSheet: Sheet | null;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.sheets = [];
    this.activeSheet = null;

    this.sheetsGroupEl = document.createElement('div');
    this.sheetsGroupEl.classList.add(`${prefix}-sheets-group`);

    this.bottomBar = new BottomBar(this);

    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  onLoad = () => {
    if (this.spreadsheet.data) {
      this.spreadsheet.data.forEach((data) => {
        this.createNewSheet(data);
      });
    } else {
      this.createNewSheet();
    }
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);
  }

  createNewSheet(data?: IData) {
    if (this.activeSheet) {
      this.activeSheet.destroy();
    }

    const sheet = new Sheet(this, data);

    this.sheets.push(sheet);

    this.activeSheet = sheet;
  }
}

export default SheetsGroup;
