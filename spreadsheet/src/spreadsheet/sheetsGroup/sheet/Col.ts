import { IRowCol } from './IRowCol';

class Col implements IRowCol {
  public isFrozen: boolean;

  constructor(
    public letter: string,
    public index: number,
    public minWidth: number,
    public width: number,
    isFrozen?: boolean
  ) {
    this.letter = letter;
    this.index = index;
    this.minWidth = minWidth;
    this.width = width;
    this.isFrozen = isFrozen ?? false;
  }

  getSize() {
    return this.width;
  }
}

export default Col;
