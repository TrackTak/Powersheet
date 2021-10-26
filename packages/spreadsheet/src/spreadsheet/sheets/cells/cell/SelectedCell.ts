import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import Sheets from '../../Sheets';
import Cell from './Cell';
import SimpleCellAddress from './SimpleCellAddress';

class SelectedCell extends Cell {
  innerRect: Rect;

  constructor(
    public sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress
  ) {
    super(sheets, simpleCellAddress);

    this.innerRect = new Rect({
      name: 'innerRect',
    });
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
