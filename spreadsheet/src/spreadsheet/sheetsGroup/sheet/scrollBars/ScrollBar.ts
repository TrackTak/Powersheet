import { KonvaEventObject } from 'konva/lib/Node';
import { DebouncedFunc, throttle } from 'lodash';
import events from '../../../events';
import { prefix } from '../../../utils';
import Sheet, { ICustomSizePosition } from '../Sheet';
import { IRowColFunctions, RowColType } from '../RowCol';
import styles from './ScrollBar.module.scss';
import Spreadsheet from '../../../Spreadsheet';

export type ScrollBarType = 'horizontal' | 'vertical';

export interface IScrollOffset {
  index: number;
  size: number;
}

class ScrollBar {
  scrollBarEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
  customSizePositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  scroll = 0;
  xIndex = 0;
  yIndex = 0;
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
    this.spreadsheet = this.sheet.sheetsGroup.spreadsheet;
    this.isCol = isCol;
    this.scrollType = this.isCol ? 'horizontal' : 'vertical';
    this.functions = functions;
    this.customSizePositions = [];
    this.scrollOffset = {
      size: 0,
      index: 0,
    };

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

    this.sheet.stage.on('wheel', this.onWheel);

    this.sheet.sheetEl.appendChild(this.scrollBarEl);
  }

  setYIndex() {
    this.yIndex = this.getYIndex();
  }

  updateCustomSizePositions() {
    let customSizeDifference = 0;
    const sizes = this.sheet.getData()[this.type]?.sizes ?? {};

    Object.keys(sizes).forEach((key) => {
      const index = parseInt(key, 10);
      const size = sizes[index];
      const axis =
        index * this.spreadsheet.options[this.type].defaultSize +
        customSizeDifference;

      customSizeDifference +=
        size - this.spreadsheet.options[this.type].defaultSize;

      this.customSizePositions[index] = {
        axis,
        size,
      };
    });

    const scrollSize = this.sheet.sheetDimensions[this.functions.size];
    //   this.sheet.getViewportVector()[this.functions.axis];

    this.scrollEl.style[this.functions.size] = `${scrollSize}px`;
  }

  private getNewScrollAmount(start: number, end: number) {
    const data = this.sheet.getData();
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;

    let newScrollAmount = 0;

    for (let i = start; i < end; i++) {
      const size = data[this.type]?.sizes[i];

      if (size) {
        newScrollAmount += size;
      } else {
        newScrollAmount += defaultSize;
      }
    }

    return newScrollAmount;
  }

  private getYIndex() {
    const xIndex = this.xIndex;
    const stageSize = this.sheet.stage[this.functions.size]();

    const yIndex = this.sheet[this.type].calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    );

    return yIndex;
  }

  onScroll = (e: Event) => {
    e.preventDefault();

    const event = e.target! as any;
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop;

    const scrollPercent =
      scroll / this.sheet.sheetDimensions[this.functions.size];
    let xIndex = Math.trunc(
      this.spreadsheet.options[this.type].amount * scrollPercent
    );

    let newScroll = Math.abs(this.scroll);

    const scrollAmount = this.getNewScrollAmount(this.xIndex, xIndex);
    const scrollReverseAmount =
      this.getNewScrollAmount(xIndex, this.xIndex) * -1;

    newScroll += scrollAmount;
    newScroll += scrollReverseAmount;

    newScroll *= -1;

    if (this.isCol) {
      this.sheet.scrollGroups.ySticky.x(newScroll);
    } else {
      this.sheet.scrollGroups.xSticky.y(newScroll);
    }

    this.sheet.scrollGroups.main[this.functions.axis](newScroll);

    // this.sheet.drawNextItems();

    this.xIndex = xIndex;
    this.yIndex = this.getYIndex();
    this.scroll = newScroll;

    if (!this.isCol) {
      console.log(this.yIndex);
    }

    this.sheet.emit(events.scroll[this.scrollType], e, newScroll);
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (this.isCol) {
      this.scrollBarEl.scrollBy(e.evt.deltaX, 0);
    } else {
      this.scrollBarEl.scrollBy(0, e.evt.deltaY);
    }

    this.sheet.emit(events.scrollWheel[this.scrollType], e);
  };

  destroy() {
    this.scrollBarEl.removeEventListener('scroll', this.throttledScroll);
  }
}

export default ScrollBar;
