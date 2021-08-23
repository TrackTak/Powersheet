import { Rect } from 'konva/lib/shapes/Rect';
import styles from './CellEditor.module.scss';
import Selector from './Selector';

interface ITextAreaPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

class CellEditor {
  textArea!: HTMLTextAreaElement;
  private isEditing = false;

  constructor(
    private container: HTMLDivElement,
    private sheet: Rect,
    private selector: Selector
  ) {
    this.container = container;
    this.sheet = sheet;
    this.selector = selector;
    this.create();
  }

  private create() {
    this.textArea = document.createElement('textarea');
    this.container.appendChild(this.textArea);
    this.setInitialTextAreaStyles();

    window.addEventListener('keydown', this.keyHandler);
    this.sheet.on('dblclick', this.showCellEditor);
    this.sheet.on('click', this.hideCellEditor);
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
    const selectedCell = this.selector.selectedRowCols;
    const cellPosition = {
      x: selectedCell.cols[0].attrs.x,
      y: selectedCell.rows[0].attrs.y,
      width: selectedCell.cols[0].attrs.width,
      height: selectedCell.rows[0].attrs.height,
    }
    this.setTextAreaPosition(cellPosition);
    this.textArea.style.display = 'initial';
    this.textArea.focus();
    this.isEditing = true;
  }

  hideCellEditor = () => {
    this.textArea.style.display = 'none';
    this.isEditing = false;
  }

  setTextAreaPosition = (position: ITextAreaPosition) => {
    this.textArea.style.top = `${position.y}px`;
    this.textArea.style.left = `${position.x}px`;
    this.textArea.style.width = `${position.width}px`;
    this.textArea.style.height = `${position.height}px`;
  }
}

export default CellEditor;
