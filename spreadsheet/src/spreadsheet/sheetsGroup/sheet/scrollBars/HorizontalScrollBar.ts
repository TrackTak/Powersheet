import EventEmitter from 'eventemitter3';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { IRect } from 'konva/lib/types';
import { IOptions } from '../../../IOptions';
import {
  calculateSheetViewportEndPosition,
  ICustomSizePosition,
  IDimensions,
  ISheetViewportPositions,
} from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  customWidthPositions: ICustomSizePosition[];
  customSizeChanges: ICustomSizePosition[];
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private yStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private eventEmitter: EventEmitter,
    private options: IOptions,
    private sheetViewportDimensions: IRect
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.yStickyLayer = yStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.eventEmitter = eventEmitter;
    this.options = options;
    this.sheetViewportDimensions = sheetViewportDimensions;
    this.customWidthPositions = [];
    this.customSizeChanges = [];

    const widths = this.options.col.widths ?? {};

    let customWidthDifference = 0;

    Object.keys(widths).forEach((key) => {
      const index = parseInt(key, 10);
      const width = widths[key];
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

      this.customSizeChanges = this.customWidthPositions.map(
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

      const totalSizeDifference = this.customSizeChanges.reduce(
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
      // const col = this.colGroups[ci];
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

      this.mainLayer.x(scrollAmount);
      this.yStickyLayer.x(scrollAmount);

      this.sheetViewportPositions.col.x = ci;
      this.sheetViewportPositions.col.y = calculateSheetViewportEndPosition(
        this.stage.width(),
        this.sheetViewportPositions.col.x,
        this.options.col.defaultWidth,
        this.options.col.widths,
        this.customSizeChanges
      );
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
