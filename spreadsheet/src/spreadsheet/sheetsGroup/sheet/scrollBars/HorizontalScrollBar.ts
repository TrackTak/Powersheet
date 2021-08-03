import EventEmitter from 'eventemitter3';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import events from '../../../events';
import { IDimensions, ISheetViewportPositions } from '../Canvas';
import Col from '../Col';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import buildScrollDelta, { IBuildScrollDelta } from './buildScrollDelta';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private deltaBuilder!: IBuildScrollDelta;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private yStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private setSheetViewportPositions: (
      sheetViewportPositions: ISheetViewportPositions
    ) => void,
    private cols: Col[],
    private eventEmitter: EventEmitter
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.yStickyLayer = yStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.setSheetViewportPositions = setSheetViewportPositions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.cols = cols;
    this.eventEmitter = eventEmitter;

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.width = `${this.stage.width()}px`;
    };

    this.eventEmitter.on(
      events.scrollWheel.horizontal,
      (e: KonvaEventObject<WheelEvent>) => {
        this.scrollBar.scrollBy(e.evt.deltaX, 0);
      }
    );

    this.eventEmitter.on(events.scroll.horizontal, (e: Event) => {
      const { scrollLeft, offsetWidth, scrollWidth, clientWidth } =
        e.target! as any;

      const { delta, newSheetViewportPositions } =
        this.deltaBuilder.getScrollDelta(
          this.cols,
          offsetWidth,
          scrollLeft,
          scrollWidth,
          clientWidth,
          this.sheetViewportPositions.col
        );

      this.setSheetViewportPositions({
        ...this.sheetViewportPositions,
        col: newSheetViewportPositions,
      });

      const xToMove =
        -(this.sheetDimensions.width - this.stage.width()) * delta;

      this.mainLayer.x(xToMove);
      this.yStickyLayer.x(xToMove);
    });

    this.scrollBarBuilder = buildScrollBar(
      'horizontal',
      this.stage,
      onLoad,
      this.eventEmitter
    );
    this.deltaBuilder = buildScrollDelta(this.sheetDimensions.width);

    const { scrollBar, scroll } = this.scrollBarBuilder.create();

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.width = `${this.sheetDimensions.width}px`;
  }

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default HorizontalScrollBar;
