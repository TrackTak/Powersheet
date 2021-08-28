import { Group } from 'konva/lib/Group';
import { Node } from 'konva/lib/Node';
import { KonvaEventObject } from 'konva/lib/Node';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';
import { HeaderGroupId, IRowColFunctions, RowColType } from './RowCol';

interface IShapes {
  resizeGuideLine: Line;
  resizeLine: Line;
  resizeMarker: Rect;
}

export interface IResizer {
  shapes: IShapes;
  destroy: () => void;
  setResizeGuideLinePoints: () => void;
  showResizeMarker: (target: Line) => void;
  showGuideLine: (target: Line) => void;
  hideResizeMarker: () => void;
  hideGuideLine: () => void;
  resize: (index: number, newSize: number) => void;
  resizeLineDragStart: (e: KonvaEventObject<DragEvent>) => void;
  resizeLineDragMove: (e: KonvaEventObject<DragEvent>) => void;
  resizeLineDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  resizeLineOnMousedown: (e: KonvaEventObject<Event>) => void;
  resizeLineOnMouseover: (e: KonvaEventObject<Event>) => void;
  resizeLineOnMouseup: () => void;
  resizeLineOnMouseout: () => void;
}

class Resizer implements IResizer {
  shapes!: IShapes;
  private resizeStartPos: Vector2d;
  private resizePosition: Vector2d;

  constructor(
    private canvas: Canvas,
    private type: RowColType,
    private isCol: boolean,
    private functions: IRowColFunctions,
    private headerGroupMap: Map<HeaderGroupId, Group>
  ) {
    this.canvas = canvas;
    this.type = type;
    this.isCol = isCol;
    this.functions = functions;
    this.headerGroupMap = headerGroupMap;

    this.resizeStartPos = {
      x: 0,
      y: 0,
    };

    this.resizePosition = {
      x: 0,
      y: 0,
    };

    this.shapes = {
      resizeMarker: new Rect({
        ...this.canvas.getViewportVector(),
      }),
      resizeGuideLine: new Line({
        ...this.canvas.styles.resizeGuideLine,
      }),
      resizeLine: new Line({
        ...this.canvas.styles.resizeLine,
      }),
    };

    if (this.isCol) {
      this.shapes.resizeMarker.setAttrs(this.canvas.styles.colResizeMarker);
      this.shapes.resizeLine.points([
        0,
        0,
        0,
        this.canvas.getViewportVector().y,
      ]);
    } else {
      this.shapes.resizeMarker.setAttrs(this.canvas.styles.rowResizeMarker);
      this.shapes.resizeLine.points([
        0,
        0,
        this.canvas.getViewportVector().x,
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

    this.canvas.layers.mainLayer.add(this.shapes.resizeMarker);
    this.canvas.layers.mainLayer.add(this.shapes.resizeLine);
    this.canvas.layers.mainLayer.add(this.shapes.resizeGuideLine);
  }

  destroy() {
    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  setResizeGuideLinePoints() {
    this.shapes.resizeGuideLine.points(
      this.isCol
        ? [0, this.canvas.getViewportVector().y, 0, this.canvas.stage.height()]
        : [this.canvas.getViewportVector().x, 0, this.canvas.stage.width(), 0]
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

    if (this.isCol) {
      x = target.parent!.x() + target.x();
      y = this.canvas.layers.mainLayer.y() * -1;
    } else {
      x = this.canvas.layers.mainLayer.x() * -1;
      y = target.parent!.y() + target.y();
    }

    this.shapes.resizeGuideLine.x(x);
    this.shapes.resizeGuideLine.y(y);
    this.shapes.resizeGuideLine.show();
  }

  hideGuideLine() {
    this.shapes.resizeGuideLine.hide();
  }

  resize(index: number, newSize: number) {
    const size =
      this.canvas.options[this.type].sizes[index] ??
      this.canvas.options[this.type].defaultSize;
    const sizeChange = newSize - size;

    if (sizeChange !== 0) {
      this.canvas.options[this.type].sizes[index] = newSize;

      this.canvas[this.type].draw(index);

      for (let i = index + 1; i < this.headerGroupMap.size; i++) {
        const item = this.headerGroupMap.get(i);

        if (item) {
          const newAxis = item[this.functions.axis]() + sizeChange;

          item[this.functions.axis](newAxis);
        }
      }
    }
  }

  resizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this.resizeStartPos = e.target.getPosition();

    this.shapes.resizeGuideLine.moveToTop();

    this.canvas.eventEmitter.emit(events.resize[this.type].start, e);
  };

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const minSize = this.canvas.options[this.type].minSize;
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

    this.canvas.eventEmitter.emit(events.resize[this.type].move, e, newAxis);
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const target = e.target as Line;
    const index = target.parent!.attrs.index;

    const position = this.resizePosition;
    const minSize = this.canvas.options[this.type].minSize;

    const axis = this.isCol ? position.x : position.y;

    this.hideGuideLine();
    this.hideResizeMarker();

    if (axis >= minSize) {
      this.resize(index, axis);
    }

    this.canvas.updateSheetDimensions();
    this.canvas.selector.removeSelectedCells();
    this.canvas[this.type].scrollBar.updateCustomSizePositions();

    for (
      let index = this.canvas[this.type].sheetViewportPosition.x;
      index < this.canvas[this.type].sheetViewportPosition.y;
      index++
    ) {
      this.canvas[this.type].draw(index);
    }

    this.canvas.merger.updateMergedCells();

    this.canvas.eventEmitter.emit(events.resize[this.type].end, e, index, axis);
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
