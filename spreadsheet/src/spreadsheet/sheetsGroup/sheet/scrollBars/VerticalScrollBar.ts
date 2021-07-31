import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { prefix } from '../../../utils';
import { ISheetDimensions } from '../Canvas';
import styles from './ScrollBar.module.scss';

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  private scroll!: HTMLDivElement;

  constructor(stage: Stage, layer: Layer, sheetDimensions: ISheetDimensions) {
    this.create(stage, layer, sheetDimensions);
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  create(stage: Stage, mainLayer: Layer, sheetDimensions: ISheetDimensions) {
    this.scrollBar = document.createElement('div');
    this.scrollBar.classList.add(
      `${prefix}-vertical-scroll-bar`,
      styles.verticalScrollBar
    );

    this.scroll = document.createElement('div');
    this.scroll.classList.add(
      `${prefix}-vertical-scroll`,
      styles.verticalScroll
    );
    this.scroll.style.height = `${sheetDimensions.height}px`;

    this.scrollBar.appendChild(this.scroll);

    window.addEventListener('load', () => {
      this.scrollBar.style.height = `${stage.height()}px`;
    });

    this.scrollBar.addEventListener('scroll', (e: Event) => {
      const { scrollTop, offsetHeight } = e.target! as any;

      const availableHeight = sheetDimensions.height - offsetHeight - 38;

      const delta = scrollTop / availableHeight;

      mainLayer.y(-(sheetDimensions.height - stage.height()) * delta);
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();

      this.scrollBar.scrollBy(0, 50);
    });
  }
}

export default VerticalScrollBar;
