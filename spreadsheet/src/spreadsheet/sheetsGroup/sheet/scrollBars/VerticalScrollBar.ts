import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import {
  calculateSheetViewportEndPosition,
  ICustomSizePosition,
  IDimensions,
  ISheetViewportPositions,
} from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../../../IOptions';
import { IRect } from 'konva/lib/types';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private customHeightPositions: ICustomSizePosition[];

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private xStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private getHorizontalScrollBarBoundingClientRect: () => DOMRect,
    private eventEmitter: EventEmitter,
    private options: IOptions,
    private sheetViewportDimensions: IRect
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.xStickyLayer = xStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.getHorizontalScrollBarBoundingClientRect =
      getHorizontalScrollBarBoundingClientRect;
    this.sheetViewportPositions = sheetViewportPositions;
    this.eventEmitter = eventEmitter;
    this.options = options;
    this.sheetViewportDimensions = sheetViewportDimensions;
    this.customHeightPositions = [];

    const heights = this.options.row.heights ?? {};

    let customHeightDifference = 0;

    Object.keys(heights).forEach((key) => {
      const index = parseInt(key, 10);
      const height = heights[key];
      const y = index * this.options.row.defaultHeight + customHeightDifference;

      customHeightDifference += height - this.options.row.defaultHeight;

      this.customHeightPositions[index] = {
        axis: y,
        size: height,
      };
    });

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.height = `${this.stage.height()}px`;
      this.scrollBar.style.bottom = `${
        this.getHorizontalScrollBarBoundingClientRect().height
      }px`;
    };

    const onScroll = (e: Event) => {
      const { scrollTop } = e.target! as any;

      const customSizeChanges = this.customHeightPositions.map(
        ({ axis, size }) => {
          let sizeChange = 0;

          if (axis < scrollTop) {
            const change = Math.min(scrollTop - axis, size);

            sizeChange = change - this.options.row.defaultHeight;
          }

          return {
            axis,
            size: sizeChange,
          };
        }
      );

      const totalSizeChange = customSizeChanges.reduce(
        (totalSize, { size }) => {
          return totalSize + size;
        },
        0
      );

      const scrollAmount = scrollTop * -1;
      const scrollPercent =
        (scrollTop - totalSizeChange) /
        (this.sheetDimensions.height - totalSizeChange);
      const ri = Math.trunc(this.options.numberOfRows * scrollPercent);

      //  const row = this.rowGroups[ri];
      //const rowPos = row.y() - this.sheetViewportDimensions.y;

      // const differenceInScroll = scrollTop - rowPos;

      //  console.log(this.customHeightPositions);
      //  console.log(scrollTop);
      // console.log(previousCustomHeights);

      // if (differenceInScroll !== 0) {
      //   this.scrollBar.scrollBy(0, -differenceInScroll);
      // } else {
      //  this.mainLayer.y(scrollAmount);
      //  this.xStickyLayer.y(scrollAmount);
      // }
      // if (ri !== this.sheetViewportPositions.row.x) {
      //   this.mainLayer.y(scrollAmount);
      //   this.xStickyLayer.y(scrollAmount);
      // }

      this.mainLayer.y(scrollAmount);
      this.xStickyLayer.y(scrollAmount);

      this.sheetViewportPositions.row.x = ri;
      this.sheetViewportPositions.row.y = calculateSheetViewportEndPosition(
        this.stage.height(),
        this.sheetViewportPositions.row.x,
        this.options.row.defaultHeight,
        this.options.row.heights,
        customSizeChanges
      );
      // console.log(this.sheetViewportPositions.row.x);
      //  console.log(this.sheetViewportPositions.row.y);
    };

    const onWheel = (e: KonvaEventObject<WheelEvent>) => {
      this.scrollBar.scrollBy(0, e.evt.deltaY);
    };

    this.scrollBarBuilder = buildScrollBar(
      'vertical',
      this.stage,
      onLoad,
      onScroll,
      onWheel,
      this.eventEmitter
    );

    const { scrollBar, scroll } = this.scrollBarBuilder.create();

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.height = `${
      this.sheetDimensions.height + this.sheetViewportDimensions.y
    }px`;
  }

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default VerticalScrollBar;
