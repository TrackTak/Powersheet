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
  onScroll: (e: Event) => void,
  onWheel: (e: KonvaEventObject<WheelEvent>) => void,
  eventEmitter: EventEmitter
): IBuildScroll => {
  let scrollBar: HTMLDivElement;
  let scroll: HTMLDivElement;
  let throttledScroll: DebouncedFunc<(e: Event) => void>;

  const _onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    onWheel(e);
    eventEmitter.emit(events.scrollWheel[scrollBarType], e);
  };

  const _onScroll = (e: Event) => {
    e.preventDefault();

    onScroll(e);
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

    window.addEventListener('DOMContentLoaded', onLoad);

    // 60 fps: (1000ms / 60fps = 16ms);
    throttledScroll = throttle(_onScroll, 16);

    scrollBar.addEventListener('scroll', throttledScroll);

    stage.on('wheel', _onWheel);

    return {
      scrollBar,
      scroll,
    };
  };

  const destroy = () => {
    scrollBar.removeEventListener('scroll', throttledScroll);
    window.removeEventListener('DOMContentLoaded', onLoad);
    stage.off('wheel', _onWheel);
  };

  return {
    create,
    destroy,
  };
};

export default buildScrollBar;
