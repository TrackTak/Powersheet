import { DebouncedFunc, throttle } from 'lodash';
import { prefix } from '../../../utils';
import Sheet from '../../Sheet';
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols';
import styles from './ScrollBar.module.scss';
import Spreadsheet from '../../../Spreadsheet';
import ViewportPosition from './ViewportPosition';
import RowColAddress from '../../cells/cell/RowColAddress';

export type ScrollBarType = 'horizontal' | 'vertical';

class ScrollBar {
  scrollBarEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
  scroll = 0;
  totalPreviousCustomSizeDifferences = 0;
  sheetViewportPosition = new ViewportPosition();
  previousSheetViewportPosition = new ViewportPosition();
  previousTouchMovePosition = 0;
  scrollType: ScrollBarType;
  throttledScroll: DebouncedFunc<(e: Event) => void>;
  spreadsheet: Spreadsheet;
  sheet: Sheet;
  type: RowColType;
  isCol: boolean;
  functions: IRowColFunctions;
  layerListeningTimeout?: NodeJS.Timeout;
  pluralType: RowColsType;
  isScrolling = false;

  constructor(public rowCols: RowCols) {
    this.rowCols = rowCols;
    this.sheet = this.rowCols.sheet;
    this.type = this.rowCols.type;
    this.pluralType = this.rowCols.pluralType;
    this.spreadsheet = this.sheet.spreadsheet;
    this.isCol = this.rowCols.isCol;
    this.scrollType = this.isCol ? 'horizontal' : 'vertical';
    this.functions = this.rowCols.functions;

    this.scrollBarEl = document.createElement('div');
    this.scrollEl = document.createElement('div');

    this.scrollBarEl.classList.add(
      `${prefix}-scroll-bar`,
      this.scrollType,
      styles[`${this.scrollType}ScrollBar`]
    );

    this.scrollEl.classList.add(
      `${prefix}-scroll`,
      styles[`${this.scrollType}Scroll`]
    );

    this.scrollBarEl.appendChild(this.scrollEl);

    // 60 fps: (1000ms / 60fps = 16ms);
    this.throttledScroll = throttle(this.onScroll, 16);

    this.scrollBarEl.addEventListener('scroll', this.throttledScroll);

    this.sheet.sheetEl.appendChild(this.scrollBarEl);

    this.setScrollSize();
  }

  getIsScrollingNormal() {
    return (
      this.sheetViewportPosition.x >= this.previousSheetViewportPosition.x &&
      this.sheetViewportPosition.y >= this.previousSheetViewportPosition.y
    );
  }

  setScrollSize() {
    const scrollSize = this.sheet.sheetDimensions[this.functions.size];
    //   this.sheet.getViewportVector()[this.functions.axis];

    this.scrollEl.style[this.functions.size] = `${scrollSize}px`;
  }

  private getNewScrollAmount(start: number, end: number) {
    const data = this.spreadsheet.data.spreadsheetData;
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;

    let newScrollAmount = 0;
    let totalCustomSizeDifferencs = 0;

    for (let i = start; i < end; i++) {
      const rowCollAddress = new RowColAddress(this.sheet.sheetId, i);
      const size =
        data[this.pluralType]?.[rowCollAddress.toSheetRowColId()]?.size;

      if (size) {
        totalCustomSizeDifferencs += size - defaultSize;
        newScrollAmount += size;
      } else {
        newScrollAmount += defaultSize;
      }
    }

    return {
      newScrollAmount,
      totalCustomSizeDifferencs,
    };
  }

  private getYIndex() {
    const xIndex = this.sheetViewportPosition.x;
    const stageSize =
      this.sheet.stage[this.functions.size]() -
      this.sheet.getViewportVector()[this.functions.axis];

    const yIndex = this.rowCols.calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    );

    return yIndex;
  }

  setYIndex() {
    this.sheetViewportPosition.y = this.getYIndex();
  }

  onScroll = (e: Event) => {
    e.preventDefault();

    const event = e.target! as any;
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop;
    const scrollSize = this.isCol ? event.scrollWidth : event.scrollHeight;

    const scrollPercent = scroll / scrollSize;

    this.isScrolling = true;

    this.sheetViewportPosition.x = Math.trunc(
      this.spreadsheet.options[this.type].amount * scrollPercent
    );

    let newScroll = Math.abs(this.scroll);

    const scrollAmount = this.getNewScrollAmount(
      this.previousSheetViewportPosition.x,
      this.sheetViewportPosition.x
    );

    const scrollReverseAmount = this.getNewScrollAmount(
      this.sheetViewportPosition.x,
      this.previousSheetViewportPosition.x
    );

    scrollReverseAmount.newScrollAmount *= -1;
    scrollReverseAmount.totalCustomSizeDifferencs *= -1;

    const totalPreviousCustomSizeDifferences =
      this.totalPreviousCustomSizeDifferences +
      scrollAmount.totalCustomSizeDifferencs +
      scrollReverseAmount.totalCustomSizeDifferencs;

    newScroll +=
      scrollAmount.newScrollAmount + scrollReverseAmount.newScrollAmount;

    newScroll *= -1;

    if (this.isCol) {
      this.sheet.scrollGroups.ySticky.group.x(newScroll);
    } else {
      this.sheet.scrollGroups.xSticky.group.y(newScroll);
    }

    this.sheet.scrollGroups.main.group[this.functions.axis](newScroll);

    this.previousSheetViewportPosition.x = this.sheetViewportPosition.x;
    this.previousSheetViewportPosition.y = this.sheetViewportPosition.y;
    this.scroll = newScroll;
    this.totalPreviousCustomSizeDifferences =
      totalPreviousCustomSizeDifferences;

    this.setYIndex();
    this.rowCols.cacheOutOfViewportRowCols();
    this.rowCols.updateViewport();
    this.sheet.cells.cacheOutOfViewportCells();
    this.sheet.cells.updateViewport();

    if (this.sheet.cellEditor.currentScroll?.[this.type] !== this.scroll) {
      this.sheet.cellEditor.showCellTooltip();
    } else {
      this.sheet.cellEditor.hideCellTooltip();
    }

    if (this.layerListeningTimeout) {
      clearTimeout(this.layerListeningTimeout);
    }

    this.layerListeningTimeout = setTimeout(() => {
      this.sheet.layer.listening(true);
      this.isScrolling = false;
    }, 40);
    // Improves performance by ~4fps
    this.sheet.layer.listening(false);

    this.spreadsheet.eventEmitter.emit(
      this.isCol ? 'scrollHorizontal' : 'scrollVertical',
      e,
      newScroll
    );
  };

  destroy() {
    this.scrollBarEl.removeEventListener('scroll', this.throttledScroll);
  }
}

export default ScrollBar;
