import { Group } from 'konva/lib/Group';
import { Rect } from 'konva/lib/shapes/Rect';
import Spreadsheet from '../../../Spreadsheet';
import Sheet from '../../Sheet';
import RangeSimpleCellAddress from './RangeSimpleCellAddress';
import SimpleCellAddress from './SimpleCellAddress';

class Cell {
  group: Group;
  rect: Rect;
  spreadsheet: Spreadsheet;
  rangeSimpleCellAddress: RangeSimpleCellAddress;

  constructor(
    public sheet: Sheet,
    public simpleCellAddress: SimpleCellAddress
  ) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.simpleCellAddress = simpleCellAddress;
    this.rangeSimpleCellAddress = new RangeSimpleCellAddress(
      simpleCellAddress,
      simpleCellAddress
    );

    this.group = new Group();

    this.rect = new Rect(this.spreadsheet.styles.cell.rect);

    const { row, col } = this.rangeSimpleCellAddress.topLeftSimpleCellAddress;

    this.group.x(
      this.sheet.cols.getAxis(col) - this.sheet.getViewportVector().x
    );
    this.group.y(
      this.sheet.rows.getAxis(row) - this.sheet.getViewportVector().y
    );

    this.rect.width(this.sheet.cols.getSize(col));
    this.rect.height(this.sheet.rows.getSize(row));

    this.group.add(this.rect);

    this.sheet.merger.setAssociatedMergedCellIds(this.simpleCellAddress);

    const mergedCellAddress = sheet.merger.associatedMergedCellAddressMap.get(
      simpleCellAddress.toStringFormat()
    );

    if (mergedCellAddress) {
      this.setMergedCellProperties(mergedCellAddress);
    }
  }

  private setMergedCellProperties(
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    this.rangeSimpleCellAddress = rangeSimpleCellAddress;

    let width = 0;
    let height = 0;

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'col'
    )) {
      width += this.sheet.cols.getSize(index);
    }

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'row'
    )) {
      height += this.sheet.rows.getSize(index);
    }

    this.rect.width(width);
    this.rect.height(height);
  }

  getIsCellPartOfMerge() {
    return this.sheet.merger.associatedMergedCellAddressMap.has(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.toStringFormat()
    );
  }

  getStickyGroupCellBelongsTo() {
    return this.sheet.getStickyGroupType(
      this.isOnFrozenRow(),
      this.isOnFrozenCol()
    );
  }

  isOnFrozenRow() {
    return this.sheet.rows.getIsFrozen(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.row
    );
  }

  isOnFrozenCol() {
    return this.sheet.cols.getIsFrozen(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.col
    );
  }

  destroy() {
    this.group.destroy();
  }

  getClientRectWithoutStroke() {
    return this.group.getClientRect({
      skipStroke: true,
    });
  }
}

export default Cell;
