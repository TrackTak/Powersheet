import { Group } from 'konva/lib/Group';
import { Node } from 'konva/lib/Node';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import { isNil } from 'lodash';
import events from '../../events';
import { ISizes } from '../../options';
import Canvas, {
  centerRectTwoInRectOne,
  hasOverlap,
  ICustomSizes,
  ISheetViewportPosition,
  iteratePreviousDownToCurrent,
  iteratePreviousUpToCurrent,
} from './Canvas';
import Resizer, { IResizer } from './Resizer';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import { IScrollBar } from './scrollBars/IScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';

interface IShapes {
  group: Group;
  headerGroup: Group;
  headerRect: Rect;
  headerText: Text;
  gridLine: Line;
}

export type RowColType = 'row' | 'col';

export interface ISizeOptions {
  minSize: number;
  defaultSize: number;
  sizes: ISizes;
}

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

class RowCol {
  resizer: IResizer;
  scrollBar: IScrollBar;
  headerGroups: Group[];
  groups: Shape[];
  totalSize: number;
  shapes!: IShapes;
  private sheetViewportPosition: ISheetViewportPosition;
  private previousSheetViewportPosition: ISheetViewportPosition;
  private getAvailableSize: () => number;
  private getHeaderText: (index: number) => string;
  private getLineConfig: (sheetSize: number) => LineConfig;
  private getLinePoints: (
    axis0: number,
    axis1: number
  ) => [number, number, number, number];
  private oppositeType: RowColType;
  private sizeOptions: ISizeOptions;
  private functions: IRowColFunctions;
  private oppositeFunctions: IRowColFunctions;
  private isCol: boolean;

