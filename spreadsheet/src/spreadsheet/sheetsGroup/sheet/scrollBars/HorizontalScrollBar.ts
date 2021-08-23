import { Group } from 'konva/lib/Group';
import { KonvaEventObject } from 'konva/lib/Node';
import events from '../../../events';
import Canvas, {
  calculateSheetViewportEndPosition,
  ICustomSizePosition,
  ISheetViewportPosition,
} from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import { IScrollBar, IScrollOffset } from './IScrollBar';

class HorizontalScrollBar implements IScrollBar {
  scrollBarEl!: HTMLDivElement;
  scrollEl!: HTMLDivElement;
  customSizePositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private canvas: Canvas,
    private sheetViewportPosition: ISheetViewportPosition,
    private colHeaderGroups: Group[]
  ) {
    this.canvas = canvas;
    this.sheetViewportPosition = sheetViewportPosition;
    this.colHeaderGroups = colHeaderGroups;
    this.customSizePositions = [];
    this.scrollOffset = {
      size: 0,
      index: 0,
    };

    let customWidthDifference = 0;

    Object.keys(this.canvas.options.col.widths).forEach((key) => {
      const index = parseInt(key, 10);
      const width = this.canvas.options.col.widths[key];
      const x =
        index * this.canvas.options.col.defaultWidth + customWidthDifference;

      customWidthDifference += width - this.canvas.options.col.defaultWidth;

      this.customSizePositions[index] = {
        axis: x,
        size: width,
      };
    });

    this.scrollBarBuilder = buildScrollBar(
      'horizontal',
      this.canvas.stage,
      this.canvas.eventEmitter,
      this.onCanvasLoad,
      this.onScroll,
      this.onWheel
    );

    const { scrollBarEl, scrollEl } = this.scrollBarBuilder.create();

    this.scrollBarEl = scrollBarEl;
    this.scrollEl = scrollEl;
  }

  getBoundingClientRect = () => {
    return this.scrollBarEl.getBoundingClientRect();
  };

  onCanvasLoad = () => {
    this.scrollBarEl.style.width = `${this.canvas.stage.width()}px`;

    this.scrollEl.style.width = `${
      this.canvas.sheetDimensions.width + this.canvas.getViewportVector().x
    }px`;

    this.canvas.container.appendChild(this.scrollBarEl);
  };

  onScroll = (e: Event) => {
    const { scrollLeft } = e.target! as any;

    // TODO: Remove when we have scrollbar snapping
    const customSizeChanges = this.customSizePositions.map(({ axis, size }) => {
      let sizeChange = 0;

      if (axis < scrollLeft) {
        const change = Math.min(scrollLeft - axis, size);

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

        if (axis < scrollLeft) {
          newSize -= this.canvas.options.col.defaultWidth;
        }

        return totalSize + newSize;
      },
      0
    );

    const scrollAmount = scrollLeft * -1;
    const scrollPercent =
      (scrollLeft - totalSizeDifference) /
      (this.canvas.sheetDimensions.width - totalSizeDifference);
    const ci = Math.trunc(this.canvas.options.numberOfCols * scrollPercent);

    this.sheetViewportPosition.x = ci;
    this.sheetViewportPosition.y = calculateSheetViewportEndPosition(
      this.canvas.stage.width(),
      this.sheetViewportPosition.x,
      this.canvas.options.col.defaultWidth,
      this.canvas.options.col.widths,
      customSizeChanges
    );

    this.canvas.layers.mainLayer.x(scrollAmount);
    this.canvas.layers.yStickyLayer.x(scrollAmount);

    this.canvas.eventEmitter.emit(events.scroll.horizontal, e);

    const col = this.colHeaderGroups[ci];

    this.scrollOffset = {
      index: ci,
      size: scrollLeft + this.canvas.getViewportVector().x - col.x(),
    };
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    this.scrollBarEl.scrollBy(e.evt.deltaX, 0);
  };

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default HorizontalScrollBar;
