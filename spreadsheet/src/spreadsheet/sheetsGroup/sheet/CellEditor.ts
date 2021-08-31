import EventEmitter from 'eventemitter3';
import { Rect } from 'konva/lib/shapes/Rect';
import { IRect } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';
import styles from './CellEditor.module.scss';
import Selector from './Selector';

class CellEditor {
  private textArea!: HTMLDivElement;
  private isEditing = false;
  private container: HTMLDivElement;
  private sheet: Rect;
  private rowHeader: Rect;
  private colHeader: Rect;
  private selector: Selector;
  private eventEmitter: EventEmitter;

  constructor(
    canvas: Canvas,
  ) {
    this.container = canvas.container;
    this.sheet = canvas.shapes.sheet;
    this.rowHeader = canvas.row.shapes.headerRect;
    this.colHeader = canvas.col.shapes.headerRect;
    this.selector = canvas.selector;
    this.eventEmitter = canvas.eventEmitter;

    this.textArea = document.createElement('div');
    this.textArea.setAttribute("contentEditable", "true");

    this.container.appendChild(this.textArea);
    this.setInitialTextAreaStyles();

    window.addEventListener('keydown', this.keyHandler);
    this.sheet.on('dblclick', this.showCellEditor);
    this.sheet.on('click', this.hideCellEditor);
    this.rowHeader.on('click', this.hideCellEditor);
    this.colHeader.on('click', this.hideCellEditor);
    this.eventEmitter.on(events.resize.col.start, this.hideCellEditor);
    this.eventEmitter.on(events.resize.row.start, this.hideCellEditor);
  }

  private setInitialTextAreaStyles = () => {
    this.textArea.classList.add(styles.cellEditor);
  };

  destroy() {
    this.sheet.off('dblclick', this.showCellEditor);
    this.sheet.off('click', this.hideCellEditor);
    window.removeEventListener('keydown', this.keyHandler);
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

  showCellEditor = () => {
    const selectedCell = this.selector.getSelectedCell();
    const selectedCellSize = selectedCell.getClientRect();
    const absolutePosition = selectedCell.getAbsolutePosition();
    const cellPosition = {
      x: absolutePosition.x,
      y: absolutePosition.y,
      width: selectedCellSize.width,
      height: selectedCellSize.height,
    };
    this.setTextAreaPosition(cellPosition);
    this.textArea.style.display = 'initial';
    this.textArea.focus();
    this.isEditing = true;
  };

  hideCellEditor = () => {
    this.textArea.style.display = 'none';
    this.isEditing = false;
  };

  setTextAreaPosition = (position: IRect) => {
    this.textArea.style.top = `${position.y}px`;
    this.textArea.style.left = `${position.x}px`;
    this.textArea.style.minWidth = `${position.width}px`;
    this.textArea.style.height = `${position.height}px`;
    this.textArea.style.lineHeight = `${position.height}px`;
  };
}

export default CellEditor;
