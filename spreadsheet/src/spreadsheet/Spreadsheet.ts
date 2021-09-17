import EventEmitter from 'eventemitter3';
import { cloneDeep, merge } from 'lodash';
import events from './events';
import { IOptions } from './options';
import Sheet, { IData } from './sheetsGroup/sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
import SheetsGroup from './sheetsGroup/SheetsGroup';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import styles from './Spreadsheet.module.scss';
import { HyperFormula } from 'hyperformula';
import hyperformulaConfig from './hyperformulaConfig';
import Manager from 'undo-redo-manager';

interface IConstructor {
  styles?: Partial<IStyles>;
  options: IOptions;
  data?: IData[][];
}

class Spreadsheet {
  sheetsGroups: SheetsGroup[];
  spreadsheetEl: HTMLDivElement;
  styles: IStyles;
  eventEmitter: EventEmitter;
  focusedSheet: Sheet | null;
  options: IOptions;
  data: IData[][];
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  hyperformula: HyperFormula;
  history: any;
  sheetIndex = 0;

  constructor(params: IConstructor) {
    this.options = params.options;
    this.data = params.data ?? [];
    this.styles = merge({}, defaultStyles, params.styles);
    this.eventEmitter = new EventEmitter();
    this.spreadsheetEl = document.createElement('div');
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    );
    this.focusedSheet = null;
    this.sheetsGroups = [];

    this.toolbar = new Toolbar(this);
    this.formulaBar = new FormulaBar(this);

    this.hyperformula = HyperFormula.buildEmpty(hyperformulaConfig);
    this.history = new Manager((data: IData[][]) => {
      const currentData = this.data;

      this.data = data;

      return currentData;
    }, this.options.undoRedoHistorySize);

    if (!this.data.length) {
      this.data.push([]);
    }

    this.data.forEach((_, i) => {
      this.createNewSheetsGroup(i);
    });
  }

  setFocusedSheet(sheet: Sheet) {
    this.focusedSheet = sheet;

    this.eventEmitter.emit(events.spreadsheet.focusedSheetChange, sheet);
  }

  createNewSheetsGroup(sheetsGroupId: number) {
    this.data[sheetsGroupId] = [];

    const sheetsGroup = new SheetsGroup(this, sheetsGroupId);

    this.sheetsGroups.push(sheetsGroup);
  }

  update() {
    this.sheetsGroups.forEach((sheetGroup) => {
      sheetGroup.update();
    });
  }

  addToHistory() {
    const data = cloneDeep(this.data);

    this.history.push(data);
  }

  undo() {
    if (!this.history.canUndo) return;

    this.history.undo();
    this.update();
  }

  redo() {
    if (!this.history.canRedo) return;

    this.history.redo();
    this.update();
  }
}

export default Spreadsheet;
