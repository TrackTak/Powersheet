import { IRowColSize } from './IRowColSize';

class Col implements IRowColSize {
  constructor(
    public letter: string,
    public index: number,
    public minWidth: number,
    public width: number,
    public isFrozen?: boolean
  ) {
    this.letter = letter;
    this.index = index;
    this.minWidth = minWidth;
    this.width = width;
    this.isFrozen ?? false;
  }

  getSize() {
    return this.width;
  }
}

export default Col;
