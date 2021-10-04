export type CellId = string;

class SimpleCellAddress {
  constructor(public sheet: number, public row: number, public col: number) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
  }

  static rowColToCellId = (row: number, col: number): CellId => {
    return `${row}_${col};`;
  };

  static cellIdToAddress(sheet: number, cellId: CellId) {
    const sections = cellId.split('_');
    const row = parseInt(sections[0], 10);
    const col = parseInt(sections[1], 10);

    return new SimpleCellAddress(sheet, row, col);
  }

  addressToString() {
    const letter = String.fromCharCode('A'.charCodeAt(0) + this.col);
    const number = this.row + 1;

    return `${letter}${number}`;
  }

  addressToCellId(): CellId {
    return SimpleCellAddress.rowColToCellId(this.row, this.col);
  }
}

export default SimpleCellAddress;
