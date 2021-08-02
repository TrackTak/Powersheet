import { IRowColSize } from './IRowColSize';

class Col implements IRowColSize {
  constructor(
    public number: number,
    public minWidth: number,
    public width: number
  ) {
    this.number = number;
    this.minWidth = minWidth;
    this.width = width;
  }

  getSize() {
    return this.width;
  }
}

export default Col;
