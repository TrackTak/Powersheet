import EventEmitter from 'eventemitter3';
import { merge } from 'lodash';
import events from './events';
import { IOptions } from './options';
import Sheet, { ISheetData } from './sheetsGroup/sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
import SheetsGroup from './sheetsGroup/SheetsGroup';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import styles from './Spreadsheet.module.scss';

interface IConstructor {
  registeredFunctionNames: string[];
  styles?: Partial<IStyles>;
  options: IOptions;
  data?: ISheetData;
}

class Spreadsheet {
  sheetsGroups: SheetsGroup[];
  registeredFunctionNames: string[];
  spreadsheetEl: HTMLDivElement;
  styles: IStyles;
  eventEmitter: EventEmitter;
  focusedSheet: Sheet | null;
  options: IOptions;
  data: ISheetData;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;

  constructor(params: IConstructor) {
    this.options = params.options;
    this.data = params.data ?? {};
    this.registeredFunctionNames = params.registeredFunctionNames;
    this.styles = merge({}, defaultStyles, params.styles);
    this.registeredFunctionNames = params.registeredFunctionNames;
    this.eventEmitter = new EventEmitter();
    this.spreadsheetEl = document.createElement('div');
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    );
    this.focusedSheet = null;

    this.eventEmitter.on(events.selector.startSelection, this.onStartSelection);

    this.toolbar = new Toolbar(this);
    this.formulaBar = new FormulaBar(this);

    this.sheetsGroups = [this.getNewSheetsGroup()];
  }

  onStartSelection = (sheet: Sheet) => {
    this.focusedSheet = sheet;
  };

  private getNewSheetsGroup() {
    const sheetsGroup = new SheetsGroup(this);

    return sheetsGroup;
  }

  createNewSheetsGroup() {
    const newSheetsGroup = this.getNewSheetsGroup();

    this.sheetsGroups.push(newSheetsGroup);
  }
}

export default Spreadsheet;
