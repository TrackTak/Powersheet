import EventEmitter from 'eventemitter3';
import { Group } from 'konva/lib/Group';
import { Node } from 'konva/lib/Node';
import { KonvaEventObject } from 'konva/lib/Node';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import { ISizes } from '../../options';
import { IDimensions, ILayers } from './Canvas';
import { ICanvasStyles } from './canvasStyles';

interface IShapes {
  resizeGuideLine: Line;
  resizeLine: Line;
  resizeMarker: Rect;
}

interface IFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

interface ISizeOptions {
  minSize: number;
  defaultSize: number;
  sizes: ISizes;
}

class Resizer {
  public shapes!: IShapes;
  private resizeStartPos: Vector2d;
  private resizePosition: Vector2d;
  private functions: IFunctions;

  constructor(
    private type: 'row' | 'col',
    private layers: ILayers,
    private headerDimensions: IDimensions,
    private styles: ICanvasStyles,
    private resizeGuideLineConfig: RectConfig,
    private resizeLineConfig: LineConfig,
    private sizeOptions: ISizeOptions,
    private groups: Group[],
    private draw: (index: number) => void,
    private eventEmitter: EventEmitter
  ) {
    this.layers = layers;
    this.type = type;
    this.functions =
      this.type === 'row'
        ? {
            axis: 'y',
            size: 'height',
          }
        : {
            axis: 'x',
            size: 'width',
          };
    this.headerDimensions = headerDimensions;
    this.styles = styles;
    this.resizeGuideLineConfig = resizeGuideLineConfig;
    this.resizeLineConfig = resizeLineConfig;
    this.sizeOptions = sizeOptions;
    this.groups = groups;
    this.draw = draw;
    this.eventEmitter = eventEmitter;

    this.resizeStartPos = {
      x: 0,
      y: 0,
    };

    this.resizePosition = {
      x: 0,
      y: 0,
    };

    this.create();
  }

  private create() {
    this.shapes = {
      resizeMarker: new Rect({
        ...this.headerDimensions,
        ...(this.type === 'row'
          ? this.styles.rowResizeMarker
          : this.styles.colResizeMarker),
      }),
      resizeGuideLine: new Line({
        ...this.resizeGuideLineConfig,
        ...this.styles.resizeGuideLine,
      }),
      resizeLine: new Line({
        ...this.resizeLineConfig,
        ...this.styles.resizeLine,
      }),
    };

    this.shapes.resizeLine.on('dragstart', this.resizeLineDragStart);
    this.shapes.resizeLine.on('dragmove', this.resizeLineDragMove);
    this.shapes.resizeLine.on('dragend', this.resizeLineDragEnd);
    this.shapes.resizeLine.on('mousedown', this.resizeLineOnMousedown);
    this.shapes.resizeLine.on('mouseover', this.resizeLineOnMouseover);
    this.shapes.resizeLine.on('mouseout', this.resizeLineOnMouseout);
    this.shapes.resizeLine.on('mouseup', this.resizeLineOnMouseup);

    this.shapes.resizeLine.cache();

    this.layers.mainLayer.add(this.shapes.resizeMarker);
    this.layers.mainLayer.add(this.shapes.resizeLine);
    this.layers.mainLayer.add(this.shapes.resizeGuideLine);
  }

  destroy() {
    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  showResizeMarker(target: Line) {
    document.body.style.cursor =
      this.type === 'row' ? 'row-resize' : 'col-resize';

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
    const axisAmount =
      target.parent![this.functions.axis]() + target[this.functions.axis]();
    this.shapes.resizeGuideLine[this.functions.axis](axisAmount);
    this.shapes.resizeGuideLine.show();
  }

  hideGuideLine() {
    this.shapes.resizeGuideLine.hide();
  }

  resize(index: number, newSize: number) {
    const size = this.sizeOptions.sizes[index] ?? this.sizeOptions.defaultSize;
    const sizeChange = newSize - size;

    if (sizeChange !== 0) {
      this.sizeOptions.sizes[index] = newSize;

      this.draw(index);

      for (let i = index + 1; i < this.groups.length; i++) {
        const item = this.groups[i];

        if (item) {
          const newAxis = item[this.functions.axis]() + sizeChange;

          item[this.functions.axis](newAxis);
        }
      }
    }
  }

  resizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this.resizeStartPos = e.target.getPosition();

    this.eventEmitter.emit(events.resize[this.type].start, e);
  };

  resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const position = target.getPosition();
    const minSize = this.sizeOptions.minSize;
    let newAxis = this.type === 'row' ? position.y : position.x;

    const getNewPosition = () => {
      const newPosition = {
        ...position,
      };
      if (this.type === 'row') {
        newPosition.y = newAxis;
      } else {
        newPosition.x = newAxis;
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

    this.eventEmitter.emit(events.resize[this.type].move, e, newAxis);
  };

  resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const target = e.target as Line;
    const index = target.parent!.attrs.index;

    const position = this.resizePosition;
    const minSize = this.sizeOptions.minSize;

    const axis = this.type === 'row' ? position.y : position.x;

    this.hideGuideLine();
    this.hideResizeMarker();

    if (axis >= minSize) {
      this.resize(index, axis);
    }

    this.eventEmitter.emit(events.resize[this.type].end, e, index, axis);
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
