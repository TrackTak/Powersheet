import { KonvaEventObject } from 'konva/lib/Node';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { IRect } from 'konva/lib/types';
import events from '../events';
import Sheet from './Sheet';
import { IRowColFunctions, RowColType } from './RowCol';
import Spreadsheet from '../Spreadsheet';

interface IShapes {
  resizeGuideLine: Line;
  resizeLine: Line;
  resizeMarker: Rect;
}

class Resizer {
  shapes!: IShapes;
  currentIndex?: number | null;
  private spreadsheet: Spreadsheet;

  constructor(
    private sheet: Sheet,
    private type: RowColType,
    private isCol: boolean,
    private functions: IRowColFunctions
  ) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.type = type;
    this.isCol = isCol;
    this.functions = functions;

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
      this.shapes.resizeMarker.height(this.sheet.getViewportVector().y);
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
      this.shapes.resizeMarker.width(this.sheet.getViewportVector().x);

      this.shapes.resizeLine.points([
        0,
        0,
        this.sheet.getViewportVector().x,
        0,
      ]);
    }

    this.shapes.resizeMarker.on('dragmove', this.resizeLineDragMove);
    this.shapes.resizeMarker.on('dragend', this.resizeLineDragEnd);
    this.shapes.resizeMarker.on('mouseout', this.resizeLineOnMouseout);
    this.shapes.resizeLine.on('mouseover', this.resizeLineOnMouseover);
    this.shapes.resizeLine.on('mouseup', this.resizeLineOnMouseup);

    this.shapes.resizeLine.cache();

    this.sheet.layer.add(this.shapes.resizeMarker);
    this.sheet.layer.add(this.shapes.resizeGuideLine);
  }

  destroy() {
    this.shapes.resizeMarker.off('dragmove', this.resizeLineDragMove);
    this.shapes.resizeMarker.off('dragend', this.resizeLineDragEnd);
    this.shapes.resizeMarker.off('mouseout', this.resizeLineOnMouseout);
    this.shapes.resizeLine.off('mouseover', this.resizeLineOnMouseover);
    this.shapes.resizeLine.off('mouseup', this.resizeLineOnMouseup);
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
    this.shapes.resizeMarker.moveToTop();
  }

  hideResizeMarker() {
    this.shapes.resizeMarker.hide();
  }

  showGuideLine(clientRect: IRect) {
    let x = 0;
    let y = 0;

    if (this.isCol) {
      x = clientRect.x;
      y = this.sheet.layer.y() * -1;
    } else {
      x = this.sheet.layer.x() * -1;
      y = clientRect.y;
    }

    this.shapes.resizeMarker.x(x);
    this.shapes.resizeMarker.y(y);

    this.shapes.resizeGuideLine.x(x);
    this.shapes.resizeGuideLine.y(y);
    this.shapes.resizeGuideLine.show();
    this.shapes.resizeGuideLine.moveToTop();
  }

  hideGuideLine() {
    this.shapes.resizeGuideLine.hide();
  }

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const currentRowCol = this.sheet[this.type].headerGroupMap.get(
      this.currentIndex!
    )!;
    const minAxis =
      currentRowCol[this.functions.axis]() +
      this.spreadsheet.options[this.type].minSize;
    let newAxis = position[this.functions.axis];

    const getNewPosition = () => {
      const newPosition = {
        ...position,
        [this.functions.axis]: newAxis,
      };

      return newPosition;
    };

    if (newAxis <= minAxis) {
      newAxis = minAxis;

      target.setPosition(getNewPosition());
    }

    this.showGuideLine(target.getClientRect());

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.type].move,
      e,
      newAxis
    );
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const currentRowCol = this.sheet[this.type].headerGroupMap.get(
      this.currentIndex!
    )!;

    const newSize =
      e.target.getPosition()[this.functions.axis] -
      currentRowCol[this.functions.axis]();

    this.hideGuideLine();

    this.spreadsheet.data.setSheetData({
      ...this.spreadsheet.data.getSheetData(),
      [this.type]: {
        sizes: {
          [this.currentIndex!]: newSize,
        },
      },
    });
    this.sheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.type].end,
      e,
      this.currentIndex,
      newSize
    );
  };

  resizeLineOnMouseup = () => {
    this.hideGuideLine();
  };

  resizeLineOnMouseover = (e: KonvaEventObject<Event>) => {
    const target = e.target as Line;

    this.currentIndex = e.target.parent!.attrs.index;

    this.showResizeMarker(target);
  };

  resizeLineOnMouseout = () => {
    this.currentIndex = null;

    document.body.style.cursor = 'default';

    this.hideResizeMarker();
  };
}

export default Resizer;
