import EventEmitter from 'eventemitter3';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import events from '../../../events';
import { IDimensions } from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private verticallyStickyLayer: Layer,
    private sheetDimensions: IDimensions,
    private rowHeaderDimensions: IDimensions,
    private eventEmitter: EventEmitter
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.verticallyStickyLayer = verticallyStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.rowHeaderDimensions = rowHeaderDimensions;
    this.eventEmitter = eventEmitter;

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.width = `${
        this.stage.width() - this.rowHeaderDimensions.width
      }px`;
    };

    this.eventEmitter.on(
      events.scrollWheel.horizontal,
      (e: KonvaEventObject<WheelEvent>) => {
        this.scrollBar.scrollBy(e.evt.deltaX, 0);
      }
    );

    this.eventEmitter.on(events.scroll.horizontal, (e: Event) => {
      const { scrollLeft, offsetWidth } = e.target! as any;

      const availableWidth = this.sheetDimensions.width - offsetWidth - 42;

      const delta = scrollLeft / availableWidth;
      const f = this.sheetDimensions.width;
      const p = this.stage.width();
      const xToMove =
        -(this.sheetDimensions.width - this.stage.width()) * delta;

      this.mainLayer.x(xToMove);
      this.verticallyStickyLayer.x(xToMove);
    });

    this.scrollBarBuilder = buildScrollBar(
      'horizontal',
      this.stage,
      onLoad,
      this.eventEmitter
    );

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
