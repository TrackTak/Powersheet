import EventEmitter from 'eventemitter3';
import { Rect } from 'konva/lib/shapes/Rect';
import { IRect } from 'konva/lib/types';
import events from '../../events';
import styles from './CellEditor.module.scss';
import Selector from './Selector';

class CellEditor {
  textArea!: HTMLTextAreaElement;
  private isEditing = false;

  constructor(
    private container: HTMLDivElement,
    private sheet: Rect,
    private selector: Selector,
    private eventEmitter: EventEmitter,
  ) {
    this.container = container;
    this.sheet = sheet;
    this.selector = selector;
    this.eventEmitter = eventEmitter;

    this.textArea = document.createElement('textarea');
    this.container.appendChild(this.textArea);
    this.setInitialTextAreaStyles();

    window.addEventListener('keydown', this.keyHandler);
    this.sheet.on('dblclick', this.showCellEditor);
    this.sheet.on('click', this.hideCellEditor);
    this.eventEmitter.on(events.scroll.vertical, () => this.updatePosition());

  }

  private setInitialTextAreaStyles = () => {
    this.textArea.classList.add(styles.cellEditor);
  }

  destroy() {
    this.sheet.off('dblclick', this.showCellEditor);
    this.sheet.off('click', this.hideCellEditor);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private keyHandler = (e: KeyboardEvent) => {
    e.preventDefault();
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
  }

  showCellEditor = () => {
    this.updatePosition();
    this.textArea.style.display = 'initial';
    this.textArea.focus();
    this.isEditing = true;
  }

  updatePosition = () => {
    const selectedCell = this.selector.getSelectedCell();
    console.log('selectedCell', selectedCell, selectedCell.position())
    const cellPosition = {
      x: selectedCell.x(),
      y: selectedCell.y(),
      width: selectedCell.width(),
      height: selectedCell.height(),
    }
    this.setTextAreaPosition(cellPosition);
  }

  hideCellEditor = () => {
    this.textArea.style.display = 'none';
    this.isEditing = false;
  }

  setTextAreaPosition = (position: IRect) => {
    this.textArea.style.top = `${position.y}px`;
    this.textArea.style.left = `${position.x}px`;
    this.textArea.style.width = `${position.width}px`;
    this.textArea.style.height = `${position.height}px`;
  }
}

export default CellEditor;
