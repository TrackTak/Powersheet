import { KonvaEventObject } from 'konva/lib/Node';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import events from '../../../events';
import Sheet from '../../Sheet';
import Spreadsheet from '../../../Spreadsheet';
import RowCols from '../RowCols';
import { merge } from 'lodash';

class Resizer {
  resizeMarker: Rect;
  resizeGuideLine: Line;
  spreadsheet: Spreadsheet;
  sheet: Sheet;
  currentIndex = 0;

  constructor(public rowCols: RowCols) {
    this.rowCols = rowCols;
    this.sheet = this.rowCols.sheet;
    this.spreadsheet = this.sheet.spreadsheet;

    const size =
      this.rowCols.sheet.getViewportVector()[
        this.rowCols.oppositeFunctions.axis
      ];
    this.resizeMarker = new Rect({
      ...this.spreadsheet.styles[this.rowCols.type].resizeMarker,
      [this.rowCols.oppositeFunctions.size]: size,
    });
    this.resizeGuideLine = new Line({
      ...this.spreadsheet.styles[this.rowCols.type].resizeGuideLine,
      [this.rowCols.oppositeFunctions.size]: size,
    });

    this.resizeMarker.on('mouseover', this.resizeMarkerOnMouseOver);
    this.resizeMarker.on('mouseout', this.resizeMarkerOnMouseOut);
    this.resizeMarker.on('dragmove', this.resizeLineDragMove);
    this.resizeMarker.on('dragend', this.resizeLineDragEnd);

    this.sheet.layer.add(this.resizeMarker, this.resizeGuideLine);
  }

  setCursor() {
    document.body.style.cursor = this.rowCols.isCol
      ? 'col-resize'
      : 'row-resize';
  }

  resetCursor() {
    document.body.style.cursor = 'default';
  }

  destroy() {
    this.resizeMarker.off('dragmove', this.resizeLineDragMove);
    this.resizeMarker.off('dragend', this.resizeLineDragEnd);
    this.resizeMarker.off('mouseover', this.resizeMarkerOnMouseOver);
    this.resizeMarker.off('mouseout', this.resizeMarkerOnMouseOut);
  }

  private getPosition() {
    return (
      this.rowCols.rowColMap
        .get(this.currentIndex!)!
        .headerGroup[this.rowCols.functions.axis]() +
      this.rowCols.scrollBar.scroll
    );
  }

  showResizeMarker(index: number) {
    this.currentIndex = index;

    const rowCol = this.rowCols.rowColMap.get(this.currentIndex!)!;

    const clientRect = rowCol.headerGroup.getClientRect({ skipStroke: true });

    this.resizeMarker[this.rowCols.functions.axis](
      this.getPosition() + clientRect[this.rowCols.functions.size]
    );

    this.resizeMarker.show();
    this.resizeMarker.moveToTop();
  }

  hideResizeMarker() {
    this.resizeMarker.hide();
  }

  showGuideLine() {
    this.resizeGuideLine[this.rowCols.functions.axis](
      this.resizeMarker[this.rowCols.functions.axis]()
    );
    this.resizeGuideLine.points(
      this.rowCols.isCol
        ? [0, this.sheet.getViewportVector().y, 0, this.sheet.stage.height()]
        : [this.sheet.getViewportVector().x, 0, this.sheet.stage.width(), 0]
    );

    this.resizeGuideLine.show();
    this.resizeGuideLine.moveToTop();
  }

  hideGuideLine() {
    this.resizeGuideLine.hide();
  }

  resizeMarkerOnMouseOver = () => {
    this.setCursor();

    this.showResizeMarker(this.currentIndex!);
  };

  resizeMarkerOnMouseOut = () => {
    this.resetCursor();

    this.hideResizeMarker();
  };

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const minAxis =
      this.getPosition() + this.spreadsheet.options[this.rowCols.type].minSize;
    let newAxis = position[this.rowCols.functions.axis];

    const getNewPosition = () => {
      const newPosition = {
        ...position,
        [this.rowCols.functions.axis]: newAxis,
      };

      return newPosition;
    };

    if (newAxis <= minAxis) {
      newAxis = minAxis;

      target.setPosition(getNewPosition());
    }

    this.showGuideLine();

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.rowCols.type].move,
      e,
      newAxis
    );
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const newSize =
      e.target.getPosition()[this.rowCols.functions.axis] - this.getPosition();

    this.hideResizeMarker();
    this.hideGuideLine();

    const newSheetData = merge({}, this.spreadsheet.data.getSheetData(), {
      [this.rowCols.type]: {
        sizes: {
          [this.currentIndex!]: newSize,
        },
      },
    });

    this.spreadsheet.data.setSheetData(newSheetData);
    this.spreadsheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      events.resize[this.rowCols.type].end,
      e,
      this.currentIndex,
      newSize
    );
  };
}

export default Resizer;
