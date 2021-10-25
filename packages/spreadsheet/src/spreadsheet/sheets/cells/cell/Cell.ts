import { Group } from 'konva/lib/Group';
import { Rect } from 'konva/lib/shapes/Rect';
import Spreadsheet from '../../../Spreadsheet';
import Sheets from '../../Sheets';
import RangeSimpleCellAddress from './RangeSimpleCellAddress';
import SimpleCellAddress from './SimpleCellAddress';

class Cell {
  spreadsheet: Spreadsheet;
  rangeSimpleCellAddress: RangeSimpleCellAddress;
  group: Group;
  rect: Rect;

  constructor(
    public sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    group?: Group
  ) {
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;
    this.simpleCellAddress = simpleCellAddress;
    this.rangeSimpleCellAddress = new RangeSimpleCellAddress(
      simpleCellAddress,
      simpleCellAddress
    );

    if (group) {
      this.group = group;
      this.rect = group.findOne('.rect');
    } else {
      this.group = new Group();
      this.rect = new Rect({
        ...this.spreadsheet.styles.cell.rect,
        ...this.sheets.cells.getDefaultCellRectAttrs(),
        name: 'rect',
      });
      this.group.add(this.rect);
    }

    this.update();
  }

  update() {
    const { row, col } = this.simpleCellAddress;

    const position = {
      x: this.sheets.cols.getAxis(col) - this.sheets.getViewportVector().x,
      y: this.sheets.rows.getAxis(row) - this.sheets.getViewportVector().y,
    };

    this.rect.size({
      width: this.sheets.cols.getSize(col),
      height: this.sheets.rows.getSize(row),
    });

    this.group.position(position);

    this.setMergedCellPropertiesIfNeeded();
  }

  isCellOnFrozenRow() {
    return this.sheets.rows.getIsFrozen(this.simpleCellAddress.row);
  }

  isCellOnFrozenCol() {
    return this.sheets.cols.getIsFrozen(this.simpleCellAddress.col);
  }

  getStickyGroupCellBelongsTo() {
    return this.sheets.getStickyGroupType(
      this.isCellOnFrozenRow(),
      this.isCellOnFrozenCol()
    );
  }

  private setMergedCellPropertiesIfNeeded() {
    this.spreadsheet.sheets.merger.setAssociatedMergedCellIds(
      this.simpleCellAddress
    );

    const mergedCellAddress =
      this.spreadsheet.sheets.merger.associatedMergedCellAddressMap.get(
        this.simpleCellAddress.toCellId()
      );

    if (!mergedCellAddress) return;

    this.rangeSimpleCellAddress = mergedCellAddress;

    let width = 0;
    let height = 0;

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'col'
    )) {
      width += this.sheets.cols.getSize(index);
    }

    for (const index of this.rangeSimpleCellAddress.iterateFromTopToBottom(
      'row'
    )) {
      height += this.sheets.rows.getSize(index);
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
