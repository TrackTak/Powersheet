import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { IDimensions, ISheetViewportPositions } from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import EventEmitter from 'eventemitter3';
import buildScrollDelta, { IBuildScrollDelta } from './buildScrollDelta';
import { IOptions } from '../../../IOptions';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private deltaBuilder!: IBuildScrollDelta;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private xStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private getHorizontalScrollBarBoundingClientRect: () => DOMRect,
    private eventEmitter: EventEmitter,
    private options: IOptions
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
      const { scrollTop, offsetHeight, scrollHeight, clientHeight } =
        e.target! as any;

      const { delta, newSheetViewportPositions } =
        this.deltaBuilder.getScrollDelta(
          offsetHeight,
          scrollTop,
          scrollHeight,
          clientHeight,
          this.sheetViewportPositions.row,
          this.options.row.heights,
          this.options.row.defaultHeight
        );

      this.sheetViewportPositions.row = newSheetViewportPositions;

      const yToMove =
        -(this.sheetDimensions.height - this.stage.height()) * delta;

      this.mainLayer.y(yToMove);
      this.xStickyLayer.y(yToMove);
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
    this.deltaBuilder = buildScrollDelta(this.sheetDimensions.height);

    const { scrollBar, scroll } = this.scrollBarBuilder.create();

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.height = `${this.sheetDimensions.height}px`;
  }

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default VerticalScrollBar;
