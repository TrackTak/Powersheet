import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { prefix } from '../../../utils';
import { ISheetDimensions } from '../Canvas';
import styles from './ScrollBar.module.scss';

class HorizontalScrollBar {
  scrollBar!: HTMLDivElement;
  private scroll!: HTMLDivElement;

  constructor(
    stage: Stage,
    layer: Layer,
    sheetDimensions: ISheetDimensions,
    getVerticalScrollBarBoundingClientRect: () => DOMRect
  ) {
    this.create(
      stage,
      layer,
      sheetDimensions,
      getVerticalScrollBarBoundingClientRect
    );
  }

  create(
    stage: Stage,
    mainLayer: Layer,
    sheetDimensions: ISheetDimensions,
    getVerticalScrollBarBoundingClientRect: () => DOMRect
  ) {
    this.scrollBar = document.createElement('div');
    this.scrollBar.classList.add(
      `${prefix}-horizontal-scroll-bar`,
      styles.horizontalScrollBar
    );

    this.scroll = document.createElement('div');
    this.scroll.classList.add(
      `${prefix}-horizontal-scroll`,
      styles.horizontalScroll
    );
    this.scroll.style.width = `${sheetDimensions.width}px`;

    this.scrollBar.appendChild(this.scroll);

    window.addEventListener('load', () => {
      this.scrollBar.style.width = `${
        stage.width() - getVerticalScrollBarBoundingClientRect().width
      }px`;
    });

    this.scrollBar.addEventListener('scroll', (e: Event) => {
      const { scrollLeft, offsetWidth } = e.target! as any;

      const availableWidth = sheetDimensions.width - offsetWidth - 42;

      const delta = scrollLeft / availableWidth;

      mainLayer.x(-(sheetDimensions.width - stage.width()) * delta);
    });
  }
}

export default HorizontalScrollBar;
