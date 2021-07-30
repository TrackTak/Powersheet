class Row {
  constructor(
    public number: number,
    public minHeight: number,
    public height?: number
  ) {
    this.number = number;
    this.minHeight = minHeight;
    this.height = height;
  }
}

export default Row;
