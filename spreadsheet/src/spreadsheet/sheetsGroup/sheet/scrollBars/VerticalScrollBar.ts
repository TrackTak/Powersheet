import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { IDimensions, ISheetViewportPositions } from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../../../IOptions';
import { Group } from 'konva/lib/Group';
import { IRect } from 'konva/lib/types';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private xStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private getHorizontalScrollBarBoundingClientRect: () => DOMRect,
    private eventEmitter: EventEmitter,
    private options: IOptions,
    private rowGroups: Group[],
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
    this.rowGroups = rowGroups;
    this.sheetViewportDimensions = sheetViewportDimensions;

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

      const scrollPercent = scrollTop / this.sheetDimensions.height;
      const ri = Math.round(this.options.numberOfRows * scrollPercent);
      const scrollAmount = scrollTop * -1;
      const row = this.rowGroups[ri];
      const rowPos = row.y() - this.sheetViewportDimensions.y;

      const differenceInScroll = scrollTop - rowPos;

      if (differenceInScroll !== 0) {
        this.scrollBar.scrollBy(0, -differenceInScroll);
      } else {
        this.mainLayer.y(scrollAmount);
        this.xStickyLayer.y(scrollAmount);
      }

      if (ri !== this.sheetViewportPositions.row.x) {
        this.mainLayer.y(scrollAmount);
        this.xStickyLayer.y(scrollAmount);
      }

      const elementsInView =
        (this.stage.height() - this.sheetViewportDimensions.y) /
        this.options.row.defaultHeight;

      this.sheetViewportPositions.row.x = ri;
      this.sheetViewportPositions.row.y = ri + elementsInView - 1;
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
