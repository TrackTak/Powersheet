import { IRect } from 'konva/lib/types';
import events from '../../events';
import Sheet from './Sheet';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import { HyperFormula } from 'hyperformula';
import FormulaHelper from '../../formulaHelper/FormulaHelper';

class CellEditor {
  private textAreaContainer: HTMLDivElement;
  private textArea: HTMLDivElement;
  private cellTooltip: DelegateInstance;
  private isEditing = false;
  private formulaHelper: FormulaHelper;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;

    this.textArea = document.createElement('div');
    this.textArea.setAttribute('contentEditable', 'true');
    this.textArea.classList.add(styles.cellEditor);
    this.textAreaContainer = document.createElement('div');
    this.textAreaContainer.classList.add(styles.cellEditorContainer);
    this.textAreaContainer.appendChild(this.textArea);
    this.cellTooltip = delegate(this.textArea, {
      target: styles.cellEditor,
      arrow: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5],
    });
    this.sheet.container.appendChild(this.textAreaContainer);

    this.sheet.eventEmitter.on(events.scroll.horizontal, this.handleScroll);
    this.sheet.eventEmitter.on(events.scroll.vertical, this.handleScroll);

    this.textArea.addEventListener('input', (e) => this.handleInput(e));

    const formulas = HyperFormula.getRegisteredFunctionNames('enGB');
    this.formulaHelper = new FormulaHelper(formulas);
    this.textAreaContainer.appendChild(this.formulaHelper.formulaHelperEl);

    const cellId = this.sheet.selector.selectedFirstCell?.attrs.id;
    this.setTextContent(this.sheet.data.sheetData?.[cellId]?.value)

    this.showCellEditor();
  }

  setTextContent(value: string | undefined | null) {
    const cellId = this.sheet.selector.selectedFirstCell?.attrs.id;
    this.sheet.data.sheetData[cellId] = {
      ...this.sheet.data.sheetData[cellId],
      value,
    };


    if (this.sheet.formulaBar) {
      this.sheet.formulaBar.editableContent.textContent = value || '';
    }

    this.textArea.textContent = value || '';
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

  destroy() {
    this.cellTooltip.destroy();
    this.textAreaContainer.remove();
    this.sheet.formulaBar!.editableContent.textContent = null;
    this.textArea.removeEventListener('input', this.handleInput);
    this.formulaHelper.destroy();
  }

  private showCellEditor = () => {
    const selectedCell = this.sheet.selector.selectedFirstCell!;
    this.setTextAreaPosition(selectedCell.getClientRect());
    this.textArea.focus();
  };

  private setTextAreaPosition = (position: IRect) => {
    this.textAreaContainer.style.top = `${position.y}px`;
    this.textAreaContainer.style.left = `${position.x}px`;
    this.textAreaContainer.style.minWidth = `${position.width}px`;
    this.textAreaContainer.style.height = `${position.height}px`;
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
