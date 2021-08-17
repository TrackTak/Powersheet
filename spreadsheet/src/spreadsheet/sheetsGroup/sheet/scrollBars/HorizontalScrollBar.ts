import EventEmitter from 'eventemitter3';
import { Group } from 'konva/lib/Group';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { IRect } from 'konva/lib/types';
import { IOptions } from '../../../options';
import {
  calculateSheetViewportEndPosition,
  ICustomSizePosition,
  IDimensions,
  ILayers,
  ISheetViewportPositions,
} from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import { IScrollOffset } from './VerticalScrollBar';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  customWidthPositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private stage: Stage,
    private layers: ILayers,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private colHeaderGroups: Group[],
    private eventEmitter: EventEmitter,
    private options: IOptions,
    private sheetViewportDimensions: IRect,
    private onScroll: (e: Event) => void
  ) {
    this.stage = stage;
    this.layers = layers;
    this.sheetDimensions = sheetDimensions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.eventEmitter = eventEmitter;
    this.options = options;
    this.sheetViewportDimensions = sheetViewportDimensions;
    this.colHeaderGroups = colHeaderGroups;
    this.customWidthPositions = [];
    this.scrollOffset = {
      size: 0,
      index: 0,
    };
    this.onScroll = onScroll;

    let customWidthDifference = 0;

    Object.keys(this.options.col.widths).forEach((key) => {
      const index = parseInt(key, 10);
      const width = this.options.col.widths[key];
      const x = index * this.options.col.defaultWidth + customWidthDifference;

      customWidthDifference += width - this.options.col.defaultWidth;

      this.customWidthPositions[index] = {
        axis: x,
        size: width,
      };
    });

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.width = `${this.stage.width()}px`;
    };

    const onScroll = (e: Event) => {
      const { scrollLeft } = e.target! as any;

      const customSizeChanges = this.customWidthPositions.map(
        ({ axis, size }) => {
          let sizeChange = 0;

          if (axis < scrollLeft) {
            const change = Math.min(scrollLeft - axis, size);

            sizeChange = change;
          }
          return {
            axis,
            size: sizeChange,
          };
        }
      );

      const totalSizeDifference = customSizeChanges.reduce(
        (totalSize, { axis, size }) => {
          let newSize = size;

          if (axis < scrollLeft) {
            newSize -= this.options.col.defaultWidth;
          }

          return totalSize + newSize;
        },
        0
      );

      const scrollAmount = scrollLeft * -1;
      const scrollPercent =
        (scrollLeft - totalSizeDifference) /
        (this.sheetDimensions.width - totalSizeDifference);
      const ci = Math.trunc(this.options.numberOfCols * scrollPercent);

      this.sheetViewportPositions.col.x = ci;
      this.sheetViewportPositions.col.y = calculateSheetViewportEndPosition(
        this.stage.width(),
        this.sheetViewportPositions.col.x,
        this.options.col.defaultWidth,
        this.options.col.widths,
        customSizeChanges
      );

      this.layers.mainLayer.x(scrollAmount);
      this.layers.yStickyLayer.x(scrollAmount);

      this.onScroll(e);

      const col = this.colHeaderGroups[ci];

      this.scrollOffset = {
        index: ci,
        size: scrollLeft + this.sheetViewportDimensions.x - col.x(),
      };
      // const col = this.colHeaderGroups[ci];
      // const colPos = col.x() - this.sheetViewportDimensions.x;

      // const differenceInScroll = scrollLeft - colPos;

      // if (differenceInScroll !== 0) {
      //   this.scrollBar.scrollBy(-differenceInScroll, 0);
      // } else {
      //   this.mainLayer.x(scrollAmount);
      //   this.yStickyLayer.x(scrollAmount);
      // }

      // if (ci !== this.sheetViewportPositions.col.x) {
      //   this.mainLayer.x(scrollAmount);
      //   this.yStickyLayer.x(scrollAmount);
      // }
    };

    const onWheel = (e: KonvaEventObject<WheelEvent>) => {
      this.scrollBar.scrollBy(e.evt.deltaX, 0);
    };

    this.scrollBarBuilder = buildScrollBar(
      'horizontal',
      this.stage,
      onLoad,
      onScroll,
      onWheel,
      this.eventEmitter
    );

    const { scrollBar, scroll } = this.scrollBarBuilder.create();

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.width = `${
      this.sheetDimensions.width + this.sheetViewportDimensions.x
    }px`;
  }

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default HorizontalScrollBar;
