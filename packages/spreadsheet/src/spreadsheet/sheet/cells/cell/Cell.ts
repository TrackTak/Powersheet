import { Group } from '@tracktak/konva/lib/Group';
import { Rect } from '@tracktak/konva/lib/shapes/Rect';
import Spreadsheet from '../../../Spreadsheet';
import Sheet from '../../Sheet';
import RangeSimpleCellAddress from './RangeSimpleCellAddress';
import SimpleCellAddress from './SimpleCellAddress';

class Cell {
  spreadsheet: Spreadsheet;
  rangeSimpleCellAddress: RangeSimpleCellAddress;
  group: Group;
  rect: Rect;

  constructor(
    public sheet: Sheet,
    public simpleCellAddress: SimpleCellAddress,
    group?: Group
  ) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.simpleCellAddress = simpleCellAddress;
    this.rangeSimpleCellAddress = new RangeSimpleCellAddress(
      simpleCellAddress,
      simpleCellAddress
    );

    if (group) {
      this.group = group;
      this.rect = group.findOne('.cellRect');
    } else {
      this.group = new Group();
      this.rect = this.sheet.cells.cachedCellRect.clone();
      this.group.add(this.rect);
    }

    const { row, col } = this.simpleCellAddress;

    const position = {
      x: this.sheet.cols.getAxis(col) - this.sheet.getViewportVector().x,
      y: this.sheet.rows.getAxis(row) - this.sheet.getViewportVector().y,
    };

    this.rect.size({
      width: this.sheet.cols.getSize(col),
      height: this.sheet.rows.getSize(row),
    });

    this.group.position(position);

    this.setMergedCellPropertiesIfNeeded();
  }

  private setMergedCellPropertiesIfNeeded() {
    this.spreadsheet.merger.setAssociatedMergedCellIds(this.simpleCellAddress);

    const mergedCellAddress =
      this.spreadsheet.merger.associatedMergedCellAddressMap.get(
        this.simpleCellAddress.toCellId()
      );

    if (!mergedCellAddress) return;

    this.rangeSimpleCellAddress = mergedCellAddress;

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
