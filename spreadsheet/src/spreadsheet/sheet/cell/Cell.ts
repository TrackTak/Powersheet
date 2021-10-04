import { Group } from 'konva/lib/Group';
import { Rect } from 'konva/lib/shapes/Rect';
import Spreadsheet from '../../Spreadsheet';
import Sheet from '../Sheet';
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

    const rows = this.sheet.row.getHeadersFromRangeSimpleCellAddress(
      this.rangeSimpleCellAddress
    );
    const cols = this.sheet.col.getHeadersFromRangeSimpleCellAddress(
      this.rangeSimpleCellAddress
    );

    const width = cols.reduce((prev, curr) => {
      return (prev += curr.width());
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += curr.height());
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
    return this.sheet.row.getIsFrozen(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.row
    );
  }

  isOnFrozenCol() {
    return this.sheet.col.getIsFrozen(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.col
    );
  }

  destroy() {
    this.group.destroy();
  }

  private setCellRectProperties() {
    const rowHeader = this.sheet.row.headerGroupMap.get(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.row
    )!;
    const colHeader = this.sheet.col.headerGroupMap.get(
      this.rangeSimpleCellAddress.topLeftSimpleCellAddress.col
    )!;

    this.group.x(colHeader.x() - this.sheet.getViewportVector().x);
    this.group.y(rowHeader.y() - this.sheet.getViewportVector().y);

    this.rect.width(colHeader.width());
    this.rect.height(rowHeader.height());

    this.group.add(this.rect);
  }

  getClientRectWithoutStroke() {
    return this.group.getClientRect({
      skipStroke: true,
    });
  }
}

export default Cell;
