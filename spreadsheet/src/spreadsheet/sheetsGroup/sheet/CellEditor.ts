import { IRect } from 'konva/lib/types';
import events from '../../events';
import Sheet from './Sheet';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';

class CellEditor {
  private textArea!: HTMLDivElement;
  private cellTooltip: DelegateInstance;
  private isEditing = false;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;

    this.textArea = document.createElement('div');
    this.textArea.setAttribute('contentEditable', 'true');
    this.textArea.classList.add(styles.cellEditor);
    this.cellTooltip = delegate(this.textArea, {
      target: styles.cellEditor,
      arrow: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5],
    });
    this.sheet.container.appendChild(this.textArea);

    this.sheet.eventEmitter.on(events.scroll.horizontal, this.handleScroll);
    this.sheet.eventEmitter.on(events.scroll.vertical, this.handleScroll);

    this.textArea.addEventListener('input', (e) => this.handleInput(e));

    this.showCellEditor();

  }

  handleInput(e: Event) {
    const target = e.target as HTMLDivElement;
    const textContent = target.textContent;

    if (this.sheet.formulaBar) {
      this.sheet.formulaBar.editableContent.textContent = textContent;
    }
  }

  destroy() {
    this.cellTooltip.destroy();
    this.textArea.remove();
    this.sheet.formulaBar!.editableContent.textContent = null;
    this.textArea.removeEventListener('input', this.handleInput);
  }

  private showCellEditor = () => {
    const selectedCell = this.sheet.selector.selectedFirstCell!;
    this.setTextAreaPosition(selectedCell.getClientRect());
    this.textArea.focus();
  };

  private setTextAreaPosition = (position: IRect) => {
    this.textArea.style.top = `${position.y}px`;
    this.textArea.style.left = `${position.x}px`;
    this.textArea.style.minWidth = `${position.width}px`;
    this.textArea.style.height = `${position.height}px`;
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
