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
    this.sheetsGroupEl.classList.add(`${prefix}-sheetsGroup`);

    if (spreadsheet.data) {
      spreadsheet.data.forEach((data) => {
        this.createNewSheet(data);
      });
    } else {
      this.createNewSheet();
    }

    this.bottomBar = new BottomBar(this);

    this.spreadsheet.spreadsheetEl.appendChild(this.sheetsGroupEl);
  }

  createNewSheet(data?: IData) {
    const sheet = new Sheet(this, data);

    sheet.row.getAvailableSize = () => {
      return (
        this.spreadsheet.options.height -
        (this.spreadsheet.toolbar?.toolbarEl.getBoundingClientRect().height ??
          0) -
        sheet.getViewportVector().y -
        sheet.col.scrollBar.getBoundingClientRect().height
      );
    };

    sheet.col.getAvailableSize = () => {
      return (
        this.spreadsheet.options.width -
        sheet.getViewportVector().x -
        sheet.row.scrollBar.getBoundingClientRect().width
      );
    };

    this.sheets.push(sheet);

    this.activeSheet = sheet;
  }
}

export default SheetsGroup;
