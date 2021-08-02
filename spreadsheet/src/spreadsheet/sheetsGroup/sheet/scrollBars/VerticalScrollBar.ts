import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { IDimensions, ISheetViewportPositions } from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import EventEmitter from 'eventemitter3';
import Row from '../Row';
import events from '../../../events';
import buildScrollDelta, { IBuildScrollDelta } from './buildScrollDelta';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private deltaBuilder!: IBuildScrollDelta;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private horizontallyStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private sheetViewportPositions: ISheetViewportPositions,
    private setSheetViewportPositions: (
      sheetViewportPositions: ISheetViewportPositions
    ) => void,
    private getHorizontalScrollBarBoundingClientRect: () => DOMRect,
    private rows: Row[],
    private eventEmitter: EventEmitter
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.horizontallyStickyLayer = horizontallyStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.getHorizontalScrollBarBoundingClientRect =
      getHorizontalScrollBarBoundingClientRect;
    this.setSheetViewportPositions = setSheetViewportPositions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.rows = rows;
    this.eventEmitter = eventEmitter;

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

    this.eventEmitter.on(
      events.scrollWheel.vertical,
      (e: KonvaEventObject<WheelEvent>) => {
        this.scrollBar.scrollBy(0, e.evt.deltaY);
      }
    );

    this.eventEmitter.on(events.scroll.vertical, (e: Event) => {
      const { scrollTop, offsetHeight, scrollHeight, clientHeight } =
        e.target! as any;

      const { delta, newSheetViewportPositions } =
        this.deltaBuilder.getScrollDelta(
          this.rows,
          offsetHeight,
          scrollTop,
          scrollHeight,
          clientHeight,
          this.sheetViewportPositions.row
        );

      this.setSheetViewportPositions({
        ...this.sheetViewportPositions,
        row: newSheetViewportPositions,
      });

      const yToMove =
        -(this.sheetDimensions.height - this.stage.height()) * delta;

      this.mainLayer.y(yToMove);
      this.horizontallyStickyLayer.y(yToMove);
    });

    this.scrollBarBuilder = buildScrollBar(
      'vertical',
      this.stage,
      onLoad,
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
