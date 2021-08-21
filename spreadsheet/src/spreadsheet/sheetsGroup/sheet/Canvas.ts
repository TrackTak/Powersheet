import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { isNil, merge } from 'lodash';
import { Text } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import events from '../../events';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import {
  defaultCanvasStyles,
  ICanvasStyles,
  IColHeaderConfig,
  IRowHeaderConfig,
  performanceProperties,
} from './canvasStyles';
import Resizer from './Resizer';
import { IOptions, ISizes } from '../../options';
import Selector from './Selector';
import { ShapeConfig } from 'konva/lib/Shape';
import Merger from './Merger';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  options: IOptions;
  eventEmitter: EventEmitter;
}

export interface IDimensions {
  width: number;
  height: number;
}

export interface ISheetViewportPosition {
  x: number;
  y: number;
}

export interface ISheetViewportPositions {
  row: ISheetViewportPosition;
  col: ISheetViewportPosition;
}

export interface ICanvasShapes {
  sheetGroup: Group;
  sheet: Rect;
  rowGroup: Group;
  rowHeaderGroup: Group;
  rowHeaderRect: Rect;
  colGroup: Group;
  colHeaderGroup: Group;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
}

export interface ICustomSizePosition {
  axis: number;
  size: number;
}

export interface ILayers {
  mainLayer: Layer;
  yStickyLayer: Layer;
  xStickyLayer: Layer;
  xyStickyLayer: Layer;
}

export interface ICustomSizes {
  size: number;
}

const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.x + rectOne.width / 2,
    y: rectOne.y + rectOne.height / 2,
  };

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2,
  };

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y,
  };
};

export const getIsFrozenRow = (ri: number, options: IOptions) => {
  return isNil(options.frozenCells.row) ? false : ri <= options.frozenCells.row;
};

export const getIsFrozenCol = (ci: number, options: IOptions) => {
  return isNil(options.frozenCells.col) ? false : ci <= options.frozenCells.col;
};

