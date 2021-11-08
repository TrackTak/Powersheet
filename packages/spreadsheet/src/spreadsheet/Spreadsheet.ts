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

export interface IHistoryData {
  activeSheetId: number;
  associatedMergedCellAddressMap: Record<CellId, CellId>;
  data: ISpreadsheetData;
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

    // TODO: Change to command pattern later so we don't
    // need to store huge JSON objects: https://stackoverflow.com/questions/49755/design-pattern-for-undo-engine
    this.history = new Manager((data: string) => {
      const currentData: IHistoryData = {
        data: this.data.spreadsheetData,
        activeSheetId: this.sheets.activeSheetId,
        associatedMergedCellAddressMap:
          this.sheets.merger.associatedMergedCellAddressMap,
      };

      const parsedData: IHistoryData = JSON.parse(data);

      this.data.spreadsheetData = parsedData.data;
      this.sheets.activeSheetId = parsedData.activeSheetId;
      this.sheets.merger.associatedMergedCellAddressMap =
        parsedData.associatedMergedCellAddressMap;

      this.hyperformula.batch(() => {
        const sheetName = this.hyperformula.getSheetName(
          this.sheets.activeSheetId
        )!;

        const sheetId = this.hyperformula.getSheetId(sheetName)!;

        this.hyperformula.clearSheet(sheetId);
        this.setCells();
      });

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
        this.hyperformula.batch(() => {
          this.setCells();
        });
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
    this.functionHelper?.destroy();
    this.sheets.destroy();
  }

  private setCells() {
    for (const key in this.data.spreadsheetData.cells) {
      const cellId = key as CellId;
      const cell = this.data.spreadsheetData.cells?.[cellId];

      this.hyperformula.setCellContents(
        SimpleCellAddress.cellIdToAddress(cellId),
        cell?.value
      );
    }
  }

  setData(data: ISpreadsheetData) {
    this.data.spreadsheetData = data;

    this.updateViewport();
  }

  setOptions(options: NestedPartial<IOptions>) {
    this.options = merge({}, this.options, options);

    this.updateViewport();
  }

  setStyles(styles: NestedPartial<IStyles>) {
    this.styles = merge({}, this.styles, styles);

    this.updateViewport();
  }

  pushToHistory(callback?: () => void) {
    const historyData: IHistoryData = {
      activeSheetId: this.sheets.activeSheetId,
      data: this.data.spreadsheetData,
      associatedMergedCellAddressMap:
        this.sheets.merger.associatedMergedCellAddressMap,
    };
    const data = JSON.stringify(historyData);

    this.history.push(data);

    this.eventEmitter.emit('historyPush', data);

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
    this.toolbar?.updateActiveStates();
    this.functionHelper?.updateOpenState();
    this.formulaBar?.updateValue(
      this.sheets.selector.selectedCell?.simpleCellAddress
    );
  }
}

export default Spreadsheet;
