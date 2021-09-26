import EventEmitter from 'eventemitter3';
import { cloneDeep, merge } from 'lodash';
import events from './events';
import { defaultOptions, IOptions } from './options';
import Sheet from './sheetsGroup/sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
import SheetsGroup, { ISheetsGroupData } from './sheetsGroup/SheetsGroup';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import styles from './Spreadsheet.module.scss';
import { HyperFormula } from 'hyperformula';
import Clipboard from './Clipboard';
import Manager from 'undo-redo-manager';
import Exporter from './Exporter';

export interface ISpreadsheetConstructor {
  styles?: Partial<IStyles>;
  options: IOptions;
  data?: ISheetsGroupData[];
  hyperformula: HyperFormula;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
}

class Spreadsheet {
  sheetsGroups: SheetsGroup[];
  spreadsheetEl: HTMLDivElement;
  styles: IStyles;
  eventEmitter: EventEmitter;
  focusedSheet: Sheet | null;
  options: IOptions;
  data: ISheetsGroupData[];
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
  hyperformula?: HyperFormula;
  clipboard: Clipboard;
  history: any;
  totalSheetIndex = 0;

  constructor(params: ISpreadsheetConstructor) {
    this.data = params.data ?? [];
    this.hyperformula = params.hyperformula;
    this.options = merge({}, defaultOptions, params.options);
    this.styles = merge({}, defaultStyles, params.styles);
    this.toolbar = params.toolbar;
    this.formulaBar = params.formulaBar;
    this.exporter = params.exporter;
    this.eventEmitter = new EventEmitter();
    this.spreadsheetEl = document.createElement('div');
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    );
    this.focusedSheet = null;
    this.sheetsGroups = [];

    this.toolbar?.initialize(this);
    this.formulaBar?.initialize(this);
    this.exporter?.initialize(this);
    this.clipboard = new Clipboard(this);

    this.history = new Manager((data: ISheetsGroupData[]) => {
      const currentData = this.data;

      this.data = data;

      return currentData;
    }, this.hyperformula.getConfig().undoLimit);

    if (!this.data.length) {
      this.data.push({
        sheetData: [],
      });
    }

    this.data.forEach((_, i) => {
      this.createNewSheetsGroup(i);
    });
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

  setFocusedSheet(sheet: Sheet) {
    this.focusedSheet = sheet;

    this.emit(events.spreadsheet.focusedSheetChange, sheet);
  }

  createNewSheetsGroup(sheetsGroupId: number) {
    const sheetsGroup = new SheetsGroup(this, sheetsGroupId);

    this.sheetsGroups.push(sheetsGroup);
  }

  updateViewport() {
    this.sheetsGroups.forEach((sheetGroup) => {
      sheetGroup.updateViewport();
    });
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
}

export default Spreadsheet;
