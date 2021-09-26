import EventEmitter from 'eventemitter3';
import { cloneDeep, isNil, merge } from 'lodash';
import { defaultOptions, IOptions } from './options';
import Sheet, { ISheetData, SheetId } from './sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import styles from './Spreadsheet.module.scss';
import { HyperFormula } from 'hyperformula';
import Clipboard from './Clipboard';
import Manager from 'undo-redo-manager';
import Exporter from './Exporter';
import BottomBar from './bottomBar/BottomBar';

export interface ISpreadsheetConstructor {
  styles?: Partial<IStyles>;
  options: IOptions;
  data?: ISheetData[];
  hyperformula: HyperFormula;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
  bottomBar?: BottomBar;
}

class Spreadsheet {
  spreadsheetEl: HTMLDivElement;
  sheetsEl: HTMLDivElement;
  sheets: Map<SheetId, Sheet>;
  styles: IStyles;
  eventEmitter: EventEmitter;
  options: IOptions;
  data: ISheetData[];
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
  hyperformula?: HyperFormula;
  clipboard: Clipboard;
  history: any;
  bottomBar?: BottomBar;
  activeSheetId?: number;
  totalSheetCount = 0;

  constructor(params: ISpreadsheetConstructor) {
    this.data = params.data ?? [];
    this.hyperformula = params.hyperformula;
    this.options = merge({}, defaultOptions, params.options);
    this.styles = merge({}, defaultStyles, params.styles);
    this.toolbar = params.toolbar;
    this.formulaBar = params.formulaBar;
    this.bottomBar = params.bottomBar;
    this.exporter = params.exporter;
    this.sheets = new Map();
    this.eventEmitter = new EventEmitter();
    this.spreadsheetEl = document.createElement('div');
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    );

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(`${prefix}-sheets`);

    this.spreadsheetEl.appendChild(this.sheetsEl);

    this.toolbar?.initialize(this);
    this.formulaBar?.initialize(this);
    this.exporter?.initialize(this);
    this.bottomBar?.initialize(this);
    this.clipboard = new Clipboard(this);

    this.history = new Manager((data: ISheetData[]) => {
      const currentData = this.data;

      this.data = data;

      return currentData;
    }, this.hyperformula.getConfig().undoLimit);

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  emit<T extends EventEmitter.EventNames<string | symbol>>(
    event: T,
    ...args: any[]
  ) {
    if (this.options.devMode) {
      console.log(event, ...args);
    }

    this.eventEmitter.emit(event, ...args);
  }

  addToHistory() {
    const data = cloneDeep(this.data);

    this.history.push(data);
  }

  undo() {
    if (!this.history.canUndo) return;

    this.history.undo();
    this.updateViewport();
  }

  redo() {
    if (!this.history.canRedo) return;

    this.history.redo();
    this.updateViewport();
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  onDOMContentLoaded = () => {
    if (this.data.length) {
      this.data.forEach((data) => {
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

    this.updateViewport();
  };

  getSheetName() {
    return `Sheet${this.totalSheetCount + 1}`;
  }

  getActiveSheet() {
    return isNil(this.activeSheetId)
      ? null
      : this.sheets.get(this.activeSheetId);
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

    delete this.data[sheetId];

    this.updateViewport();
  }

  switchSheet(sheetId: SheetId) {
    this.activeSheetId = sheetId;

    this.updateViewport();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this.data[sheetId].sheetName = sheetName;

    this.hyperformula?.renameSheet(sheetId, sheetName);

    this.updateViewport();
  }

  createNewSheet(data: ISheetData) {
    this.hyperformula?.addSheet(data.sheetName);

    const sheetId = this.hyperformula?.getSheetId(data.sheetName)!;

    this.data[sheetId] = data;

    const sheet = new Sheet(this, sheetId);

    this.sheets.set(sheetId, sheet);

    this.totalSheetCount++;

    this.updateViewport();
  }
}

export default Spreadsheet;
