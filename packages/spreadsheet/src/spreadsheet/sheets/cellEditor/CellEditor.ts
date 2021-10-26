import { IRect } from 'konva/lib/types';
import Sheet from '../Sheets';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import FormulaHelper from '../../formulaHelper/FormulaHelper';
import Spreadsheet from '../../Spreadsheet';
import Cell from '../cells/cell/Cell';
import { setCaretToEndOfElement } from '../../utils';
import { HyperFormula } from 'hyperformula';

export interface ICurrentScroll {
  row: number;
  col: number;
}

class CellEditor {
  cellEditorContainerEl: HTMLDivElement;
  cellEditorEl: HTMLDivElement;
  cellTooltip: DelegateInstance;
  formulaHelper?: FormulaHelper;
  spreadsheet: Spreadsheet;
  currentCell: Cell | null = null;
  currentScroll: ICurrentScroll | null = null;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;

    this.cellEditorEl = document.createElement('div');
    this.cellEditorEl.setAttribute('contentEditable', 'true');
    this.cellEditorEl.classList.add(styles.cellEditor);
    this.cellEditorContainerEl = document.createElement('div');
    this.cellEditorContainerEl.classList.add(styles.cellEditorContainer);
    this.cellEditorContainerEl.appendChild(this.cellEditorEl);
    this.cellTooltip = delegate(this.cellEditorEl, {
      target: styles.cellEditor,
      arrow: false,
      trigger: 'manual',
      hideOnClick: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5],
    });
    this.sheet.sheetEl.appendChild(this.cellEditorContainerEl);

    this.cellEditorEl.addEventListener('input', this.onInput);
    this.cellEditorEl.addEventListener('keydown', this.onKeyDown);

    this.cellEditorContainerEl.style.display = 'none';

    this.formulaHelper = new FormulaHelper(
      HyperFormula.getRegisteredFunctionNames('enGB'),
      this.onItemClick
    );

    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl);
  }

  saveContentToCell() {
    const simpleCellAddress = this.currentCell!.simpleCellAddress;
    const cellData =
      this.spreadsheet.data.spreadsheetData.cells?.[
        simpleCellAddress.toCellId()
      ];
    const textContent = this.cellEditorEl.textContent;

    this.spreadsheet.pushToHistory(() => {
      this.spreadsheet.data.setCell(simpleCellAddress, {
        ...cellData,
        value: textContent ? textContent : undefined,
      });
    });
  }

  destroy() {
    this.cellTooltip.destroy();
    this.cellEditorContainerEl.remove();
    this.cellEditorEl.removeEventListener('input', this.onInput);
    this.cellEditorEl.removeEventListener('keydown', this.onKeyDown);
    this.formulaHelper?.destroy();
  }

  getIsHidden() {
    return this.cellEditorContainerEl.style.display === 'none';
  }

  onItemClick = (suggestion: string) => {
    const value = `=${suggestion}()`;

    this.setTextContent(value);
    this.cellEditorEl.focus();
    this.formulaHelper?.hide();
  };

  setTextContent(value: string | null) {
    const textContent = value ?? null;

    this.cellEditorEl.textContent = textContent;
    this.spreadsheet.formulaBar?.setTextContent(textContent);
    this.spreadsheet.eventEmitter.emit('cellEditorChange', value);
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        this.hide();
        break;
      }
      case 'Enter': {
        this.hideAndSave();
        break;
      }
    }
  };

  onInput = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const textContent = target.firstChild?.textContent;

    this.setTextContent(textContent ?? null);

    const isFormulaInput = textContent?.startsWith('=');

    if (isFormulaInput) {
      this.formulaHelper?.show(textContent?.slice(1));
    } else {
      this.formulaHelper?.hide();
    }
  };

  show(cell: Cell, setTextContent = true) {
    this.currentCell = cell;
    this.currentScroll = {
      row: this.sheet.rows.scrollBar.scroll,
      col: this.sheet.cols.scrollBar.scroll,
    };

    const simpleCellAddress = cell.simpleCellAddress;

    this.clear();
    this.cellEditorContainerEl.style.display = 'block';

    this.setCellEditorElPosition(cell.group.getClientRect());

    if (setTextContent) {
      this.setTextContent(
        this.spreadsheet.data.spreadsheetData.cells?.[
          simpleCellAddress.toCellId()
        ]?.value ?? null
      );

      setCaretToEndOfElement(this.cellEditorEl);

      this.cellEditorEl.focus();
    }
  }

  clear() {
    this.cellEditorEl.textContent = null;
  }

  hideAndSave() {
    if (!this.getIsHidden()) {
      this.saveContentToCell();
      this.hide();
    }
  }

  hide() {
    this.currentCell = null;
    this.currentScroll = null;
    this.cellTooltip.hide();

    this.cellEditorContainerEl.style.display = 'none';
    this.clear();

    this.spreadsheet.updateViewport();
  }

  setCellEditorElPosition = (position: IRect) => {
    this.cellEditorContainerEl.style.top = `${position.y}px`;
    this.cellEditorContainerEl.style.left = `${position.x}px`;
    this.cellEditorContainerEl.style.minWidth = `${position.width}px`;
    this.cellEditorContainerEl.style.height = `${position.height}px`;
  };

  hideCellTooltip = () => {
    this.cellTooltip.hide();
  };

  showCellTooltip = () => {
    if (this.currentCell) {
      const simpleCellAddress = this.currentCell.simpleCellAddress;

      this.cellTooltip.setContent(simpleCellAddress.addressToString());
      this.cellTooltip.show();
    }
  };
}

export default CellEditor;
