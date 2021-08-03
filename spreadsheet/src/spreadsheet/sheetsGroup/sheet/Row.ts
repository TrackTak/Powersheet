import { IRowCol } from './IRowCol';

class Row implements IRowCol {
  public isFrozen: boolean;

  constructor(
    public number: number,
    public index: number,
    public minHeight: number,
    public height: number,
    isFrozen?: boolean
  ) {
    this.number = number;
    this.index = index;
    this.minHeight = minHeight;
    this.height = height;
    this.isFrozen = isFrozen ?? false;
  }

  getSize() {
    return this.height;
  }
}

export default Row;
