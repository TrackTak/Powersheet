import { ICustomSizePosition } from '../Canvas';

export interface IScrollOffset {
  index: number;
  size: number;
}

export interface IScrollBar {
  scrollBarEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
  customSizePositions: ICustomSizePosition[];
  scrollOffset: IScrollOffset;
  getBoundingClientRect: () => DOMRect;
  updateCustomSizePositions: () => void;
  destroy: () => void;
}
