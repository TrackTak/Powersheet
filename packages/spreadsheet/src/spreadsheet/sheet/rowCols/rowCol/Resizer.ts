import { KonvaEventObject } from '@tracktak/konva/lib/Node';
import { Line } from '@tracktak/konva/lib/shapes/Line';
import { Rect } from '@tracktak/konva/lib/shapes/Rect';
import Sheet from '../../Sheet';
import Spreadsheet from '../../../Spreadsheet';
import RowCols from '../RowCols';
import SheetRowColAddress from '../../cells/cell/RowColAddress';

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
    this.resizeMarker.on('dragstart', this.resizeLineDragStart);
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
    this.resizeMarker.off('mouseover', this.resizeMarkerOnMouseOver);
    this.resizeMarker.off('mouseout', this.resizeMarkerOnMouseOut);
    this.resizeMarker.off('dragstart', this.resizeLineDragStart);
    this.resizeMarker.off('dragmove', this.resizeLineDragMove);
    this.resizeMarker.off('dragend', this.resizeLineDragEnd);
  }

  private getPosition() {
    return (
      this.rowCols.getAxis(this.currentIndex) + this.rowCols.scrollBar.scroll
    );
  }

  showResizeMarker(index: number) {
    this.currentIndex = index;

    this.resizeMarker[this.rowCols.functions.axis](
      this.getPosition() + this.rowCols.getSize(this.currentIndex)
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

  resizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this.spreadsheet.pushToHistory();

    this.spreadsheet.eventEmitter.emit(
      this.rowCols.isCol ? 'resizeColStart' : 'resizeRowStart',
      e
    );
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
      this.rowCols.isCol ? 'resizeColMove' : 'resizeRowMove',
      e,
      newAxis
    );
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const newSize =
      e.target.getPosition()[this.rowCols.functions.axis] - this.getPosition();

    this.hideResizeMarker();
    this.hideGuideLine();

    this.spreadsheet.data.setRowCol(
      this.rowCols.pluralType,
      new SheetRowColAddress(this.sheet.sheetId, this.currentIndex),
      {
        size: newSize,
      }
    );

    this.spreadsheet.persistData();
    this.spreadsheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      this.rowCols.isCol ? 'resizeColEnd' : 'resizeRowEnd',
      e,
      newSize
    );
  };
}

export default Resizer;
