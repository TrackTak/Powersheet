import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { DebouncedFunc, throttle } from 'lodash';
import { prefix } from '../../../utils';
import styles from './ScrollBar.module.scss';

export interface IBuildScroll {
  create: (
    stage: Stage,
    onLoad: (e: Event) => void,
    onScroll: (e: Event) => void,
    onWheel: (e: KonvaEventObject<WheelEvent>) => void
  ) => {
    scrollBar: HTMLDivElement;
    scroll: HTMLDivElement;
  };
  destroy: () => void;
}

type ScrollBarType = 'vertical' | 'horizontal';

const buildScrollBar = (scrollBarType: ScrollBarType): IBuildScroll => {
  let scrollBar: HTMLDivElement;
  let scroll: HTMLDivElement;
  let throttledScroll: DebouncedFunc<(e: Event) => void>;

  const create = (
    stage: Stage,
    onLoad: (e: Event) => void,
    onScroll: (e: Event) => void,
    onWheel: (e: KonvaEventObject<WheelEvent>) => void
  ) => {
    scrollBar = document.createElement('div');

    scrollBar.classList.add(
      `${prefix}-scroll-bar`,
      scrollBarType,
      styles[`${scrollBarType}ScrollBar`]
    );

    scroll = document.createElement('div');

    scroll.classList.add(`${prefix}-scroll`, styles[`${scrollBarType}Scroll`]);

    scrollBar.appendChild(scroll);

    window.addEventListener('load', onLoad);

    // 60 fps: (1000ms / 60fps = 16ms);
    throttledScroll = throttle(onScroll, 16);

    scrollBar.addEventListener('scroll', throttledScroll);

    stage.on('wheel', onWheel);

    return {
      scrollBar,
      scroll,
    };
  };

  const destroy = () => {
    scrollBar.removeEventListener('scroll', throttledScroll);
  };

  return {
    create,
    destroy,
  };
};

export default buildScrollBar;
