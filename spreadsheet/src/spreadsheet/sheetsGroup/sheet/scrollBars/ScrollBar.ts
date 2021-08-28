import { KonvaEventObject } from 'konva/lib/Node';
import { DebouncedFunc, throttle } from 'lodash';
import events from '../../../events';
import { prefix } from '../../../utils';
import Canvas, { ICustomSizePosition } from '../Canvas';
import { IRowColFunctions, RowColType } from '../RowCol';
import styles from './ScrollBar.module.scss';

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

  constructor(
    private canvas: Canvas,
    private type: RowColType,
    private isCol: boolean,
    private functions: IRowColFunctions
  ) {
    this.canvas = canvas;
    this.type = type;
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

    this.canvas.stage.on('wheel', this.onWheel);

    this.canvas.container.appendChild(this.scrollBarEl);
  }

  getBoundingClientRect = () => {
    return this.scrollBarEl.getBoundingClientRect();
  };

  setup() {
    this.updateCustomSizePositions();

    this.scrollBarEl.style[this.functions.size] = `${this.canvas.stage[
      this.functions.size
    ]()}px`;
  }

  updateCustomSizePositions() {
    let customSizeDifference = 0;

    Object.keys(this.canvas.options[this.type].sizes).forEach((key) => {
      const index = parseInt(key, 10);
      const size = this.canvas.options[this.type].sizes[key];
      const axis =
        index * this.canvas.options[this.type].defaultSize +
        customSizeDifference;

      customSizeDifference += size - this.canvas.options[this.type].defaultSize;

      this.customSizePositions[index] = {
        axis,
        size,
      };
    });

    this.scrollEl.style[this.functions.size] = `${
      this.canvas.sheetDimensions[this.functions.size] +
      this.canvas.getViewportVector()[this.functions.axis]
    }px`;
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
          newSize -= this.canvas.options[this.type].defaultSize;
        }

        return totalSize + newSize;
      },
      0
    );

    const scrollAmount = scroll * -1;
    const scrollPercent =
      (scroll - totalSizeDifference) /
      (this.canvas.sheetDimensions[this.functions.size] - totalSizeDifference);
    const index = Math.trunc(
      this.canvas.options[this.type].amount * scrollPercent
    );

    this.canvas[this.type].sheetViewportPosition.x = index;
    this.canvas[this.type].sheetViewportPosition.y = this.canvas[
      this.type
    ].calculateSheetViewportEndPosition(
      this.canvas.stage[this.functions.size](),
      this.canvas[this.type].sheetViewportPosition.x,
      customSizeChanges
    );

    if (this.isCol) {
      this.canvas.scrollGroups.ySticky.x(scrollAmount);
    } else {
      this.canvas.scrollGroups.xSticky.y(scrollAmount);
    }

    this.canvas.scrollGroups.main[this.functions.axis](scrollAmount);

    this.canvas.updateViewport();

    const item = this.canvas[this.type].headerGroupMap.get(index)!;

    this.scrollOffset = {
      index,
      size:
        scroll +
        this.canvas.getViewportVector()[this.functions.axis] -
        item[this.functions.axis](),
    };

    this.canvas.eventEmitter.emit(
      events.scroll[this.scrollType],
      e,
      scrollAmount
    );
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (this.isCol) {
      this.scrollBarEl.scrollBy(e.evt.deltaX, 0);
    } else {
      this.scrollBarEl.scrollBy(0, e.evt.deltaY);
    }

    this.canvas.eventEmitter.emit(events.scrollWheel[this.scrollType], e);
  };

  destroy() {
    this.scrollBarEl.removeEventListener('scroll', this.throttledScroll);
  }
}

export default ScrollBar;