  constructor(private type: RowColType, private canvas: Canvas) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.canvas = canvas;
    this.headerGroups = [];
    this.groups = [];
    this.sheetViewportPosition = {
      x: 0,
      y: 0,
    };
    this.previousSheetViewportPosition = {
      x: 0,
      y: 0,
    };
    this.totalSize = 0;
    this.shapes = {
      headerRect: new Rect(),
      headerGroup: new Group(),
      headerText: new Text(),
      group: new Group(),
      gridLine: new Line({
        ...this.canvas.styles.gridLine,
      }),
    };
    if (this.isCol) {
      this.oppositeType = 'row';
      this.functions = {
        axis: 'x',
        size: 'width',
      };
      this.oppositeFunctions = {
        axis: 'y',
        size: 'height',
      };
      this.sizeOptions = {
        minSize: this.canvas.options.col.minWidth,
        defaultSize: this.canvas.options.col.defaultWidth,
        sizes: this.canvas.options.col.widths,
      };
      this.scrollBar = new HorizontalScrollBar(
        this.canvas,
        this.sheetViewportPosition,
        this.headerGroups
      );
      this.shapes.headerText.setAttrs(this.canvas.styles.colHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.canvas.styles.colHeader.rect,
        width: this.canvas.options.col.defaultWidth,
      });
      this.getHeaderText = (index) => {
        const startCharCode = 'A'.charCodeAt(0);
        const letter = String.fromCharCode(startCharCode + index);
        return letter;
      };
      this.getLinePoints = (y0, y1) => {
        return [0, y0, 0, y1];
      };
      this.getLineConfig = (sheetHeight: number) => {
        const lineConfig: LineConfig = {
          points: [0, 0, 0, sheetHeight],
        };
        return lineConfig;
      };
      this.getAvailableSize = () =>
        window.innerWidth -
        this.canvas.getViewportVector().x -
        this.canvas.row.scrollBar.getBoundingClientRect().width;
    } else {
      this.oppositeType = 'col';
      this.functions = {
        axis: 'y',
        size: 'height',
      };
      this.oppositeFunctions = {
        axis: 'x',
        size: 'width',
      };
      this.sizeOptions = {
        minSize: this.canvas.options.row.minHeight,
        defaultSize: this.canvas.options.row.defaultHeight,
        sizes: this.canvas.options.row.heights,
      };
      this.scrollBar = new VerticalScrollBar(
        this.canvas,
        this.sheetViewportPosition,
        this.headerGroups
      );

      this.shapes.headerText.setAttrs(this.canvas.styles.rowHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.canvas.styles.rowHeader.rect,
        height: this.canvas.options.row.defaultHeight,
      });
      this.getHeaderText = (index) => {
        return (index + 1).toString();
      };
      this.getLinePoints = (x0, x1) => {
        return [x0, 0, x1, 0];
      };
      this.getLineConfig = (sheetWidth: number) => {
        const lineConfig: LineConfig = {
          points: [0, 0, sheetWidth, 0],
        };
        return lineConfig;
      };
      this.getAvailableSize = () =>
        window.innerHeight -
        this.canvas.getViewportVector().y -
        this.canvas.col.scrollBar.getBoundingClientRect().height;
    }

    this.resizer = new Resizer(
      canvas,
      this.type,
      this.functions,
      this.sizeOptions,
      this.headerGroups
    );
    this.shapes.headerGroup.cache({
      ...this.canvas.getViewportVector(),
      ...this.canvas.sheetViewportDimensions,
    });
    this.shapes.group.cache({
      ...this.canvas.getViewportVector(),
      ...this.canvas.sheetViewportDimensions,
    });
    this.shapes.headerRect.cache();
    this.shapes.gridLine.cache();
    this.canvas.eventEmitter.on(
      events.resize[this.type].start,
      this.onResizeStart
    );
    this.canvas.eventEmitter.on(events.resize[this.type].end, this.onResizeEnd);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number,
    defaultSize: number,
    sizes?: ISizes,
    customSizeChanges?: ICustomSizes[]
  ) => {
    let sumOfSizes = 0;
    let i = sheetViewportStartYIndex;

    const getSize = () => {
      // TODO: Remove when we have snapping to row/col for scroll
      let offset = 0;

      if (customSizeChanges?.[i]?.size) {
        offset = customSizeChanges[i].size;
      }

      return (sizes?.[i] ?? defaultSize) - offset;
    };

    while (sumOfSizes + getSize() < sheetViewportDimensionSize) {
      sumOfSizes += getSize();
      i += 1;
    }

    return i;
  };

  onLoad = () => {
    const yIndex = this.calculateSheetViewportEndPosition(
      this.getAvailableSize(),
      0,
      this.sizeOptions.defaultSize,
      this.sizeOptions.sizes
    );

    let sumOfSizes = 0;

    for (let index = 0; index < yIndex; index++) {
      sumOfSizes += this.getSize(index);
    }

    this.totalSize = sumOfSizes;

    this.sheetViewportPosition.y = yIndex;
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.canvas.eventEmitter.off(
      events.resize[this.type].start,
      this.onResizeStart
    );
    this.canvas.eventEmitter.off(
      events.resize[this.type].end,
      this.onResizeEnd
    );
    this.scrollBar.destroy();
    this.resizer.destroy();
  }

  onResizeStart = () => {
    this.resizer.shapes.resizeGuideLine.moveToTop();
  };

  onResizeEnd = () => {
    for (
      let index = this.sheetViewportPosition.x;
      index < this.sheetViewportPosition.y;
      index++
    ) {
      this.drawGridLines(index);
    }
  };

  *updateViewport() {
    const generator = {
      x: iteratePreviousDownToCurrent(
        this.previousSheetViewportPosition.x,
        this.sheetViewportPosition.x
      ),
      y: iteratePreviousUpToCurrent(
        this.previousSheetViewportPosition.y,
        this.sheetViewportPosition.y
      ),
    };

    let index = -Infinity;

    do {
      const generatorX = generator.x.next();
      const generatorY = generator.y.next();

      index = Math.max(
        generatorX.value ?? -Infinity,
        generatorY.value ?? -Infinity
      );

      if (isFinite(index)) {
        const params: [number, boolean?] = !generatorX.done
          ? [index - 1, true]
          : [index];

        this.drawHeader(...params);
      }

      yield index;

      if (isFinite(index)) {
        this.drawGridLines(index);

        // const mergedCellIndexes =
        //   this.canvas.merger.mergedCellsMap[this.type][index];

        // if (!isNil(mergedCellIndexes)) {
        //   mergedCellIndexes.forEach((index) => {
        //     if (!this.groups[index]) {
        //       this.drawGridLines(index);
        //     }
        //   });
        // }

        // const mergedCells = this.canvas.merger.getMergedCellsMapInViewport(
        //   this.type,
        //   this.oppositeType,
        //   index
        // );

        // mergedCells.forEach((index) => {
        //   this.canvas[this.oppositeType].drawGridLines(index);
        // });
      }
    } while (isFinite(index));

    this.destroyOutOfViewportItems();

    this.previousSheetViewportPosition.x = this.sheetViewportPosition.x;
    this.previousSheetViewportPosition.y = this.sheetViewportPosition.y;
  }

  isNodeOutsideCanvas = (node: Node) => {
    const isOverlapping = hasOverlap(node.getClientRect(), {
      ...this.canvas.getViewportVector(),
      ...this.canvas.sheetViewportDimensions,
    });

    return !isOverlapping;
  };

  destroyOutOfViewportItems() {
    this.headerGroups.forEach((headerGroup, index) => {
      if (this.isNodeOutsideCanvas(headerGroup)) {
        headerGroup.destroy();

        delete this.headerGroups[index];
      }
    });

    this.groups.forEach((group, index) => {
      const mergedCellIndex =
        this.canvas.merger.mergedCellIndexesMap[this.type][index];

      const destroyGroup = () => {
        group.destroy();
        delete this.groups[index];
      };

      if (mergedCellIndex) {
        const mergedCell = this.canvas.merger.mergedCellsMap[mergedCellIndex];

        if (this.isNodeOutsideCanvas(mergedCell)) {
          mergedCell.destroy();
        }
      }
      if (this.isNodeOutsideCanvas(group)) {
        destroyGroup();
      }
    });
  }

  getSize(index: number) {
    const size = this.sizeOptions.sizes[index] ?? this.sizeOptions.defaultSize;

    return size;
  }

  getIndexesBetweenVectors(position: Vector2d) {
    const customSizes: ICustomSizes[] = [];

    customSizes[this.scrollBar.scrollOffset.index] = {
      size: this.scrollBar.scrollOffset.size,
    };

    const params: [number, number, ISizes, ICustomSizes[]] = [
      this.sheetViewportPosition.x,
      this.sizeOptions.defaultSize,
      this.sizeOptions.sizes,
      customSizes,
    ];

    const indexes = {
      x: this.calculateSheetViewportEndPosition(position.x, ...params),
      y: this.calculateSheetViewportEndPosition(position.y, ...params),
    };

    return indexes;
  }

  getItemsBetweenIndexes(indexes: Vector2d) {
    let groups: Shape[] = [];

    for (let index = indexes.x; index <= indexes.y; index++) {
      groups.push(this.groups[index]);
    }

    const comparer = (a: Shape, b: Shape) => a.attrs.index - b.attrs.index;

    return groups.sort(comparer);
  }

  getIsFrozen(index: number) {
    return isNil(this.canvas.options.frozenCells[this.type])
      ? false
      : index <= this.canvas.options.frozenCells[this.type]!;
  }

  getIsLastFrozen(index: number) {
    return index === this.canvas.options.frozenCells[this.type];
  }

  drawHeader(index: number, drawingAtX = false) {
    const prevIndex = drawingAtX ? index + 1 : index - 1;

    if (this.headerGroups[index]) {
      this.headerGroups[index].destroy();
    }

    const size = this.getSize(index);
    const prevHeader = this.headerGroups[prevIndex];

    const axis = prevHeader
      ? drawingAtX
        ? this.headerGroups[prevIndex][this.functions.axis]() - size
        : prevHeader[this.functions.axis]() + prevHeader[this.functions.size]()
      : this.canvas.getViewportVector()[this.functions.axis];

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: size,
      [this.functions.axis]: axis,
    };
    const headerGroup = this.shapes.headerGroup.clone(groupConfig) as Group;
    const header = this.getHeader(index);
    const resizeLine = this.getResizeLine(index);
    const isFrozen = this.getIsFrozen(index);

    headerGroup.add(header.rect, header.text, resizeLine);

    this.headerGroups[index] = headerGroup;

    if (isFrozen) {
      this.canvas.layers.xyStickyLayer.add(headerGroup);
    } else {
      if (this.isCol) {
        this.canvas.layers.yStickyLayer.add(headerGroup);
      } else {
        this.canvas.layers.xStickyLayer.add(headerGroup);
      }
    }
  }

  getHeader(index: number) {
    const size = this.getSize(index);
    const rectConfig: RectConfig = {
      [this.functions.size]: size,
    };
    const rect = this.shapes.headerRect.clone(rectConfig) as Rect;
    const text = new Text({
      text: this.getHeaderText(index),
    });

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
    };
  }

  drawGridLines(index: number) {
    if (this.groups[index]) {
      this.groups[index].destroy();
    }

    const size = this.headerGroups[index][this.functions.size]();

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: size,
      [this.functions.axis]: this.headerGroups[index][this.functions.axis](),
    };

    const group = this.shapes.group.clone(groupConfig) as Group;

    const gridLines: Line[] = [];
    const isFrozen = this.getIsLastFrozen(index);
    const line = isFrozen
      ? this.canvas.shapes.frozenGridLine
      : this.shapes.gridLine;

    const sheetSize =
      this.canvas.sheetDimensions[this.oppositeFunctions.size] +
      this.canvas.getViewportVector()[this.oppositeFunctions.axis];

    const lineConfig = this.getLineConfig(sheetSize);
    const clone = line.clone({
      ...lineConfig,
      [this.functions.axis]: size,
    }) as Line;

    gridLines.push(clone);

    gridLines.forEach((gridLine) => {
      group.add(gridLine);
    });

    this.groups[index] = group;

    if (isFrozen) {
      this.canvas.layers.xyStickyLayer.add(group);
    } else {
      this.canvas.layers.mainLayer.add(group);
    }
  }

  getResizeLine(index: number) {
    const size = this.getSize(index);
    const lineConfig: LineConfig = {
      [this.functions.axis]: size,
    };
    const clone = this.resizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }
}

export default RowCol;
