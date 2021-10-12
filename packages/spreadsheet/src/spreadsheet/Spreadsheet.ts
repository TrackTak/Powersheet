import { isNil, merge } from 'lodash';
import { defaultOptions, IConfigOptions, IOptions } from './options';
import Sheet, { SheetId } from './sheet/Sheet';
import { defaultStyles, IConfigStyles, IStyles } from './styles';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import styles from './Spreadsheet.module.scss';
import Clipboard from './Clipboard';
import Manager from 'undo-redo-manager';
import Exporter from './Exporter';
import BottomBar from './bottomBar/BottomBar';
import type { HyperFormula } from 'hyperformula';
import HyperFormulaModule from './HyperFormula';
import Data, { ISheetData, ISpreadsheetData } from './sheet/Data';
import SimpleCellAddress, {
  CellId,
} from './sheet/cells/cell/SimpleCellAddress';
import PowersheetEmitter from './PowersheetEmitter';

export interface ISpreadsheetConstructor {
  options?: IConfigOptions;
  styles?: IConfigStyles;
  data?: ISpreadsheetData;
  hyperformula?: HyperFormula;
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
  eventEmitter: PowersheetEmitter;
  options: IOptions;
  data: Data;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
  hyperformula?: HyperFormula;
  clipboard: Clipboard;
  history: any;
  bottomBar?: BottomBar;
  activeSheetId = 0;
  totalSheetCount = 0;
  isSaving = false;

  constructor(params: ISpreadsheetConstructor) {
    this.data = new Data(this, params.data);
    this.options = merge({}, defaultOptions, params.options);
    this.styles = merge({}, defaultStyles, params.styles);
    this.eventEmitter = new PowersheetEmitter();
    this.hyperformula = params.hyperformula;
    this.toolbar = params.toolbar;
    this.formulaBar = params.formulaBar;
    this.bottomBar = params.bottomBar;
    this.exporter = params.exporter;
    this.sheets = new Map();
    this.spreadsheetEl = document.createElement('div');
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    );

    if (!isNil(this.options.width)) {
      this.spreadsheetEl.style.width = `${this.options.width}px`;
    }

    if (!isNil(this.options.height)) {
      this.spreadsheetEl.style.height = `${this.options.height}px`;
    }

    this.sheetsEl = document.createElement('div');
    this.sheetsEl.classList.add(styles.sheets, `${prefix}-sheets`);

    this.spreadsheetEl.appendChild(this.sheetsEl);

    this.toolbar?.initialize(this);
    this.formulaBar?.initialize(this);
    this.exporter?.initialize(this);
    this.bottomBar?.initialize(this);
    this.clipboard = new Clipboard(this);

    this.history = new Manager((data: string) => {
      const currentData = this.data.spreadsheetData;

      this.data.spreadsheetData = JSON.parse(data);

      this.setCells();

      return JSON.stringify(currentData);
    }, this.options.undoRedoLimit);

    this.data.setSheet(0);

    // once is StoryBook bug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded, {
      once: true,
    });
  }

  onDOMContentLoaded = () => {
    for (const key in this.data.spreadsheetData.sheets) {
      const sheetId = parseInt(key, 10);
      const sheet = this.data.spreadsheetData.sheets[sheetId];

      this.createNewSheet(sheet);
    }

    this.setCells();

    this.switchSheet(0);

    this.isSaving = false;

    this.updateViewport();
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }

  private setCells() {
    this.hyperformula?.batch(() => {
      for (const key in this.data.spreadsheetData.cells) {
        const cellId = key as CellId;
        const cell = this.data.spreadsheetData.cells?.[cellId];

        this.hyperformula?.setCellContents(
          SimpleCellAddress.cellIdToAddress(cellId),
          cell?.value
        );
      }
    });
  }

  getRegisteredFunctions() {
    return HyperFormulaModule?.default.getRegisteredFunctionNames('enGB');
  }

  setOptions(options: IOptions) {
    this.options = options;

    this.updateViewport();
  }

  pushToHistory() {
    const data = JSON.stringify(this.data.spreadsheetData);

    this.history.push(data);

    this.persistData();

    this.eventEmitter.emit('historyPush', this.data.spreadsheetData);
  }

  persistData() {
    const done = () => {
      this.isSaving = false;
      this.updateViewport();
    };

    this.isSaving = true;

    this.eventEmitter.emit('persistData', this.data.spreadsheetData, done);
  }

  undo() {
    if (!this.history.canUndo) return;

    this.history.undo();

    this.persistData();
    this.updateViewport();
  }

  redo() {
    if (!this.history.canRedo) return;

    this.history.redo();

    this.persistData();
    this.updateViewport();
  }

  getSheetName() {
    return `Sheet${this.totalSheetCount + 1}`;
  }

  getActiveSheet() {
    return this.sheets.get(this.activeSheetId);
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

    this.data.deleteSheet(sheetId);

    this.sheets.delete(sheetId);

    this.updateViewport();
  }

  switchSheet(sheetId: SheetId) {
    this.activeSheetId = sheetId;

    this.updateViewport();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this.data.setSheet(sheetId, {
      sheetName,
    });
    this.hyperformula?.renameSheet(sheetId, sheetName);

    this.updateViewport();
  }

  createNewSheet(data: ISheetData) {
    this.data.setSheet(data.id, data);
    this.hyperformula?.addSheet(data.sheetName);

    const sheet = new Sheet(this, data.id);

    this.sheets.set(data.id, sheet);

    this.totalSheetCount++;

    this.updateViewport();
  }
}

export default Spreadsheet;
