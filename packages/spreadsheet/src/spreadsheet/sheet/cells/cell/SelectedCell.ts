import { Rect, RectConfig } from '@tracktak/konva/lib/shapes/Rect';
import Sheet from '../../Sheet';
import Cell from './Cell';
import SimpleCellAddress from './SimpleCellAddress';

class SelectedCell extends Cell {
  innerRect: Rect;

  constructor(
    public sheet: Sheet,
    public simpleCellAddress: SimpleCellAddress
  ) {
    super(sheet, simpleCellAddress);

    this.innerRect = new Rect();
    this.group.add(this.innerRect);

    this.setInnerRectProperties();
  }

  private setInnerRectProperties() {
    const { strokeWidth, stroke } = this.spreadsheet.styles.selectionFirstCell;
    const rect = this.getClientRectWithoutStroke();

    const rectConfig: RectConfig = {
      ...this.spreadsheet.styles.selectionFirstCell,
      stroke: undefined,
    };

    // We must have another Rect for the inside borders
    // as konva does not allow stroke positioning
    const innerRectConfig: RectConfig = {
      x: strokeWidth! / 2,
      y: strokeWidth! / 2,
      width: rect.width - strokeWidth!,
      height: rect.height - strokeWidth!,
      stroke,
      strokeWidth,
    };

    this.rect.setAttrs(rectConfig);
    this.innerRect.setAttrs(innerRectConfig);
  }
}

export default SelectedCell;
