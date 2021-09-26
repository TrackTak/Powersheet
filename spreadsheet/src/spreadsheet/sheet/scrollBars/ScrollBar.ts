import { DebouncedFunc, throttle } from 'lodash';
import events from '../../events';
import { prefix } from '../../utils';
import Sheet, { iterateXToY } from '../Sheet';
import { IRowColFunctions, RowColType } from '../RowCol';
import styles from './ScrollBar.module.scss';
import Spreadsheet from '../../Spreadsheet';
import { Vector2d } from 'konva/lib/types';

export type ScrollBarType = 'horizontal' | 'vertical';

class ScrollBar {
  scrollBarEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
  scroll = 0;
  totalPreviousCustomSizeDifferences = 0;
  sheetViewportPosition: Vector2d = {
    x: 0,
    y: 0,
  };
  previousSheetViewportPosition: Vector2d = {
    x: 0,
    y: 0,
  };
  previousTouchMovePosition: number = 0;
  private scrollType: ScrollBarType;
  private throttledScroll: DebouncedFunc<(e: Event) => void>;
  private spreadsheet: Spreadsheet;

  constructor(
    private sheet: Sheet,
    private type: RowColType,
    private isCol: boolean,
    private functions: IRowColFunctions
  ) {
    this.sheet = sheet;
    this.type = type;
    this.spreadsheet = this.sheet.spreadsheet;
    this.isCol = isCol;
    this.scrollType = this.isCol ? 'horizontal' : 'vertical';
    this.functions = functions;

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

  setScrollSize() {
    const scrollSize = this.sheet.sheetDimensions[this.functions.size];
    //   this.sheet.getViewportVector()[this.functions.axis];

    this.scrollEl.style[this.functions.size] = `${scrollSize}px`;
  }

  private getNewScrollAmount(start: number, end: number) {
    const data = this.sheet.getData();
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;

    let newScrollAmount = 0;
    let totalCustomSizeDifferencs = 0;

    for (let i = start; i < end; i++) {
      const size = data[this.type]?.sizes?.[i];

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
    const stageSize = this.sheet.stage[this.functions.size]();

    const yIndex = this.sheet[this.type].calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    );

    // Add 1 to make it inclusive
    return yIndex + 1;
  }

  setYIndex() {
    this.sheetViewportPosition.y = this.getYIndex();
  }

  drawItems() {
    this.destroyOutOfViewportItems();
    this.drawViewportItems();
  }

  onScroll = (e: Event) => {
    e.preventDefault();

    const event = e.target! as any;
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop;
    const scrollHeight = event.scrollHeight;

    const scrollPercent = scroll / scrollHeight;

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
      this.sheet.scrollGroups.ySticky.x(newScroll);
    } else {
      this.sheet.scrollGroups.xSticky.y(newScroll);
    }

    this.sheet.scrollGroups.main[this.functions.axis](newScroll);

    this.previousSheetViewportPosition.x = this.sheetViewportPosition.x;
    this.previousSheetViewportPosition.y = this.sheetViewportPosition.y;
    this.scroll = newScroll;
    this.totalPreviousCustomSizeDifferences =
      totalPreviousCustomSizeDifferences;

    this.setYIndex();
    this.drawItems();
    this.sheet.cellRenderer.updateViewport();

    if (this.sheet.cellEditor.currentScroll?.[this.type] !== this.scroll) {
      this.sheet.cellEditor.showCellTooltip();
    } else {
      this.sheet.cellEditor.hideCellTooltip();
    }

    this.spreadsheet.emit(events.scroll[this.scrollType], e, newScroll);
  };

  private drawItem(index: number) {
    if (
      !this.sheet[this.type].headerGroupMap.get(index) ||
      !this.sheet[this.type].rowColMap.get(index)
    ) {
      this.sheet[this.type].draw(index);
    }
  }

  private drawViewportItems() {
    for (const index of iterateXToY(
      this.sheet[this.type].scrollBar.sheetViewportPosition
    )) {
      this.drawItem(index);
    }
  }

  private destroyOutOfViewportItems() {
    for (const [key, rowCol] of this.sheet[this.type].rowColMap) {
      if (this.sheet.isShapeOutsideOfViewport(rowCol)) {
        rowCol.destroy();

        this.sheet[this.type].rowColMap.delete(key);
      }
    }

    for (const [key, header] of this.sheet[this.type].headerGroupMap) {
      if (this.sheet.isShapeOutsideOfViewport(header)) {
        header.destroy();

        this.sheet[this.type].headerGroupMap.delete(key);
      }
    }
  }

  destroy() {
    this.scrollBarEl.removeEventListener('scroll', this.throttledScroll);
  }
}

export default ScrollBar;
