import { KonvaEventObject } from 'konva/lib/Node';
import { DebouncedFunc, throttle } from 'lodash';
import events from '../../../events';
import { prefix } from '../../../utils';
import Sheet, { ICustomSizePosition, ISheetViewportPosition } from '../Sheet';
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
  sheetViewportPosition: ISheetViewportPosition;
  previousSheetViewportPosition: ISheetViewportPosition;
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
    this.sheetViewportPosition = {
      x: 0,
      y: 0,
    };
    this.previousSheetViewportPosition = {
      x: 0,
      y: 0,
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

  *iterateSheetViewport(axis: 'x' | 'y') {
    const isScrollingNormal =
      this.previousSheetViewportPosition[axis] <
      this.sheetViewportPosition[axis];

    const start = isScrollingNormal
      ? this.previousSheetViewportPosition[axis]
      : this.sheetViewportPosition[axis];
    const end = isScrollingNormal
      ? this.sheetViewportPosition[axis]
      : this.previousSheetViewportPosition[axis];

    for (let index = start; index < end; index++) {
      yield { index, isScrollingNormal };
    }
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
    const xIndex = this.sheetViewportPosition.x;
    const stageSize = this.sheet.stage[this.functions.size]();

    const yIndex = this.sheet[this.type].calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    );

    // Add 1 to make it inclusive
    return yIndex + 1;
  }

  renderItems() {
    this.sheetViewportPosition.y = this.getYIndex();

    this.createInViewportItemsOnScroll();
    this.destroyOutOfViewportItemsOnScroll();
  }

  onScroll = (e: Event) => {
    e.preventDefault();

    const event = e.target! as any;
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop;

    const scrollPercent =
      scroll / this.sheet.sheetDimensions[this.functions.size];

    this.sheetViewportPosition.x = Math.trunc(
      this.spreadsheet.options[this.type].amount * scrollPercent
    );

    this.renderItems();

    let newScroll = Math.abs(this.scroll);

    const scrollAmount = this.getNewScrollAmount(
      this.previousSheetViewportPosition.x,
      this.sheetViewportPosition.x
    );
    const scrollReverseAmount =
      this.getNewScrollAmount(
        this.sheetViewportPosition.x,
        this.previousSheetViewportPosition.x
      ) * -1;

    newScroll += scrollAmount;
    newScroll += scrollReverseAmount;

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

    this.sheet.emit(events.scroll[this.scrollType], e, newScroll);
  };

  private createItem(index: number) {
    const cellIds = this.sheet[this.type].rowColCellMap.get(index);

    cellIds?.forEach((cellId) => {
      const cell = this.sheet.cellRenderer.cellsMap.get(cellId)!;

      this.sheet.cellRenderer.drawCell(cell);
    });

    this.sheet[this.type].draw(index);
  }

  private createInViewportItemsOnScroll() {
    for (const { isScrollingNormal, index } of this.iterateSheetViewport('x')) {
      if (!isScrollingNormal) {
        this.createItem(index);
      }
    }

    for (const { isScrollingNormal, index } of this.iterateSheetViewport('y')) {
      if (isScrollingNormal) {
        this.createItem(index);
      }
    }
  }

  private destroyItem(index: number) {
    // const cellIds = this.sheet[this.type].rowColCellMap.get(index);
    const header = this.sheet[this.type].headerGroupMap.get(index)!;
    const rowCol = this.sheet[this.type].rowColMap.get(index)!;

    // cellIds?.forEach((cellId) => {
    //   const cell = this.sheet.cellRenderer.cellsMap.get(cellId)!;

    //   cell.destroy();
    // });

    // console.log(header.parent._id);

    header.destroy();
    rowCol.destroy();
  }

  private destroyOutOfViewportItemsOnScroll() {
    for (const { isScrollingNormal, index } of this.iterateSheetViewport('x')) {
      if (isScrollingNormal) {
        this.destroyItem(index);
      }
    }

    for (const { isScrollingNormal, index } of this.iterateSheetViewport('y')) {
      if (!isScrollingNormal) {
        this.destroyItem(index);
      }
    }
  }

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
