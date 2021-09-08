import { KonvaEventObject } from 'konva/lib/Node';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Sheet, { makeShapeCrisp } from './Sheet';
import { IRowColFunctions, RowColType } from './RowCol';
import Spreadsheet from '../../Spreadsheet';

interface IShapes {
  resizeGuideLine: Line;
  resizeLine: Line;
  resizeMarker: Rect;
}

class Resizer {
  shapes!: IShapes;
  private resizeStartPos: Vector2d;
  private resizePosition: Vector2d;
  private spreadsheet: Spreadsheet;

  constructor(
    private sheet: Sheet,
    private type: RowColType,
    private isCol: boolean,
    private functions: IRowColFunctions
  ) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.sheetsGroup.spreadsheet;
    this.type = type;
    this.isCol = isCol;
    this.functions = functions;

    this.resizeStartPos = {
      x: 0,
      y: 0,
    };

    this.resizePosition = {
      x: 0,
      y: 0,
    };

    this.shapes = {
      resizeMarker: new Rect(),
      resizeGuideLine: new Line({
        ...this.spreadsheet.styles.resizeGuideLine,
      }),
      resizeLine: new Line({
        ...this.spreadsheet.styles.resizeLine,
      }),
    };

    if (this.isCol) {
      this.shapes.resizeMarker.setAttrs(
        this.spreadsheet.styles.colResizeMarker
      );
      this.shapes.resizeLine.points([
        0,
        0,
        0,
        this.sheet.getViewportVector().y,
      ]);
    } else {
      this.shapes.resizeMarker.setAttrs(
        this.spreadsheet.styles.rowResizeMarker
      );
      this.shapes.resizeLine.points([
        0,
        0,
        this.sheet.getViewportVector().x,
        0,
      ]);
    }

    this.shapes.resizeLine.on('dragstart', this.resizeLineDragStart);
    this.shapes.resizeLine.on('dragmove', this.resizeLineDragMove);
    this.shapes.resizeLine.on('dragend', this.resizeLineDragEnd);
    this.shapes.resizeLine.on('mousedown', this.resizeLineOnMousedown);
    this.shapes.resizeLine.on('mouseover', this.resizeLineOnMouseover);
    this.shapes.resizeLine.on('mouseout', this.resizeLineOnMouseout);
    this.shapes.resizeLine.on('mouseup', this.resizeLineOnMouseup);

    this.shapes.resizeLine.cache();

    this.sheet.layer.add(this.shapes.resizeMarker);
    this.sheet.layer.add(this.shapes.resizeGuideLine);
  }

  setResizeGuideLinePoints() {
    this.shapes.resizeGuideLine.points(
      this.isCol
        ? [0, this.sheet.getViewportVector().y, 0, this.sheet.stage.height()]
        : [this.sheet.getViewportVector().x, 0, this.sheet.stage.width(), 0]
    );
  }

  showResizeMarker(target: Line) {
    document.body.style.cursor = this.isCol ? 'col-resize' : 'row-resize';

    const axisAmount =
      target.parent![this.functions.axis]() +
      target[this.functions.axis]() -
      this.shapes.resizeMarker[this.functions.size]();

    this.shapes.resizeMarker[this.functions.axis](axisAmount);
    this.shapes.resizeMarker.show();
  }

  hideResizeMarker() {
    this.shapes.resizeMarker.hide();
  }

  showGuideLine(target: Line) {
    let x = 0;
    let y = 0;

    const clientRect = target.getClientRect();

    if (this.isCol) {
      x = clientRect.x;
      y = this.sheet.layer.y() * -1;
    } else {
      x = this.sheet.layer.x() * -1;
      y = clientRect.y;
    }

    this.shapes.resizeGuideLine.x(x);
    this.shapes.resizeGuideLine.y(y);

    makeShapeCrisp(this.shapes.resizeGuideLine);

    this.shapes.resizeGuideLine.show();
  }

  hideGuideLine() {
    this.shapes.resizeGuideLine.hide();
  }

  resize(index: number, newSize: number) {
    const size =
      this.sheet.data?.[this.type]?.sizes[index] ??
      this.spreadsheet.options[this.type].defaultSize;
    const sizeChange = newSize - size;

    if (sizeChange !== 0) {
      this.sheet.data[this.type] = {
        ...this.sheet.data[this.type],
        sizes: {
          ...this.sheet.data[this.type]?.sizes,
          [index]: newSize,
        },
      };
    }
  }

  resizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this.resizeStartPos = e.target.getPosition();

    this.shapes.resizeGuideLine.moveToTop();

    this.sheet.emit(events.resize[this.type].start, e);
  };

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const minSize = this.spreadsheet.options[this.type].minSize;
    let newAxis = this.isCol ? position.x : position.y;

    const getNewPosition = () => {
      const newPosition = {
        ...position,
      };
      if (this.isCol) {
        newPosition.x = newAxis;
      } else {
        newPosition.y = newAxis;
      }
      return newPosition;
    };

    if (newAxis <= minSize) {
      newAxis = minSize;

      target.setPosition(getNewPosition());
    }

    this.resizePosition = getNewPosition();

    this.showResizeMarker(target);
    this.showGuideLine(target);

    // Stops moving this element completely
    target.setPosition(this.resizeStartPos);

    this.sheet.emit(events.resize[this.type].move, e, newAxis);
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const target = e.target as Line;
    const index = target.parent!.attrs.index;

    const position = this.resizePosition;
    const minSize = this.spreadsheet.options[this.type].minSize;

    const axis = this.isCol ? position.x : position.y;

    this.hideGuideLine();
    this.hideResizeMarker();

    if (axis >= minSize) {
      this.resize(index, axis);
    }

    this.sheet.updateViewport();

    this.sheet.emit(events.resize[this.type].end, e, index, axis);
  };

  resizeLineOnMousedown = (e: KonvaEventObject<Event>) => {
    const target = e.target as Line;

    this.showGuideLine(target);
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
