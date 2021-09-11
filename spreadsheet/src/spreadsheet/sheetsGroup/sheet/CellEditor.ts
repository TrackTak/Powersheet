import { IRect } from 'konva/lib/types';
import events from '../../events';
import Sheet from './Sheet';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import { HyperFormula } from 'hyperformula';
import FormulaHelper from '../../formulaHelper/FormulaHelper';

class CellEditor {
  private cellEditorContainerEl: HTMLDivElement;
  private cellEditorEl: HTMLDivElement;
  private cellTooltip: DelegateInstance;
  private isEditing = false;
  private formulaHelper: FormulaHelper;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;

    this.cellEditorEl = document.createElement('div');
    this.cellEditorEl.setAttribute('contentEditable', 'true');
    this.cellEditorEl.classList.add(styles.cellEditor);
    this.cellEditorContainerEl = document.createElement('div');
    this.cellEditorContainerEl.classList.add(styles.cellEditorContainer);
    this.cellEditorContainerEl.appendChild(this.cellEditorEl);
    this.cellTooltip = delegate(this.cellEditorEl, {
      target: styles.cellEditor,
      arrow: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5],
    });
    this.sheet.container.appendChild(this.cellEditorContainerEl);

    this.sheet.eventEmitter.on(events.scroll.horizontal, this.handleScroll);
    this.sheet.eventEmitter.on(events.scroll.vertical, this.handleScroll);

    this.cellEditorEl.addEventListener('input', (e) => this.handleInput(e));

    const formulas = HyperFormula.getRegisteredFunctionNames('enGB');
    this.formulaHelper = new FormulaHelper(formulas, this.handleFormulaSuggestionClick);
    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl);

    const cellId = this.sheet.selector.selectedFirstCell?.attrs.id;
    this.setTextContent(this.sheet.data.sheetData?.[cellId]?.value)

    this.showCellEditor();
  }

  destroy() {
    this.cellTooltip.destroy();
    this.cellEditorContainerEl.remove();
    this.cellEditorEl.removeEventListener('input', this.handleInput);
    this.formulaHelper.destroy();
  }

  private handleFormulaSuggestionClick = (suggestion: string) => {
    const value = `=${suggestion}()`
    this.setTextContent(value);
    this.formulaHelper.hide();
  }

  private setTextContent(value: string | undefined | null) {
    const cellId = this.sheet.selector.selectedFirstCell?.attrs.id;
    this.sheet.data.sheetData[cellId] = {
      ...this.sheet.data.sheetData[cellId],
      value,
    };


    if (this.sheet.formulaBar) {
      this.sheet.formulaBar.editableContent.textContent = value || '';
    }

    this.cellEditorEl.textContent = value || '';
  }

  private handleInput(e: Event) {
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

  private showCellEditor = () => {
    const selectedCell = this.sheet.selector.selectedFirstCell!;
    this.setCellEditorElPosition(selectedCell.getClientRect());
    this.cellEditorEl.focus();
  };

  private setCellEditorElPosition = (position: IRect) => {
    this.cellEditorContainerEl.style.top = `${position.y}px`;
    this.cellEditorContainerEl.style.left = `${position.x}px`;
    this.cellEditorContainerEl.style.minWidth = `${position.width}px`;
    this.cellEditorContainerEl.style.height = `${position.height}px`;
  };

  private hideCellTooltip = () => {
    this.cellTooltip.hide();
  };

  private showCellTooltip = () => {
    if (this.isEditing) {
      const selectedCell = this.sheet.selector.selectedFirstCell!;
      const row = selectedCell.attrs.row;
      const col = selectedCell.attrs.col;
      const rowText = this.sheet.row.getHeaderText(row.x);
      const colText = this.sheet.col.getHeaderText(col.x);

      this.cellTooltip.setContent(`${colText}${rowText}`);
      this.cellTooltip.show();
    }
  };

  private handleScroll = () => {
    const rowScrollOffset = this.sheet.row.scrollBar.scrollOffset;
    const colScrollOffset = this.sheet.col.scrollBar.scrollOffset;

    if (rowScrollOffset.index || colScrollOffset.index) {
      this.showCellTooltip();
    } else {
      this.hideCellTooltip();
    }
  };
}

export default CellEditor;
