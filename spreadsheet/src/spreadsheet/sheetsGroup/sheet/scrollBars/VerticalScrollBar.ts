import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { IHeaderDimensions, ISheetDimensions } from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder: IBuildScroll;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private horizontallyStickyLayer: Layer,
    private sheetDimensions: ISheetDimensions,
    private colHeaderDimensions: IHeaderDimensions,
    private getHorizontalScrollBarBoundingClientRect: () => DOMRect
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.horizontallyStickyLayer = horizontallyStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.colHeaderDimensions = colHeaderDimensions;
    this.getHorizontalScrollBarBoundingClientRect =
      getHorizontalScrollBarBoundingClientRect;
    this.scrollBarBuilder = buildScrollBar('vertical');

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.height = `${
        this.stage.height() -
        this.getHorizontalScrollBarBoundingClientRect().height -
        this.colHeaderDimensions.height
      }px`;
      this.scrollBar.style.bottom = `${
        this.getHorizontalScrollBarBoundingClientRect().height
      }px`;
    };

    const onWheel = (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      this.scrollBar.scrollBy(0, e.evt.deltaY);
    };

    const { scrollBar, scroll } = this.scrollBarBuilder.create(
      this.stage,
      onLoad,
      this.onScroll,
      onWheel
    );

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.height = `${this.sheetDimensions.height}px`;
  }

  onScroll = (e: Event) => {
    const { scrollTop, offsetHeight } = e.target! as any;

    const availableHeight = this.sheetDimensions.height - offsetHeight - 38;

    const delta = scrollTop / availableHeight;
    const yToMove =
      -(this.sheetDimensions.height - this.stage.height()) * delta;

    this.mainLayer.y(yToMove);
    this.horizontallyStickyLayer.y(yToMove);
  };

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default VerticalScrollBar;
