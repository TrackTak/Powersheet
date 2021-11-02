import { isNil, merge } from 'lodash';
import { defaultOptions, IOptions } from './options';
import Sheets from './sheets/Sheets';
import { defaultStyles, IStyles } from './styles';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import { prefix } from './utils';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import styles from './Spreadsheet.module.scss';
import Manager from 'undo-redo-manager';
import Exporter from './Exporter';
import BottomBar from './bottomBar/BottomBar';
import { HyperFormula } from 'hyperformula';
import Data, { ISpreadsheetData } from './sheets/Data';
import SimpleCellAddress, {
  CellId,
} from './sheets/cells/cell/SimpleCellAddress';
import PowersheetEmitter from './PowersheetEmitter';
import { NestedPartial } from './types';
import FunctionHelper from './functionHelper/FunctionHelper';

export interface ISpreadsheetConstructor {
  hyperformula: HyperFormula;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  exporter?: Exporter;
  bottomBar?: BottomBar;
  functionHelper?: FunctionHelper;
}

class Spreadsheet {
  spreadsheetEl: HTMLDivElement;
  sheets: Sheets;
  styles: IStyles;
  eventEmitter: PowersheetEmitter;
  options: IOptions;
  data: Data;
  toolbar?: Toolbar;
  formulaBar?: FormulaBar;
  functionHelper?: FunctionHelper;
  exporter?: Exporter;
  hyperformula: HyperFormula;
  history: any;
  bottomBar?: BottomBar;
  isSaving = false;
  isInitialized = false;

  constructor(params: ISpreadsheetConstructor) {
    this.data = new Data(this);
    this.options = defaultOptions;
    this.styles = defaultStyles;
    this.eventEmitter = new PowersheetEmitter();

    this.toolbar = params.toolbar;
    this.formulaBar = params.formulaBar;
    this.bottomBar = params.bottomBar;
    this.exporter = params.exporter;
    this.functionHelper = params.functionHelper;
    this.hyperformula = params.hyperformula;
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

    this.toolbar?.initialize(this);
    this.formulaBar?.initialize(this);
    this.exporter?.initialize(this);
    this.bottomBar?.initialize(this);
    this.functionHelper?.initialize(this);
    this.history = new Manager((data: string) => {
      const currentData = {
        data: this.data.spreadsheetData,
        associatedMergedCellAddressMap:
          this.sheets.merger.associatedMergedCellAddressMap,
      };
      const parsedData = JSON.parse(data);

      this.data.spreadsheetData = parsedData.data;
      this.sheets.merger.associatedMergedCellAddressMap =
        parsedData.associatedMergedCellAddressMap;

      this.setCells();

      return JSON.stringify(currentData);
    }, this.options.undoRedoLimit);
    this.sheets = new Sheets(this);

    this.data.setSheet(0);

    // once is StoryBook bug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded, {
      once: true,
    });
  }

  initialize() {
    if (!this.isInitialized) {
      this.isInitialized = true;

      for (const key in this.data.spreadsheetData.sheets) {
        const sheetId = parseInt(key, 10);
        const sheet = this.data.spreadsheetData.sheets[sheetId];

        this.sheets.createNewSheet(sheet);
      }

      if (this.data.spreadsheetData.sheets) {
        this.setCells();
      }

      this.isSaving = false;

      this.updateViewport();

      if (document.readyState === 'complete') {
        this.updateSheetSizes();
      }
    }
  }

  private updateSheetSizes() {
    this.sheets.updateSize();
  }

  private onDOMContentLoaded = () => {
    this.updateSheetSizes();
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);

    this.spreadsheetEl.remove();

    this.toolbar?.destroy();
    this.formulaBar?.destroy();
    this.bottomBar?.destroy();
    this.sheets.destroy();
  }

  private setCells() {
    this.hyperformula.batch(() => {
      for (const key in this.data.spreadsheetData.cells) {
        const cellId = key as CellId;
        const cell = this.data.spreadsheetData.cells?.[cellId];

        this.hyperformula.setCellContents(
          SimpleCellAddress.cellIdToAddress(cellId),
          cell?.value
        );
      }
    });
  }

  setData(data: ISpreadsheetData) {
    this.data.spreadsheetData = data;

    this.updateViewport();
  }

  setOptions(options: NestedPartial<IOptions>) {
    this.options = merge({}, defaultOptions, options);

    this.updateViewport();
  }

  setStyles(styles: NestedPartial<IStyles>) {
    this.styles = merge({}, defaultStyles, styles);

    this.updateViewport();
  }

  pushToHistory(callback?: () => void) {
    const data = JSON.stringify({
      data: this.data.spreadsheetData,
      associatedMergedCellAddressMap:
        this.sheets.merger.associatedMergedCellAddressMap,
    });

    this.history.push(data);

    this.eventEmitter.emit('historyPush', this.data.spreadsheetData);

    if (callback) {
      callback();
    }

    this.persistData();
  }

  persistData() {
    const done = () => {
      this.isSaving = false;
      this.toolbar?.updateActiveStates();
    };

    this.isSaving = true;

    this.eventEmitter.emit('persistData', this.data.spreadsheetData, done);
  }

  undo() {
    if (!this.history.canUndo) return;

    this.history.undo();

    this.updateViewport();
    this.persistData();
  }

  redo() {
    if (!this.history.canRedo) return;

    this.history.redo();

    this.updateViewport();
    this.persistData();
  }

  updateViewport() {
    this.bottomBar?.updateSheetTabs();
    this.sheets.updateViewport();
  }
}

export default Spreadsheet;
