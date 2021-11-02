import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import Sheets from '../../Sheets';
import Cell from './Cell';
import { getInnerRectConfig } from './getInnerRectConfig';
import SimpleCellAddress from './SimpleCellAddress';

class HighlightedCell extends Cell {
  innerRect: Rect;

  constructor(
    public sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public color: string
  ) {
    super(sheets, simpleCellAddress);

    this.color = color;
    this.innerRect = new Rect({
      name: 'innerRect',
    });
    this.group.add(this.innerRect);

    this.setInnerRectProperties();
  }

  private setInnerRectProperties() {
    const size = this.rect.size();
    const stroke = this.color;

    const rectConfig: RectConfig = {
      ...this.sheets.spreadsheet.styles.highlightedCell.rect,
      fill: this.color,
    };

    const innerRectConfig = getInnerRectConfig(
      {
        ...this.sheets.spreadsheet.styles.highlightedCell.innerRect,
        stroke,
      },
      size
    );

    this.rect.setAttrs(rectConfig);
    this.innerRect.setAttrs(innerRectConfig);
  }
}

export default HighlightedCell;
