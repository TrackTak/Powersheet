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

    window.addEventListener('keydown', this.keyHandler);
    this.sheet.shapes.sheet.on('dblclick', this.showCellEditor);
    this.sheet.shapes.sheet.on('click', this.hideCellEditor);
    this.sheet.stage.on('click', this.hideCellEditor);
    this.sheet.stage.on('mousedown', this.hideCellEditor);
    this.sheet.eventEmitter.on(events.scroll.horizontal, this.handleScroll);
    this.sheet.eventEmitter.on(events.scroll.vertical, this.handleScroll);

    this.textArea.addEventListener('input', (e) => {
      // @ts-ignore
      const textContent = e.target.textContent;

      if (this.sheet.formulaBar) {
        this.sheet.formulaBar.editableContent.textContent = textContent;
      }
    });
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler);
    this.sheet.eventEmitter.off(events.resize.col.start, this.hideCellEditor);
    this.sheet.eventEmitter.off(events.resize.row.start, this.hideCellEditor);
    this.cellTooltip.destroy();
  }

  private keyHandler = (e: KeyboardEvent) => {
    e.stopPropagation();
    switch (e.key) {
      case 'Enter':
      case 'Escape':
        this.hideCellEditor();
        break;
      default:
        if (!this.isEditing) {
          this.showCellEditor();
        }
    }
  };

  private showCellEditor = () => {
    const selectedCell = this.sheet.selector.getSelectedCell();

    this.setTextAreaPosition(selectedCell.getClientRect());
    this.textArea.style.display = 'initial';
    this.textArea.focus();
    this.isEditing = true;
  };

  private hideCellEditor = () => {
    this.textArea.style.display = 'none';
    this.isEditing = false;
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
      const selectedCell = this.sheet.selector.getSelectedCell();
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
