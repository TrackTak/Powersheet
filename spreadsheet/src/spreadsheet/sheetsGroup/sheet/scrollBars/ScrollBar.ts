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

    const scrollSize =
      this.sheet.sheetDimensions[this.functions.size] +
      this.sheet.getViewportVector()[this.functions.axis];

    this.scrollEl.style[this.functions.size] = `${scrollSize}px`;
  }

  onScroll = (e: Event) => {
    e.preventDefault();

    const event = e.target! as any;
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop;

    // TODO: Remove when we have scrollbar snapping
    const customSizeChanges = this.customSizePositions.map(({ axis, size }) => {
      let sizeChange = 0;

      if (axis < scroll) {
        const change = Math.min(scroll - axis, size);

        sizeChange = change;
      }
      return {
        axis,
        size: sizeChange,
      };
    });

    const totalSizeDifference = customSizeChanges.reduce(
      (totalSize, { axis, size }) => {
        let newSize = size;

        if (axis < scroll) {
          newSize -= this.spreadsheet.options[this.type].defaultSize;
        }

        return totalSize + newSize;
      },
      0
    );

    const scrollAmount = scroll * -1;
    const scrollPercent =
      (scroll - totalSizeDifference) /
      (this.sheet.sheetDimensions[this.functions.size] - totalSizeDifference);
    const index = Math.trunc(
      this.spreadsheet.options[this.type].amount * scrollPercent
    );

    this.sheet[this.type].sheetViewportPosition.x = index;
    this.sheet[this.type].sheetViewportPosition.y = this.sheet[
      this.type
    ].calculateSheetViewportEndPosition(
      this.sheet.stage[this.functions.size](),
      this.sheet[this.type].sheetViewportPosition.x,
      customSizeChanges
    );

    if (this.isCol) {
      this.sheet.scrollGroups.ySticky.x(scrollAmount);
    } else {
      this.sheet.scrollGroups.xSticky.y(scrollAmount);
    }

    this.sheet.scrollGroups.main[this.functions.axis](scrollAmount);

    this.sheet.drawNextItems();

    const item = this.sheet[this.type].headerGroupMap.get(index)!;

    this.scrollOffset = {
      index,
      size:
        scroll +
        this.sheet.getViewportVector()[this.functions.axis] -
        item[this.functions.axis](),
    };

    this.sheet.emit(events.scroll[this.scrollType], e, scrollAmount);
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
