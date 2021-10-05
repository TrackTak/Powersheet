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

    this.setCellRectProperties();
  }

  setMergedCellProperties(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    this.rangeSimpleCellAddress = rangeSimpleCellAddress;

    const rows = this.sheet.rows.getRowColsFromRangeSimpleCellAddress(
      this.rangeSimpleCellAddress
    );
    const cols = this.sheet.cols.getRowColsFromRangeSimpleCellAddress(
      this.rangeSimpleCellAddress
    );

    const width = cols.reduce((prev, curr) => {
      return (prev += this.sheet.cols.getSize(curr.index));
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += this.sheet.rows.getSize(curr.index));
    }, 0);

    this.rect.width(width);
    this.rect.height(height);
  }

  getIsCellPartOfMerge() {
    return this.sheet.merger.associatedMergedCellAddressMap.has(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress
    );
  }

  getStickyGroupCellBelongsTo() {
    return this.sheet.getStickyGroupType(
      this.isOnFrozenRow(),
      this.isOnFrozenCol()
    );
  }

  isOnFrozenRow() {
    return this.sheet.rows.rowColMap
      .get(this.rangeSimpleCellAddress.topLeftSimpleCellAddress.row)!
      .getIsFrozen();
  }

  isOnFrozenCol() {
    return this.sheet.cols.rowColMap
      .get(this.rangeSimpleCellAddress.topLeftSimpleCellAddress.col)!
      .getIsFrozen();
  }

  destroy() {
    this.group.destroy();
  }

  private setCellRectProperties() {
    const row = this.sheet.rows.rowColMap.get(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.row
    )!;
    const col = this.sheet.cols.rowColMap.get(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.col
    )!;

    this.group.x(col.getAxis() - this.sheet.getViewportVector().x);
    this.group.y(row.getAxis() - this.sheet.getViewportVector().y);

    this.rect.width(this.sheet.cols.getSize(col.index));
    this.rect.height(this.sheet.rows.getSize(row.index));

    this.group.add(this.rect);
  }

  getClientRectWithoutStroke() {
    return this.group.getClientRect({
      skipStroke: true,
    });
  }
}

export default Cell;
