import EventEmitter from 'eventemitter3';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { IRect } from 'konva/lib/types';
import { IOptions } from '../../../IOptions';
import {
  calculateSheetViewportEndPosition,
  IDimensions,
  ISheetViewportPositions,
} from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

interface ICustomWidthPosition {
  x: number;
  width: number;
  index: number;
}

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private customWidthPositions: ICustomWidthPosition[];

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

    const widths = this.options.col.widths ?? {};

    let customWidthDifference = 0;

    Object.keys(widths).forEach((key) => {
      const index = parseInt(key, 10);
      const width = widths[key];
      const x = index * this.options.col.defaultWidth + customWidthDifference;

      customWidthDifference += width - this.options.col.defaultWidth;

      this.customWidthPositions.push({
        x,
        width,
        index,
      });
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

      const previousCustomWidthsChange = this.customWidthPositions.reduce(
        (totalWidth, { x, width }) => {
          if (x < scrollLeft) {
            const change = Math.min(scrollLeft - x, width);

            return totalWidth + change - this.options.col.defaultWidth;
          }
          return totalWidth;
        },
        0
      );
      const scrollAmount = scrollLeft * -1;
      const scrollPercent =
        (scrollLeft - previousCustomWidthsChange) /
        (this.sheetDimensions.width - previousCustomWidthsChange);
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
        this.options.col.widths
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
