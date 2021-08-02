import { IRowColSize } from './IRowColSize';

class Row implements IRowColSize {
  constructor(
    public number: number,
    public minHeight: number,
    public height: number
  ) {
    this.number = number;
    this.minHeight = minHeight;
    this.height = height;
  }

  getSize() {
    return this.height;
  }
}

export default Row;
