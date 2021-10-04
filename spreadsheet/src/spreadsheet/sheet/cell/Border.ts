import { Line } from 'konva/lib/shapes/Line';
import { BorderStyle } from '../Data';
import StyleableCell from './StyleableCell';

class Border {
  line: Line;

  constructor(
    public styleableCell: StyleableCell,
    public borderStyle: BorderStyle
  ) {
    this.styleableCell = styleableCell;
    this.borderStyle = borderStyle;

    this.line = new Line({
      stroke: 'black',
      strokeWidth: this.styleableCell.spreadsheet.styles.gridLine.strokeWidth,
    });

    this.styleableCell.group.add(this.line);

    this.line.moveToTop();
  }
}

export default Border;
