import { ICustomSizePosition } from '../Canvas';
import { IScrollOffset } from './VerticalScrollBar';

export interface IScrollBar {
  scrollBarEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
  customSizePositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  getBoundingClientRect: () => DOMRect;
  destroy: () => void;
}
