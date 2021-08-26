import Canvas, { ICustomSizePosition, ISheetViewportPosition } from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import { Group } from 'konva/lib/Group';
import { IScrollBar, IScrollOffset } from './IScrollBar';
import events from '../../../events';

class VerticalScrollBar implements IScrollBar {
  scrollBarEl!: HTMLDivElement;
  scrollEl!: HTMLDivElement;
  customSizePositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private canvas: Canvas,
    private sheetViewportPosition: ISheetViewportPosition,
    private rowHeaderGroups: Group[]
  ) {
    this.canvas = canvas;
    this.sheetViewportPosition = sheetViewportPosition;
    this.rowHeaderGroups = rowHeaderGroups;
    this.customSizePositions = [];
    this.scrollOffset = {
      size: 0,
      index: 0,
    };

    this.scrollBarBuilder = buildScrollBar(
      'vertical',
      this.canvas.stage,
      this.canvas.eventEmitter,
      this.onCanvasLoad,
      this.onScroll,
      this.onWheel
    );

    const { scrollBarEl, scrollEl } = this.scrollBarBuilder.create();

    this.scrollBarEl = scrollBarEl;
    this.scrollEl = scrollEl;

    this.canvas.container.appendChild(this.scrollBarEl);

    this.canvas.eventEmitter.on(events.resize.row.end, this.onResizeRowEnd);
  }

  getBoundingClientRect = () => {
    return this.scrollBarEl.getBoundingClientRect();
  };

  onCanvasLoad = () => {
    this.updateCustomSizePositions();

    this.scrollBarEl.style.height = `${this.canvas.stage.height()}px`;
    this.scrollBarEl.style.bottom = `${
      this.canvas.col.scrollBar.getBoundingClientRect().height
    }px`;
  };

  onResizeRowEnd = () => {
    this.updateCustomSizePositions();
  };

  updateCustomSizePositions() {
    let customHeightDifference = 0;

    Object.keys(this.canvas.options.row.heights).forEach((key) => {
      const index = parseInt(key, 10);
      const height = this.canvas.options.row.heights[key];
      const y =
        index * this.canvas.options.row.defaultHeight + customHeightDifference;

      customHeightDifference += height - this.canvas.options.row.defaultHeight;

      this.customSizePositions[index] = {
        axis: y,
        size: height,
      };
    });

    this.scrollEl.style.height = `${
      this.canvas.sheetDimensions.height + this.canvas.getViewportVector().y
    }px`;
  }

  onScroll = (e: Event) => {
    const { scrollTop } = e.target! as any;

    // TODO: Remove when we have scrollbar snapping
    const customSizeChanges = this.customSizePositions.map(({ axis, size }) => {
      let sizeChange = 0;

      if (axis < scrollTop) {
        const change = Math.min(scrollTop - axis, size);

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

        if (axis < scrollTop) {
          newSize -= this.canvas.options.row.defaultHeight;
        }

        return totalSize + newSize;
      },
      0
    );

    const scrollAmount = scrollTop * -1;
    const scrollPercent =
      (scrollTop - totalSizeDifference) /
      (this.canvas.sheetDimensions.height - totalSizeDifference);
    const ri = Math.trunc(this.canvas.options.numberOfRows * scrollPercent);

    this.sheetViewportPosition.x = ri;
    this.sheetViewportPosition.y =
      this.canvas.row.calculateSheetViewportEndPosition(
        this.canvas.stage.height(),
        this.sheetViewportPosition.x,
        this.canvas.options.row.defaultHeight,
        this.canvas.options.row.heights,
        customSizeChanges
      );

    this.canvas.layers.mainLayer.y(scrollAmount);
    this.canvas.layers.xStickyLayer.y(scrollAmount);

    this.canvas.eventEmitter.emit(events.scroll.vertical, e);

    const row = this.rowHeaderGroups[ri];

    this.scrollOffset = {
      index: ri,
      size: scrollTop + this.canvas.getViewportVector().y - row.y(),
    };
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    this.scrollBarEl.scrollBy(0, e.evt.deltaY);
  };

  destroy() {
    this.canvas.eventEmitter.off(events.resize.row.end, this.onResizeRowEnd);

    this.scrollBarBuilder.destroy();
  }
}

export default VerticalScrollBar;
