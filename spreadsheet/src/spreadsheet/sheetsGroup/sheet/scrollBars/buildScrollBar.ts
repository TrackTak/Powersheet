import EventEmitter from 'eventemitter3';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { DebouncedFunc, throttle } from 'lodash';
import events from '../../../events';
import { prefix } from '../../../utils';
import styles from './ScrollBar.module.scss';

export interface IBuildScroll {
  create: () => {
    scrollBar: HTMLDivElement;
    scroll: HTMLDivElement;
  };
  destroy: () => void;
}

type ScrollBarType = 'vertical' | 'horizontal';

const buildScrollBar = (
  scrollBarType: ScrollBarType,
  stage: Stage,
  onLoad: (e: Event) => void,
  eventEmitter: EventEmitter
): IBuildScroll => {
  let scrollBar: HTMLDivElement;
  let scroll: HTMLDivElement;
  let throttledScroll: DebouncedFunc<(e: Event) => void>;

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    eventEmitter.emit(events.scrollWheel[scrollBarType], e);
  };

  const onScroll = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    eventEmitter.emit(events.scroll[scrollBarType], e);
  };

  const create = () => {
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
    throttledScroll = throttle(onScroll, 0);

    scrollBar.addEventListener('scroll', throttledScroll);

    stage.on('wheel', onWheel);

    return {
      scrollBar,
      scroll,
    };
  };

  const destroy = () => {
    scrollBar.removeEventListener('scroll', throttledScroll);
    window.removeEventListener('load', onLoad);
    stage.off('wheel', onWheel);
  };

  return {
    create,
    destroy,
  };
};

export default buildScrollBar;
