import { Group } from 'konva/lib/Group';
import { Rect } from 'konva/lib/shapes/Rect';
import Sheets from '../../Sheets';
import RangeSimpleCellAddress from './RangeSimpleCellAddress';
import SimpleCellAddress from './SimpleCellAddress';

class Cell {
  rangeSimpleCellAddress: RangeSimpleCellAddress;
  group: Group;
  rect: Rect;

  constructor(
    public sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    group?: Group
  ) {
    this.sheets = sheets;
    this.simpleCellAddress = simpleCellAddress;
    this.rangeSimpleCellAddress = new RangeSimpleCellAddress(
      simpleCellAddress,
      simpleCellAddress
    );

    if (group) {
      this.group = group;
      this.rect = group.children!.find((x) => x.name() === 'rect') as Rect;
    } else {
      this.group = new Group({
        name: 'cellGroup',
      });
      this.rect = new Rect({
        ...this.sheets.spreadsheet.styles.cell.rect,
        name: 'rect',
      });
      this.group.add(this.rect);
    }
    this.rect.setAttrs(this.sheets.cells.getDefaultCellRectAttrs());
    this.updatePosition();
    this.updateSize();
  }

  updatePosition() {
    const { row, col } = this.simpleCellAddress;

    const position = {
      x: this.sheets.cols.getAxis(col) - this.sheets.getViewportVector().x,
      y: this.sheets.rows.getAxis(row) - this.sheets.getViewportVector().y,
    };

    this.group.position(position);
  }

  updateSize() {
    const { row, col } = this.simpleCellAddress;

    this.rect.size({
      width: this.sheets.cols.getSize(col),
      height: this.sheets.rows.getSize(row),
    });

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
    this.sheets.merger.setAssociatedMergedCellIds(this.simpleCellAddress);

    const cellId = this.simpleCellAddress.toCellId();
    const mergedCellId =
      this.sheets.merger.associatedMergedCellAddressMap[cellId];

    if (!mergedCellId) return;

    const mergedCell =
      this.sheets.spreadsheet.data.spreadsheetData.mergedCells![mergedCellId];

    const rangeSimpleCellAddress =
      RangeSimpleCellAddress.mergedCellToAddress(mergedCell);

    this.rangeSimpleCellAddress = rangeSimpleCellAddress;

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
