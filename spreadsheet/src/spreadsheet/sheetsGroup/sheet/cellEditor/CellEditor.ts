import { IRect } from 'konva/lib/types';
import events from '../../../events';
import Sheet from '../Sheet';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import { HyperFormula } from 'hyperformula';
import FormulaHelper from '../../../formulaHelper/FormulaHelper';
import Spreadsheet from '../../../Spreadsheet';
import { Cell } from '../CellRenderer';

export interface ICurrentScroll {
  row: number;
  col: number;
}

class CellEditor {
  cellEditorContainerEl: HTMLDivElement;
  cellEditorEl: HTMLDivElement;
  cellTooltip: DelegateInstance;
  formulaHelper: FormulaHelper;
  spreadsheet: Spreadsheet;
  currentCell: Cell | null = null;
  currentScroll: ICurrentScroll | null = null;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.sheetsGroup.spreadsheet;

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

    this.cellEditorEl.addEventListener('input', (e) => this.handleInput(e));

    const formulas = HyperFormula.getRegisteredFunctionNames('enGB');

    this.formulaHelper = new FormulaHelper(formulas, this.onItemClick);
    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl);

    this.cellEditorContainerEl.style.display = 'none';
  }

  saveContentToCell() {
    if (this.cellEditorEl.textContent) {
      this.sheet.cellRenderer.setCellData(this.currentCell!.id(), {
        value: this.cellEditorEl.textContent,
      });
    } else {
      const cell = this.sheet.cellRenderer.getCellData(this.currentCell!.id());

      if (cell) {
        delete cell.value;
      }
    }
  }

  destroy() {
    this.cellTooltip.destroy();
    this.cellEditorContainerEl.remove();
    this.cellEditorEl.removeEventListener('input', this.handleInput);
    this.formulaHelper.destroy();
  }

  getIsHidden() {
    return this.cellEditorContainerEl.style.display === 'none';
  }

  onItemClick = (suggestion: string) => {
    const value = `=${suggestion}()`;

    this.setTextContent(value);
    this.formulaHelper.hide();
  };

  setTextContent(value: string | undefined | null) {
    const textContent = value || '';

    this.cellEditorEl.textContent = textContent;
    this.spreadsheet.formulaBar?.setTextContent(textContent);
    this.spreadsheet.emit(events.cellEditor.change, value);
  }

  handleInput(e: Event) {
    const target = e.target as HTMLDivElement;
    const textContent = target.firstChild?.textContent;

    this.setTextContent(textContent);

    const isFormulaInput = textContent?.startsWith('=');

    if (isFormulaInput) {
      this.formulaHelper.show(textContent?.slice(1));
    } else {
      this.formulaHelper.hide();
    }
  }

  show(cell: Cell) {
    this.currentCell = cell;
    this.currentScroll = {
      row: this.sheet.row.scrollBar.scroll,
      col: this.sheet.col.scrollBar.scroll,
    };

    const id = cell.id();

    this.cellEditorEl.textContent = '';
    this.cellEditorContainerEl.style.display = 'block';

    this.setTextContent(this.sheet.cellRenderer.getCellData(id)?.value);

    this.setCellEditorElPosition(
      cell.getClientRect({
        skipStroke: true,
      })
    );

    this.cellEditorEl.focus();
  }

  hide() {
    this.saveContentToCell();

    this.currentCell = null;
    this.currentScroll = null;
    this.cellTooltip.hide();

    this.cellEditorContainerEl.style.display = 'none';

    this.sheet.updateViewport();
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
      const { row, col } = this.currentCell.attrs;
      const rowText = this.sheet.row.getHeaderText(row.x);
      const colText = this.sheet.col.getHeaderText(col.x);

      this.cellTooltip.setContent(`${colText}${rowText}`);
      this.cellTooltip.show();
    }
  };
}

export default CellEditor;
