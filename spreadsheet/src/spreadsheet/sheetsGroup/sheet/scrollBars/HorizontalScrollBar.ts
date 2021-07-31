import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { IHeaderDimensions, ISheetDimensions } from '../Canvas';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private verticallyStickyLayer: Layer,
    private sheetDimensions: ISheetDimensions,
    private rowHeaderDimensions: IHeaderDimensions
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.verticallyStickyLayer = verticallyStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.rowHeaderDimensions = rowHeaderDimensions;
    this.scrollBarBuilder = buildScrollBar('horizontal');

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

    const onWheel = (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      this.scrollBar.scrollBy(e.evt.deltaX, 0);
    };

    const { scrollBar, scroll } = this.scrollBarBuilder.create(
      this.stage,
      onLoad,
      this.onScroll,
      onWheel
    );

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.width = `${this.sheetDimensions.width}px`;
  }

  onScroll = (e: Event) => {
    const { scrollLeft, offsetWidth } = e.target! as any;

    const availableWidth = this.sheetDimensions.width - offsetWidth - 42;

    const delta = scrollLeft / availableWidth;
    const xToMove = -(this.sheetDimensions.width - this.stage.width()) * delta;

    this.mainLayer.x(xToMove);
    this.verticallyStickyLayer.x(xToMove);
  };

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default HorizontalScrollBar;
