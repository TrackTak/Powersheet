import { IRect } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import { Rect } from 'konva/lib/shapes/Rect';
class CellEditor {
  private textArea!: HTMLDivElement;
  private cellTooltip: DelegateInstance;
  private isEditing = false;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;

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
    this.canvas.container.appendChild(this.textArea);

    window.addEventListener('keydown', this.keyHandler);
    this.canvas.shapes.sheet.on('dblclick', this.showCellEditor);
    this.canvas.shapes.sheet.on('click', this.hideCellEditor);

    this.canvas.stage.on('click', this.hideCellEditor);

    this.canvas.eventEmitter.on(events.scroll.horizontal, this.handleScroll);
    this.canvas.eventEmitter.on(events.scroll.vertical, this.handleScroll);
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.shapes.sheet.off('dblclick', this.showCellEditor);
    this.canvas.shapes.sheet.off('click', this.hideCellEditor);
    this.canvas.row.shapes.headerGroup.off('click', this.hideCellEditor);
    this.canvas.col.shapes.headerGroup.off('click', this.hideCellEditor);
    this.canvas.eventEmitter.off(events.resize.col.start, this.hideCellEditor);
    this.canvas.eventEmitter.off(events.resize.row.start, this.hideCellEditor);
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
    const selectedCell = this.canvas.selector.getSelectedCell();
    const cellRect = selectedCell.children![0] as Rect;
    const absolutePosition = selectedCell.getAbsolutePosition();
    const cellPosition = {
      x: absolutePosition.x,
      y: absolutePosition.y,
      width: cellRect.width(),
      height: cellRect.height(),
    };
    this.setTextAreaPosition(cellPosition, cellRect.strokeWidth() / 2);
    this.textArea.style.display = 'initial';
    this.textArea.focus();
    this.isEditing = true;
  };

  private hideCellEditor = () => {
    this.textArea.style.display = 'none';
    this.isEditing = false;
  };

  private setTextAreaPosition = (position: IRect, offset: number) => {
    this.textArea.style.top = `${position.y + offset}px`;
    this.textArea.style.left = `${position.x + offset}px`;
    this.textArea.style.minWidth = `${position.width - offset * 2}px`;
    this.textArea.style.height = `${position.height - offset * 2}px`;
    this.textArea.style.lineHeight = `${position.height - offset * 2}px`;
  };

  private hideCellTooltip = () => {
    this.cellTooltip.hide();
  };

  private showCellTooltip = () => {
    const selectedCell = this.canvas.selector.getSelectedCell().attrs.start;
    const rowText = this.canvas.row.getHeaderText(selectedCell.row);
    const colText = this.canvas.col.getHeaderText(selectedCell.col);
    this.cellTooltip.setContent(`${colText}${rowText}`);
    this.cellTooltip.show();
  };

  private handleScroll = () => {
    const rowScrollOffset = this.canvas.row.scrollBar.scrollOffset;
    const colScrollOffset = this.canvas.col.scrollBar.scrollOffset;

    if (rowScrollOffset.index || colScrollOffset.index) {
      this.showCellTooltip();
    } else {
      this.hideCellTooltip();
    }
  };
}

export default CellEditor;
