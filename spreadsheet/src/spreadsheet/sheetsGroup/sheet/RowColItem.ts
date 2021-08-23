import { Group } from 'konva/lib/Group';
import { ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import { isNil } from 'lodash';
import events from '../../events';
import { ISizes } from '../../options';
import Canvas, {
  calculateSheetViewportEndPosition,
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

export interface IRowColItemFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

class RowColItem {
  resizer: IResizer;
  scrollBar: IScrollBar;
  headerGroups: Group[];
  groups: Group[];
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
  private functions: IRowColItemFunctions;
  private oppositeFunctions: IRowColItemFunctions;

  constructor(private type: RowColType, private canvas: Canvas) {
    this.type = type;
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

    if (this.type === 'col') {
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
        this.headerGroups,
        this.onScroll
      );
      this.resizer = new Resizer(
        canvas,
        this.type,
        this.functions,
        {
          points: [
            0,
            this.canvas.getViewportXY().y,
            0,
            this.canvas.stage.height(),
          ],
        },
        {
          points: [0, 0, 0, this.canvas.getViewportXY().y],
        },
        this.sizeOptions,
        this.headerGroups
      );
      this.shapes.headerText.attrs(this.canvas.styles.colHeader.text);
      this.shapes.headerRect.attrs({
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
        this.canvas.getViewportXY().x -
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
        this.headerGroups,
        this.onScroll
      );
      this.resizer = new Resizer(
        canvas,
        this.type,
        this.functions,
        {
          points: [
            this.canvas.getViewportXY().x,
            0,
            this.canvas.stage.width(),
            0,
          ],
        },
        {
          points: [0, 0, this.canvas.getViewportXY().x, 0],
        },
        this.sizeOptions,
        this.headerGroups
      );
      this.shapes.headerText.attrs(this.canvas.styles.rowHeader.text);
      this.shapes.headerRect.attrs({
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
        this.canvas.getViewportXY().y -
        this.canvas.col.scrollBar.getBoundingClientRect().height;
    }

    this.shapes.headerGroup.cache(this.canvas.getViewportXY());
    this.shapes.group.cache(this.canvas.getViewportXY());
    this.shapes.headerRect.cache();
    this.shapes.gridLine.cache();

    this.canvas.eventEmitter.on(
      events.resize[this.type].start,
      this.onResizeStart
    );
    this.canvas.eventEmitter.on(events.resize[this.type].end, this.onResizeEnd);
  }

  destroy() {
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

  onScroll = () => {
    this.updateViewport();
  };

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

  updateViewport() {
    let iteratorResult = null;

    do {
      iteratorResult = this.getNextItemToDraw().next();
    } while (!iteratorResult.done);

    this.destroyOutOfViewportItems();

    this.previousSheetViewportPosition.x = this.sheetViewportPosition.x;
    this.previousSheetViewportPosition.y = this.sheetViewportPosition.y;
  }

  *getNextItemToDraw() {
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

      yield;

      if (isFinite(index)) {
        this.drawGridLines(index);

        const mergedCells = this.canvas.merger.mergedCellsMap[this.type][index];

        if (mergedCells) {
          mergedCells
            .filter(
              (index) => this.canvas[this.oppositeType].headerGroups[index]
            )
            .forEach((index) => {
              this.canvas[this.oppositeType].drawGridLines(index);
            });
        }
      }
    } while (isFinite(index));
  }

  destroyOutOfViewportItems() {
    this.headerGroups.forEach((group, index) => {
      const isOverlapping = hasOverlap(group.getClientRect(), {
        ...this.canvas.getViewportXY(),
        ...this.canvas.sheetViewportDimensions,
      });

      if (!isOverlapping) {
        group.destroy();

        delete this.headerGroups[index];
      }
    });
  }

  onLoad() {
    const yIndex = calculateSheetViewportEndPosition(
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

    this.updateViewport();
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
      x: calculateSheetViewportEndPosition(position.x, ...params),
      y: calculateSheetViewportEndPosition(position.y, ...params),
    };

    return indexes;
  }

  getItemsBetweenIndexes(indexes: Vector2d, mergedCells: Vector2d[]) {
    let groups: Group[] = [];

    for (let index = indexes.x; index <= indexes.y; index++) {
      groups.push(this.headerGroups[index]);
    }

    const comparer = (a: Group, b: Group) => a.attrs.index - b.attrs.index;

    mergedCells.forEach((mergedCell) => {
      let totalMergedSize = 0;

      const item = this.groups[mergedCell.x];

      for (let index = mergedCell.x; index <= mergedCell.y; index++) {
        const group = this.groups[index];

        totalMergedSize += group[this.functions.size]();

        groups = groups.filter((x) => x.attrs.index !== index);
      }

      const newMergedGroup = new Group({
        [this.functions.axis]: item[this.functions.axis](),
        [this.functions.size]: totalMergedSize,
        index: item.attrs.index,
        isMerged: true,
      });

      groups.push(newMergedGroup);
    });

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
      : this.canvas.getViewportXY()[this.functions.axis];

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
      this.canvas.layers.yStickyLayer.add(headerGroup);
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

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: this.headerGroups[index][this.functions.size](),
      [this.functions.axis]: this.headerGroups[index][this.functions.axis](),
    };

    const group = this.shapes.group.clone(groupConfig) as Group;

    const gridLines: Line[] = [];

    const line = this.getIsLastFrozen(index)
      ? this.canvas.shapes.frozenGridLine
      : this.shapes.gridLine;

    const sheetSize =
      this.canvas.sheetDimensions[this.oppositeFunctions.size] +
      this.canvas.getViewportXY()[this.oppositeFunctions.axis];

    const lineConfig = this.getLineConfig(sheetSize);
    const clone = line.clone(lineConfig) as Line;

    const mergedItem = this.canvas.merger.mergedCellsMap[this.type][index];

    const hasMergedCellsShowing = mergedItem?.some(
      (index) => this.canvas[this.oppositeType].headerGroups[index]
    );

    if (mergedItem && hasMergedCellsShowing) {
      mergedItem.forEach((index, i) => {
        const prevGroupIndex = mergedItem[i - 1];
        const prevGroup = !isNil(prevGroupIndex)
          ? this.canvas[this.oppositeType].headerGroups[prevGroupIndex]
          : null;

        const group = this.canvas[this.oppositeType].headerGroups[index];

        const nextGroupIndex = mergedItem[i + 1];
        const nextGroup = !isNil(nextGroupIndex)
          ? this.canvas[this.oppositeType].headerGroups[nextGroupIndex]
          : null;

        const setFirstLine = () => {
          let axis0 = 0;
          let axis1 = group[this.oppositeFunctions.axis]();

          if (prevGroup) {
            axis0 =
              prevGroup[this.oppositeFunctions.axis]() +
              prevGroup[this.oppositeFunctions.size]();
          }

          const clone = line.clone({
            ...lineConfig,
            points: this.getLinePoints(axis0, axis1),
          }) as Line;

          gridLines.push(clone);
        };

        const setSecondLine = () => {
          let axis0 =
            group[this.oppositeFunctions.axis]() +
            group[this.oppositeFunctions.size]();
          let axis1 = sheetSize;

          if (nextGroup) {
            axis1 = nextGroup[this.oppositeFunctions.axis]();
          }

          const clone = line.clone({
            ...lineConfig,
            points: this.getLinePoints(axis0, axis1),
          }) as Line;

          gridLines.push(clone);
        };

        if (group) {
          setFirstLine();
          setSecondLine();
        }
      });
    } else {
      gridLines.push(clone);
    }

    gridLines.forEach((gridLine) => {
      group.add(gridLine);
    });

    this.groups[index] = group;

    if (this.getIsLastFrozen(index)) {
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

export default RowColItem;
