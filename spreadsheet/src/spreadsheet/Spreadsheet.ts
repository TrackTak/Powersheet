import EventEmitter from 'eventemitter3';
import { cloneDeep, isNil, merge } from 'lodash';
import { defaultOptions, IOptions } from './options';
import Sheet, { SheetId } from './sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
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
import Data, { ICellsData, ISheetData, ISpreadsheetData } from './sheet/Data';
import SimpleCellAddress from './sheet/cells/cell/SimpleCellAddress';

export interface ISpreadsheetConstructor {
  eventEmitter: EventEmitter;
  options?: IOptions;
  styles?: Partial<IStyles>;
  data?: Partial<ISpreadsheetData>;
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
  eventEmitter: EventEmitter;
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

  constructor(params: ISpreadsheetConstructor) {
    this.data = new Data(this, params.data);
    this.hyperformula = params.hyperformula;
    this.eventEmitter = params.eventEmitter;
    this.options = merge({}, defaultOptions, params.options);
    this.styles = merge({}, defaultStyles, params.styles);
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

    this.history = new Manager((data: ISpreadsheetData) => {
      const currentData = this.data;

      this.data.spreadsheetData = data;

      return currentData;
    }, this.options.undoRedoLimit);

    if (this.data.spreadsheetData.sheetData.length) {
      this.data.spreadsheetData.sheetData.forEach((data) => {
        this.createNewSheet(data);
      });
    } else {
      this.createNewSheet({
        sheetName: this.getSheetName(),
      });
    }

    this.switchSheet(0);

    this.sheets.forEach((sheet) => {
      const cellsData = this.data.getSheetData(sheet.sheetId).cellsData || {};

      this.data.setCellDataBatch(
        this.convertCellsDataToCellsMap(cellsData, sheet.sheetId),
        false
      );
    });

    this.updateViewport();
  }

  convertCellsDataToCellsMap = (
    cellsData: ICellsData,
    sheetId: number = this.activeSheetId
  ) => {
    const cellsMap = new Map();

    Object.keys(cellsData).forEach((cellId) => {
      const cellData = cellsData[cellId];

      cellsMap.set(
        SimpleCellAddress.cellIdToAddress(sheetId, cellId),
        cellData
      );
    });

    return cellsMap;
  };

  getRegisteredFunctions() {
    return HyperFormulaModule?.default.getRegisteredFunctionNames('enGB');
  }

  setOptions(options: IOptions) {
    this.options = options;

    this.updateViewport();
  }

  addToHistory() {
    // const data = cloneDeep(this.data);
    // this.history.push(data);
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

    this.sheets.delete(sheetId);
    this.data.deleteSheetData(sheetId);

    this.updateViewport();
  }

  switchSheet(sheetId: SheetId) {
    this.activeSheetId = sheetId;

    this.updateViewport();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this.data.renameSheetData(sheetId, sheetName);

    this.updateViewport();
  }

  createNewSheet(data: ISheetData) {
    const sheetId =
      this.hyperformula?.getSheetId(data.sheetName) ?? this.totalSheetCount;

    this.data.addSheetData(sheetId, data);

    const sheet = new Sheet(this, sheetId);

    this.sheets.set(sheetId, sheet);

    this.totalSheetCount++;

    this.updateViewport();
  }
}

export default Spreadsheet;
