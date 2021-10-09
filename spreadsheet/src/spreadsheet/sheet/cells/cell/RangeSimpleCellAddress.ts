import { RowColType } from '../../rowCols/RowCols';
import Sheet from '../../Sheet';
import Cell from './Cell';
import SimpleCellAddress from './SimpleCellAddress';

class RangeSimpleCellAddress {
  constructor(
    public topLeftSimpleCellAddress: SimpleCellAddress,
    public bottomRightSimpleCellAddress: SimpleCellAddress
  ) {
    this.topLeftSimpleCellAddress = topLeftSimpleCellAddress;
    this.bottomRightSimpleCellAddress = bottomRightSimpleCellAddress;
  }

  height() {
    return (
      this.bottomRightSimpleCellAddress.row -
      this.topLeftSimpleCellAddress.row +
      1
    );
  }

  width() {
    return (
      this.bottomRightSimpleCellAddress.col -
      this.topLeftSimpleCellAddress.col +
      1
    );
  }

  getArrayOfAddresses = () => {
    const addresses: SimpleCellAddress[][] = [];

    for (let y = 0; y < this.height(); ++y) {
      addresses[y] = [];

      for (let x = 0; x < this.width(); ++x) {
        const simpleCellAddress = new SimpleCellAddress(
          this.topLeftSimpleCellAddress.sheet,
          this.topLeftSimpleCellAddress.row + y,
          this.topLeftSimpleCellAddress.col + x
        );

        addresses[y].push(simpleCellAddress);
      }
    }
    return addresses;
  };

  *iterateFromTopToBottom(type: RowColType) {
    for (
      let index = this.topLeftSimpleCellAddress[type];
      index <= this.bottomRightSimpleCellAddress[type];
      index++
    ) {
      yield index;
    }
  }

  limitTopLeftAddressToAnotherRange(
    rowColType: RowColType,
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    if (
      rangeSimpleCellAddress.topLeftSimpleCellAddress[rowColType] <
      this.topLeftSimpleCellAddress[rowColType]
    ) {
      this.topLeftSimpleCellAddress[rowColType] =
        rangeSimpleCellAddress.topLeftSimpleCellAddress[rowColType];
    }
  }

  limitBottomRightAddressToAnotherRange(
    rowColType: RowColType,
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    if (
      rangeSimpleCellAddress.bottomRightSimpleCellAddress[rowColType] >
      this.bottomRightSimpleCellAddress[rowColType]
    ) {
      this.bottomRightSimpleCellAddress[rowColType] =
        rangeSimpleCellAddress.bottomRightSimpleCellAddress[rowColType];
    }
  }

  getCellsBetweenRange<C extends Cell>(
    sheet: Sheet,
    getCell: (simpleCellAddress: SimpleCellAddress) => C
  ) {
    const cells: C[] = [];

    for (const ri of this.iterateFromTopToBottom('row')) {
      for (const ci of this.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(sheet.sheetId, ri, ci);
        const cell = getCell(simpleCellAddress);

        cells.push(cell);
      }
    }

    const filterOutAssociatedMergedCells = (cell: C) => {
      const mergedCellAddress = sheet.merger.associatedMergedCellAddressMap.get(
        cell.simpleCellAddress.toCellId()
      );

      if (
        !mergedCellAddress ||
        sheet.spreadsheet.data.getIsCellAMergedCell(cell.simpleCellAddress)
      ) {
        return true;
      }

      return false;
    };

    return cells.filter(filterOutAssociatedMergedCells);
  }
}

export default RangeSimpleCellAddress;
