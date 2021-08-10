import EventEmitter from 'eventemitter3';
import { Group } from 'konva/lib/Group';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { IRect } from 'konva/lib/types';
import { IOptions } from '../../../IOptions';
import { IDimensions, ISheetViewportPositions } from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private yStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private eventEmitter: EventEmitter,
    private options: IOptions,
    private colGroups: Group[],
    private sheetViewportDimensions: IRect
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.yStickyLayer = yStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.eventEmitter = eventEmitter;
    this.options = options;
    this.colGroups = colGroups;
    this.sheetViewportDimensions = sheetViewportDimensions;

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

      const scrollPercent = scrollLeft / this.sheetDimensions.width;
      const ci = Math.round(this.options.numberOfCols * scrollPercent);
      const scrollAmount = scrollLeft * -1;
      const col = this.colGroups[ci];
      const colPos = col.x() - this.sheetViewportDimensions.x;

      const differenceInScroll = scrollLeft - colPos;

      if (differenceInScroll !== 0) {
        this.scrollBar.scrollBy(-differenceInScroll, 0);
      } else {
        this.mainLayer.x(scrollAmount);
        this.yStickyLayer.x(scrollAmount);
      }

      if (ci !== this.sheetViewportPositions.col.x) {
        this.mainLayer.x(scrollAmount);
        this.yStickyLayer.x(scrollAmount);
      }

      const elementsInView =
        (this.stage.width() - this.sheetViewportDimensions.x) /
        this.options.col.defaultWidth;

      this.sheetViewportPositions.col.x = ci;
      this.sheetViewportPositions.col.y = ci + elementsInView - 1;
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
