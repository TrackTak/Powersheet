import { KonvaEventObject } from 'konva/lib/Node';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { IRect } from 'konva/lib/types';
import events from '../../../events';
import Sheet from '../../Sheet';
import Spreadsheet from '../../../Spreadsheet';
import RowCol from './RowCol';

class Resizer {
  resizeMarker: Rect;
  resizeGuideLine: Line;
  resizeLine: Line;
  spreadsheet: Spreadsheet;
  sheet: Sheet;
  index: number;

  constructor(public rowCol: RowCol) {
    this.rowCol = rowCol;
    this.sheet = this.rowCol.sheet;
    this.index = this.rowCol.index;
    this.spreadsheet = this.sheet.spreadsheet;

    this.resizeMarker = new Rect({
      ...this.spreadsheet.styles[this.rowCol.type].resizeMarker,
      [this.rowCol.functions.size]:
        this.rowCol.sheet.getViewportVector()[this.rowCol.functions.axis],
    });
    this.resizeGuideLine = new Line({
      ...this.spreadsheet.styles[this.rowCol.type].resizeGuideLine,
      points: this.rowCol.isCol
        ? [0, this.sheet.getViewportVector().y, 0, this.sheet.stage.height()]
        : [this.sheet.getViewportVector().x, 0, this.sheet.stage.width(), 0],
    });
    this.resizeLine = new Line({
      ...this.spreadsheet.styles[this.rowCol.type].resizeLine,
      axis: this.rowCol.rowCols.getSize(this.index),
      points: this.rowCol.isCol
        ? [0, 0, 0, this.sheet.getViewportVector().y]
        : [0, 0, this.sheet.getViewportVector().x, 0],
    });

    this.resizeMarker.on('dragmove', this.resizeLineDragMove);
    this.resizeMarker.on('dragend', this.resizeLineDragEnd);
    this.resizeMarker.on('mouseout', this.resizeLineOnMouseout);
    this.resizeLine.on('mouseover', this.resizeLineOnMouseover);
    this.resizeLine.on('mouseup', this.resizeLineOnMouseup);

    this.sheet.layer.add(this.resizeMarker);
    this.sheet.layer.add(this.resizeGuideLine);
  }

  destroy() {
    this.resizeMarker.off('dragmove', this.resizeLineDragMove);
    this.resizeMarker.off('dragend', this.resizeLineDragEnd);
    this.resizeMarker.off('mouseout', this.resizeLineOnMouseout);
    this.resizeLine.off('mouseover', this.resizeLineOnMouseover);
    this.resizeLine.off('mouseup', this.resizeLineOnMouseup);
  }

  showResizeMarker(target: Line) {
    document.body.style.cursor = this.rowCol.isCol
      ? 'col-resize'
      : 'row-resize';

    const axisAmount =
      target.parent![this.rowCol.functions.axis]() +
      target[this.rowCol.functions.axis]() -
      this.resizeMarker[this.rowCol.functions.size]();

    this.resizeMarker[this.rowCol.functions.axis](axisAmount);

    this.resizeMarker.show();
    this.resizeMarker.moveToTop();
  }

  hideResizeMarker() {
    this.resizeMarker.hide();
  }

  showGuideLine(clientRect: IRect) {
    let x = 0;
    let y = 0;

    if (this.rowCol.isCol) {
      x = clientRect.x;
      y = this.sheet.layer.y() * -1;
    } else {
      x = this.sheet.layer.x() * -1;
      y = clientRect.y;
    }

    this.resizeMarker.x(x);
    this.resizeMarker.y(y);

    this.resizeGuideLine.x(x);
    this.resizeGuideLine.y(y);
    this.resizeGuideLine.show();
    this.resizeGuideLine.moveToTop();
  }

  hideGuideLine() {
    this.resizeGuideLine.hide();
  }

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const minAxis =
      this.rowCol.headerGroup[this.rowCol.functions.axis]() +
      this.spreadsheet.options[this.rowCol.type].minSize;
    let newAxis = position[this.rowCol.functions.axis];

    const getNewPosition = () => {
      const newPosition = {
        ...position,
        [this.rowCol.functions.axis]: newAxis,
      };

      return newPosition;
    };

    if (newAxis <= minAxis) {
      newAxis = minAxis;

      target.setPosition(getNewPosition());
    }

    this.showGuideLine(target.getClientRect());

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.rowCol.type].move,
      e,
      newAxis
    );
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const newSize =
      e.target.getPosition()[this.rowCol.functions.axis] -
      this.rowCol.headerGroup[this.rowCol.functions.axis]();

    this.hideGuideLine();

    this.spreadsheet.data.setSheetData({
      ...this.spreadsheet.data.getSheetData(),
      [this.rowCol.type]: {
        sizes: {
          [this.index!]: newSize,
        },
      },
    });
    this.sheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.rowCol.type].end,
      e,
      this.index,
      newSize
    );
  };

  resizeLineOnMouseup = () => {
    this.hideGuideLine();
  };

  resizeLineOnMouseover = (e: KonvaEventObject<Event>) => {
    const target = e.target as Line;

    this.showResizeMarker(target);
  };

  resizeLineOnMouseout = () => {
    document.body.style.cursor = 'default';

    this.hideResizeMarker();
  };
}

export default Resizer;