export const calculateSheetViewportEndPosition = (
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

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  layers!: ILayers;
  horizontalScrollBar!: HorizontalScrollBar;
  verticalScrollBar!: VerticalScrollBar;
  selector!: Selector;
  merger!: Merger;
  rowResizer!: Resizer;
  colResizer!: Resizer;
  private styles: ICanvasStyles;
  private rowHeaderGroups: Group[];
  private colHeaderGroups: Group[];
  private rowGroups: Group[];
  private colGroups: Group[];
  private shapes!: ICanvasShapes;
  private sheetDimensions: IDimensions;
  private rowHeaderDimensions: IDimensions;
  private colHeaderDimensions: IDimensions;
  private sheetViewportDimensions: IRect;
  private sheetViewportPositions: ISheetViewportPositions;
  private previousSheetViewportPositions!: ISheetViewportPositions;
  private eventEmitter: EventEmitter;
  private options: IOptions;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.options = params.options;

    this.rowHeaderDimensions = {
      width: this.styles.rowHeader.rect.width,
      height: this.options.row.defaultHeight,
    };

    this.colHeaderDimensions = {
      width: this.options.col.defaultWidth,
      height: this.styles.colHeader.rect.height,
    };

    this.sheetDimensions = {
      get width() {
        const widths = Object.values(that.options.col.widths);

        const totalWidthsDifference = widths.reduce((currentWidth, width) => {
          return width - that.options.col.defaultWidth + currentWidth;
        }, 0);

        return (
          that.options.numberOfCols * that.options.col.defaultWidth +
          totalWidthsDifference
        );
      },
      get height() {
        const heights = Object.values(that.options.row.heights);

        const totalHeightsDifference = heights.reduce(
          (currentHeight, height) => {
            return height - that.options.row.defaultHeight + currentHeight;
          },
          0
        );

        return (
          that.options.numberOfRows * that.options.row.defaultHeight +
          totalHeightsDifference
        );
      },
    };

    this.rowHeaderGroups = [];
    this.colHeaderGroups = [];
    this.rowGroups = [];
    this.colGroups = [];

    const that = this;

    this.sheetViewportDimensions = {
      x: that.rowHeaderDimensions.width,
      y: that.colHeaderDimensions.height,
      get width() {
        return that.stage.width() - that.rowHeaderDimensions.width;
      },
      get height() {
        return that.stage.height() - that.colHeaderDimensions.height;
      },
    };

    this.create(params.stageConfig);

    this.sheetViewportPositions = {
      // Based on the y 100% axis of the row
      row: {
        x: 0,
        y: 0,
      },
      // Based the x 100 axis of the row
      col: {
        x: 0,
        y: 0,
      },
    };

    this.setPreviousSheetViewportPositions();

    this.createScrollBars();
    this.drawTopLeftOffsetRect();
  }

  setPreviousSheetViewportPositions() {
    this.previousSheetViewportPositions = {
      row: {
        ...this.sheetViewportPositions.row,
      },
      col: {
        ...this.sheetViewportPositions.col,
      },
    };
  }

  onLoad = () => {
    const availableRowHeight =
      window.innerHeight -
      this.sheetViewportDimensions.y -
      this.horizontalScrollBar.getBoundingClientRect().height;

    const availableColWidth =
      window.innerWidth -
      this.sheetViewportDimensions.x -
      this.verticalScrollBar.getBoundingClientRect().width;

    const rowYIndex = calculateSheetViewportEndPosition(
      availableRowHeight,
      0,
      this.options.row.defaultHeight,
      this.options.row.heights
    );

    const colYIndex = calculateSheetViewportEndPosition(
      availableColWidth,
      0,
      this.options.col.defaultWidth,
      this.options.col.widths
    );

    let sumOfRowHeights = 0;
    let sumOfColWidths = 0;

    for (let ri = 0; ri < rowYIndex; ri++) {
      sumOfRowHeights += this.getRowHeight(ri);
    }

    for (let ci = 0; ci < colYIndex; ci++) {
      sumOfColWidths += this.getColWidth(ci);
    }

    this.stage.width(sumOfColWidths + this.sheetViewportDimensions.x);
    this.stage.height(sumOfRowHeights + this.sheetViewportDimensions.y);

    this.sheetViewportPositions.row.y = rowYIndex;
    this.sheetViewportPositions.col.y = colYIndex;

    this.shapes.sheetGroup.setAttrs({
      x: this.sheetViewportDimensions.x,
      y: this.sheetViewportDimensions.y,
    });

    this.shapes.sheet.setAttrs({
      width: this.sheetViewportDimensions.width,
      height: this.sheetViewportDimensions.height,
    });

    this.createResizer();
    this.createSelector();
    this.createMerger();
    this.drawItemsBetweenPositions(
      this.previousSheetViewportPositions,
      this.sheetViewportPositions
    );
    this.setPreviousSheetViewportPositions();
  };

  private create(stageConfig: ICreateStageConfig = {}) {
    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`, styles.canvas);

    this.stage = new Stage({
      container: this.container,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    // The order here matters
    this.layers = {
      mainLayer: new Layer(),
      xStickyLayer: new Layer(),
      yStickyLayer: new Layer(),
      xyStickyLayer: new Layer(),
    };

    Object.values(this.layers).forEach((layer) => {
      this.stage.add(layer);
    });

    this.shapes = {
      sheetGroup: new Group({
        ...performanceProperties,
        listening: true,
      }),
      sheet: new Rect({
        ...performanceProperties,
        listening: true,
        opacity: 0,
      }),
      rowHeaderRect: new Rect({
        ...this.rowHeaderDimensions,
        ...this.styles.rowHeader.rect,
      }),
      rowHeaderGroup: new Group(),
      rowGroup: new Group(),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
      colGroup: new Group(),
      colHeaderGroup: new Group(),
      xGridLine: new Line({
        ...this.styles.gridLine,
      }),
      yGridLine: new Line({
        ...this.styles.gridLine,
      }),
      frozenGridLine: new Line({
        ...this.styles.frozenGridLine,
      }),
    };

    this.shapes.rowHeaderGroup.cache(this.rowHeaderDimensions);
    this.shapes.rowGroup.cache(this.rowHeaderDimensions);

    this.shapes.colHeaderGroup.cache(this.colHeaderDimensions);
    this.shapes.colGroup.cache(this.colHeaderDimensions);

    this.shapes.rowHeaderRect.cache();
    this.shapes.colHeaderRect.cache();
    this.shapes.xGridLine.cache();
    this.shapes.yGridLine.cache();
    this.shapes.frozenGridLine.cache();

    this.shapes.sheetGroup.add(this.shapes.sheet);

    this.layers.xyStickyLayer.add(this.shapes.sheetGroup);

    this.eventEmitter.on(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.on(events.resize.col.start, this.onResizeColStart);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  onResizeRowStart = () => {
    this.rowResizer.shapes.resizeGuideLine.moveToTop();
  };

  onResizeColStart = () => {
    this.colResizer.shapes.resizeGuideLine.moveToTop();
  };

  reverseVectorsIfStartBiggerThanEnd(start: Vector2d, end: Vector2d) {
    const newStart = { ...start };
    const newEnd = { ...end };

    if (start.x > end.x) {
      const temp = start.x;

      newStart.x = end.x;
      newEnd.x = temp;
    }

    if (start.y > end.y) {
      const temp = start.y;

      newStart.y = end.y;
      newEnd.y = temp;
    }

    return {
      start: newStart,
      end: newEnd,
    };
  }

  getRowColsBetweenVectors(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } =
      this.reverseVectorsIfStartBiggerThanEnd(start, end);

    const rowCustomSize: ICustomSizes[] = [];

    rowCustomSize[this.verticalScrollBar.scrollOffset.index] = {
      size: this.verticalScrollBar.scrollOffset.size,
    };

    const colCustomSize = [];

    colCustomSize[this.horizontalScrollBar.scrollOffset.index] = {
      size: this.horizontalScrollBar.scrollOffset.size,
    };

    const cellIndexes = {
      start: {
        ri: calculateSheetViewportEndPosition(
          newStart.y,
          this.sheetViewportPositions.row.x,
          this.options.row.defaultHeight,
          this.options.row.heights,
          rowCustomSize
        ),
        ci: calculateSheetViewportEndPosition(
          newStart.x,
          this.sheetViewportPositions.col.x,
          this.options.col.defaultWidth,
          this.options.col.widths,
          colCustomSize
        ),
      },
      end: {
        ri: calculateSheetViewportEndPosition(
          newEnd.y,
          this.sheetViewportPositions.row.x,
          this.options.row.defaultHeight,
          this.options.row.heights,
          rowCustomSize
        ),
        ci: calculateSheetViewportEndPosition(
          newEnd.x,
          this.sheetViewportPositions.col.x,
          this.options.col.defaultWidth,
          this.options.col.widths,
          colCustomSize
        ),
      },
    };

    const comparer = (a: Group, b: Group) => a.attrs.index - b.attrs.index;

    let rows: Group[] = [];
    let cols: Group[] = [];

    for (let ri = cellIndexes.start.ri; ri <= cellIndexes.end.ri; ri++) {
      const rowGroup = this.rowHeaderGroups[ri];

      rows.push(rowGroup);
    }

    for (let ci = cellIndexes.start.ci; ci <= cellIndexes.end.ci; ci++) {
      const colGroup = this.colHeaderGroups[ci];

      cols.push(colGroup);
    }

    const mergedCells = this.options.mergedCells.filter((x) => {
      return (
        (cellIndexes.start.ri >= x.start.row &&
          cellIndexes.start.ri <= x.end.row &&
          cellIndexes.start.ci >= x.start.col &&
          cellIndexes.start.ci <= x.end.col) ||
        (cellIndexes.end.ri >= x.start.row &&
          cellIndexes.start.ri <= x.end.row &&
          cellIndexes.end.ci >= x.start.col &&
          cellIndexes.start.ci <= x.end.col)
      );
    });

    if (mergedCells.length) {
      mergedCells.forEach((mergedCell) => {
        let totalMergedHeight = 0;
        let totalMergedWidth = 0;

        const firstRow = this.rowGroups[mergedCell.start.row];
        const firstCol = this.colGroups[mergedCell.start.col];

        for (
          let index = mergedCell.start.row;
          index <= mergedCell.end.row;
          index++
        ) {
          const rowGroup = this.rowGroups[index];

          totalMergedHeight += rowGroup.height();

          rows = rows.filter((x) => x.attrs.index !== index);
        }

        for (
          let index = mergedCell.start.col;
          index <= mergedCell.end.col;
          index++
        ) {
          const colGroup = this.colGroups[index];

          totalMergedWidth += colGroup.width();

          cols = cols.filter((x) => x.attrs.index !== index);
        }

        const newMergedRowGroup = new Group({
          y: firstRow.y(),
          height: totalMergedHeight,
          index: firstRow.attrs.index,
          isMerged: true,
        });

        const newMergedColGroup = new Group({
          x: firstCol.x(),
          width: totalMergedWidth,
          index: firstCol.attrs.index,
          isMerged: true,
        });

        rows.push(newMergedRowGroup);

        cols.push(newMergedColGroup);
      });
    }

    const sortedRows = rows.sort(comparer);
    const sortedCols = cols.sort(comparer);

    return {
      rows: sortedRows,
      cols: sortedCols,
    };
  }

  onHorizontalScroll = () => {
    this.updateViewport();
  };

  onVerticalScroll = () => {
    this.updateViewport();
  };

  createSelector() {
    this.selector = new Selector(
      this.styles,
      this.eventEmitter,
      this.shapes,
      this.layers,
      this.options,
      this.getRowColsBetweenVectors.bind(this)
    );
  }

  createMerger() {
    this.merger = new Merger(
      this.options,
      this.selector,
      this.rowGroups,
      this.colGroups,
      this.drawRowLines.bind(this),
      this.drawColLines.bind(this)
    );
  }

  createResizer() {
    this.rowResizer = new Resizer(
      'row',
      this.layers,
      this.rowHeaderDimensions,
      this.styles,
      {
        points: [this.sheetViewportDimensions.x, 0, this.stage.width(), 0],
      },
      {
        points: [0, 0, this.rowHeaderDimensions.width, 0],
      },
      {
        minSize: this.options.row.minHeight,
        defaultSize: this.options.row.defaultHeight,
        sizes: this.options.row.heights,
      },
      this.rowHeaderGroups,
      this.drawRow.bind(this),
      this.drawColLines.bind(this),
      this.drawRowLines.bind(this),
      this.sheetViewportPositions,
      this.eventEmitter
    );

    this.colResizer = new Resizer(
      'col',
      this.layers,
      this.colHeaderDimensions,
      this.styles,
      {
        points: [0, this.sheetViewportDimensions.y, 0, this.stage.height()],
      },
      {
        points: [0, 0, 0, this.colHeaderDimensions.height],
      },
      {
        minSize: this.options.col.minWidth,
        defaultSize: this.options.col.defaultWidth,
        sizes: this.options.col.widths,
      },
      this.colHeaderGroups,
      this.drawCol.bind(this),
      this.drawColLines.bind(this),
      this.drawRowLines.bind(this),
      this.sheetViewportPositions,
      this.eventEmitter
    );
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.layers,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.colHeaderGroups,
      this.eventEmitter,
      this.options,
      this.sheetViewportDimensions,
      this.onHorizontalScroll
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.layers,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.rowHeaderGroups,
      this.eventEmitter,
      this.options,
      this.sheetViewportDimensions,
      this.onVerticalScroll
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.eventEmitter.off(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.off(events.resize.col.start, this.onResizeColStart);

    this.horizontalScrollBar.destroy();
    this.verticalScrollBar.destroy();
    this.selector.destroy();
    this.rowResizer.destroy();
    this.colResizer.destroy();
    this.stage.destroy();
  }

  drawTopLeftOffsetRect() {
    const rect = new Rect({
      width: this.rowHeaderDimensions.width,
      height: this.colHeaderDimensions.height,
      ...this.styles.topLeftRect,
    });

    this.layers.xyStickyLayer.add(rect);
  }

  // Use center-center distance check for non-rotated rects.
  // https://longviewcoder.com/2021/02/04/html5-canvas-viewport-optimisation-with-konva/
  hasOverlap(rectOne: IRect, rectTwo: IRect) {
    const diff = {
      x: Math.abs(
        rectOne.x + rectOne.width / 2 - (rectTwo.x + rectTwo.width / 2)
      ),
      y: Math.abs(
        rectOne.y + rectOne.height / 2 - (rectTwo.y + rectTwo.height / 2)
      ),
    };
    const compWidth = (rectOne.width + rectTwo.width) / 2;
    const compHeight = (rectOne.height + rectTwo.height) / 2;
    const hasOverlap = diff.x <= compWidth && diff.y <= compHeight;

    return hasOverlap;
  }

  updateViewport() {
    this.drawItemsBetweenPositions(
      this.previousSheetViewportPositions,
      this.sheetViewportPositions
    );
    this.destroyOutOfViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    this.rowHeaderGroups.forEach((rowGroup, index) => {
      if (
        !this.hasOverlap(rowGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        rowGroup.destroy();
        delete this.rowHeaderGroups[index];
      }
    });
    this.colHeaderGroups.forEach((colGroup, index) => {
      if (
        !this.hasOverlap(colGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        colGroup.destroy();
        delete this.colHeaderGroups[index];
      }
    });
  }

  *iteratePreviousUpToCurrent(
    previousSheetViewportPosition:
      | ISheetViewportPositions['row']
      | ISheetViewportPositions['col'],
    sheetViewportPositions:
      | ISheetViewportPositions['row']
      | ISheetViewportPositions['col'],
    axis: 'x' | 'y'
  ) {
    for (
      let index = previousSheetViewportPosition[axis];
      index < sheetViewportPositions[axis];
      index++
    ) {
      yield index;
    }

    return -Infinity;
  }

  *iteratePreviousDownToCurrent(
    previousSheetViewportPosition:
      | ISheetViewportPositions['row']
      | ISheetViewportPositions['col'],
    sheetViewportPositions:
      | ISheetViewportPositions['row']
      | ISheetViewportPositions['col'],
    axis: 'x' | 'y'
  ) {
    for (
      let index = previousSheetViewportPosition[axis];
      index > sheetViewportPositions[axis];
      index--
    ) {
      yield index;
    }

    return -Infinity;
  }

  drawItemsBetweenPositions(
    startPositions: ISheetViewportPositions,
    endPositions: ISheetViewportPositions
  ) {
    const rowXGenerator = this.iteratePreviousDownToCurrent(
      startPositions.row,
      endPositions.row,
      'x'
    );

    const rowYGenerator = this.iteratePreviousUpToCurrent(
      startPositions.row,
      endPositions.row,
      'y'
    );

    const colXGenerator = this.iteratePreviousDownToCurrent(
      startPositions.col,
      endPositions.col,
      'x'
    );

    const colYGenerator = this.iteratePreviousUpToCurrent(
      startPositions.col,
      endPositions.col,
      'y'
    );

    let ri = -Infinity;
    let ci = -Infinity;

    do {
      const rowXGeneratorNext = rowXGenerator.next();
      const colXGeneratorNext = colXGenerator.next();

      ri = Math.max(
        rowXGeneratorNext.value ?? -Infinity,
        rowYGenerator.next().value ?? -Infinity
      );
      ci = Math.max(
        colXGeneratorNext.value ?? -Infinity,
        colYGenerator.next().value ?? -Infinity
      );

      if (isFinite(ri)) {
        const params: [number, boolean?] = !rowXGeneratorNext.done
          ? [ri - 1, true]
          : [ri];

        this.drawRow(...params);
      }

      if (isFinite(ci)) {
        const params: [number, boolean?] = !colXGeneratorNext.done
          ? [ci - 1, true]
          : [ci];

        this.drawCol(...params);
      }

      if (isFinite(ri)) {
        this.drawRowLines(ri);

        const mergedCol = this.merger.mergedCellsMap.row[ri];

        if (mergedCol) {
          mergedCol
            .filter((ci) => this.colHeaderGroups[ci])
            .forEach((ci) => {
              this.drawColLines(ci);
            });
        }
      }

      if (isFinite(ci)) {
        this.drawColLines(ci);

        const mergedRow = this.merger.mergedCellsMap.col[ci];

        if (mergedRow) {
          mergedRow
            .filter((ri) => this.rowHeaderGroups[ri])
            .forEach((ri) => {
              this.drawRowLines(ri);
            });
        }
      }
    } while (isFinite(ri) || isFinite(ci));
  }

  getRowHeight(ri: number) {
    const rowHeight =
      this.options.row.heights[ri] ?? this.options.row.defaultHeight;

    return rowHeight;
  }

  getColWidth(ci: number) {
    const colWidth =
      this.options.col.widths[ci] ?? this.options.col.defaultWidth;

    return colWidth;
  }

  drawRow(ri: number, drawingAtTop = false) {
    const prevRi = drawingAtTop ? ri + 1 : ri - 1;

    if (this.rowHeaderGroups[ri]) {
      this.rowHeaderGroups[ri].destroy();
    }

    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowHeaderGroups[prevRi];

    const y = prevRow
      ? drawingAtTop
        ? this.rowHeaderGroups[prevRi].y() - rowHeight
        : prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;

    const groupConfig: ShapeConfig = {
      index: ri,
      height: rowHeight,
      y,
    };
    const rowHeaderGroup = this.shapes.rowHeaderGroup.clone(
      groupConfig
    ) as Group;
    const rowHeader = this.drawRowHeader(ri);
    const isFrozen = getIsFrozenRow(ri, this.options);

    rowHeaderGroup.add(rowHeader.rect, rowHeader.text, rowHeader.resizeLine);

    this.rowHeaderGroups[ri] = rowHeaderGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(rowHeaderGroup);
    } else {
      this.layers.xStickyLayer.add(rowHeaderGroup);
    }
  }

  drawCol(ci: number, drawingAtLeft = false) {
    const prevCi = drawingAtLeft ? ci + 1 : ci - 1;

    if (this.colHeaderGroups[ci]) {
      this.colHeaderGroups[ci].destroy();
    }

    const colWidth = this.getColWidth(ci);
    const prevCol = this.colHeaderGroups[prevCi];

    const x = prevCol
      ? drawingAtLeft
        ? this.colHeaderGroups[prevCi].x() - colWidth
        : prevCol.x() + prevCol.width()
      : this.sheetViewportDimensions.x;

    const groupConfig: ShapeConfig = {
      index: ci,
      width: colWidth,
      x: x,
    };
    const colHeaderGroup = this.shapes.colHeaderGroup.clone(
      groupConfig
    ) as Group;
    const colHeader = this.drawColHeader(ci);
    const isFrozen = getIsFrozenCol(ci, this.options);

    colHeaderGroup.add(colHeader.rect, colHeader.text, colHeader.resizeLine);

    this.colHeaderGroups[ci] = colHeaderGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(colHeaderGroup);
    } else {
      this.layers.yStickyLayer.add(colHeaderGroup);
    }
  }

  drawRowHeader(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const rectConfig: RectConfig = {
      height: rowHeight,
    };
    const rect = this.shapes.rowHeaderRect.clone(rectConfig) as Rect;
    const text = new Text({
      text: (ri + 1).toString(),
      ...this.styles.rowHeader.text,
    });
    const resizeLine = this.drawRowHeaderResizeLine(ri);

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
      resizeLine,
    };
  }

  drawColHeader(ci: number) {
    const colWidth = this.getColWidth(ci);
    const startCharCode = 'A'.charCodeAt(0);
    const letter = String.fromCharCode(startCharCode + ci);
    const rectConfig: RectConfig = {
      width: colWidth,
    };
    const rect = this.shapes.colHeaderRect.clone(rectConfig) as Rect;
    const text = new Text({
      text: letter,
      ...this.styles.colHeader.text,
    });
    const resizeLine = this.drawColHeaderResizeLine(ci);

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
      resizeLine,
    };
  }

  drawRowLines(ri: number) {
    if (this.rowGroups[ri]) {
      this.rowGroups[ri].destroy();
    }

    const groupConfig: ShapeConfig = {
      index: ri,
      height: this.rowHeaderGroups[ri].height(),
      y: this.rowHeaderGroups[ri].y(),
    };

    const rowGroup = this.shapes.rowGroup.clone(groupConfig) as Group;
    const isFrozen = ri === this.options.frozenCells.row;
    const xGridLines: Line[] = [];

    const line = isFrozen ? this.shapes.frozenGridLine : this.shapes.xGridLine;
    const sheetWidth =
      this.sheetDimensions.width + this.colHeaderDimensions.width;
    const lineConfig: LineConfig = {
      points: [0, 0, sheetWidth, 0],
    };
    const clone = line.clone(lineConfig) as Line;

    const mergedRow = this.merger.mergedCellsMap.row[ri];

    const hasColsShowing = mergedRow?.some((ci) => this.colHeaderGroups[ci]);

    if (mergedRow && hasColsShowing) {
      mergedRow.forEach((ci, i) => {
        const prevColGroupIndex = mergedRow[i - 1];
        const prevColGroup = !isNil(prevColGroupIndex)
          ? this.colHeaderGroups[prevColGroupIndex]
          : null;

        const colGroup = this.colHeaderGroups[ci];

        const nextColGroupIndex = mergedRow[i + 1];
        const nextColGroup = !isNil(nextColGroupIndex)
          ? this.colHeaderGroups[nextColGroupIndex]
          : null;

        const setLeftLine = () => {
          let x0 = 0;
          const x1 = colGroup.x();

          if (prevColGroup) {
            x0 = prevColGroup.x() + prevColGroup.width();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [x0, 0, x1, 0],
          }) as Line;

          xGridLines.push(clone);
        };

        const setRightLine = () => {
          const x0 = colGroup.x() + colGroup.width();
          let x1 = sheetWidth;

          if (nextColGroup) {
            x1 = nextColGroup.x();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [x0, 0, x1, 0],
          }) as Line;

          xGridLines.push(clone);
        };

        if (colGroup) {
          setLeftLine();
          setRightLine();
        }
      });
    } else {
      xGridLines.push(clone);
    }

    xGridLines.forEach((xGridLine) => {
      rowGroup.add(xGridLine);
    });

    this.rowGroups[ri] = rowGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(rowGroup);
    } else {
      this.layers.mainLayer.add(rowGroup);
    }
  }

  drawColLines(ci: number) {
    if (this.colGroups[ci]) {
      this.colGroups[ci].destroy();
    }
    const groupConfig: ShapeConfig = {
      index: ci,
      width: this.colHeaderGroups[ci].width(),
      x: this.colHeaderGroups[ci].x(),
    };

    const colGroup = this.shapes.colGroup.clone(groupConfig) as Group;
    const isFrozen = ci === this.options.frozenCells.col;
    const yGridLines: Line[] = [];

    const line = isFrozen ? this.shapes.frozenGridLine : this.shapes.yGridLine;
    const sheetHeight =
      this.sheetDimensions.height + this.colHeaderDimensions.height;
    const lineConfig: LineConfig = {
      points: [0, 0, 0, sheetHeight],
    };

    const clone = line.clone(lineConfig) as Line;

    const mergedCol = this.merger.mergedCellsMap.col[ci];

    const hasRowsShowing = mergedCol?.some((ri) => this.rowHeaderGroups[ri]);

    if (mergedCol && hasRowsShowing) {
      mergedCol.forEach((ri, i) => {
        const prevRowGroupIndex = mergedCol[i - 1];
        const prevRowGroup = !isNil(prevRowGroupIndex)
          ? this.rowHeaderGroups[prevRowGroupIndex]
          : null;

        const rowGroup = this.rowHeaderGroups[ri];

        const nextRowGroupIndex = mergedCol[i + 1];
        const nextRowGroup = !isNil(nextRowGroupIndex)
          ? this.rowHeaderGroups[nextRowGroupIndex]
          : null;

        const setTopLine = () => {
          let y0 = 0;
          let y1 = rowGroup.y();

          if (prevRowGroup) {
            y0 = prevRowGroup.y() + prevRowGroup.height();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [0, y0, 0, y1],
          }) as Line;

          yGridLines.push(clone);
        };

        const setBottomLine = () => {
          let y0 = rowGroup.y() + rowGroup.height();
          let y1 = sheetHeight;

          if (nextRowGroup) {
            y1 = nextRowGroup.y();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [0, y0, 0, y1],
          }) as Line;

          yGridLines.push(clone);
        };

        if (rowGroup) {
          setTopLine();
          setBottomLine();
        }
      });
    } else {
      yGridLines.push(clone);
    }

    yGridLines.forEach((yGridLine) => {
      colGroup.add(yGridLine);
    });

    this.colGroups[ci] = colGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(colGroup);
    } else {
      this.layers.mainLayer.add(colGroup);
    }
  }

  drawRowHeaderResizeLine(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const lineConfig: LineConfig = {
      y: rowHeight,
    };
    const clone = this.rowResizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }

  drawColHeaderResizeLine(ci: number) {
    const colWidth = this.getColWidth(ci);
    const lineConfig: LineConfig = {
      x: colWidth,
    };
    const clone = this.colResizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }
}

export default Canvas;
