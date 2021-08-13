import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { isNil, merge } from 'lodash';
import { Text } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { Line } from 'konva/lib/shapes/Line';
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
import Selector from '../Selector';

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

export interface ICell {
  rowGroup: Group;
  colGroup: Group;
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
  rowHeaderRect: Rect;
  colGroup: Group;
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

interface ICustomSizes {
  size: number;
}

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
  rowResizer!: Resizer;
  colResizer!: Resizer;
  private styles: ICanvasStyles;
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

    const rowYIndex = (this.sheetViewportPositions.row.y =
      calculateSheetViewportEndPosition(
        availableRowHeight,
        0,
        this.options.row.defaultHeight,
        this.options.row.heights
      ));

    const colYIndex = (this.sheetViewportPositions.col.y =
      calculateSheetViewportEndPosition(
        availableColWidth,
        0,
        this.options.col.defaultWidth,
        this.options.col.widths
      ));

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
    this.initializeViewport();
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
      rowGroup: new Group(),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
      colGroup: new Group(),
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

    this.shapes.rowGroup.cache(this.rowHeaderDimensions);
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

  getCellsBetweenVectors(start: Vector2d, end: Vector2d) {
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

    const cells = [];

    for (let ri = cellIndexes.start.ri; ri <= cellIndexes.end.ri; ri++) {
      const row = [];
      const rowGroup = this.rowGroups[ri];

      for (let ci = cellIndexes.start.ci; ci <= cellIndexes.end.ci; ci++) {
        const colGroup = this.colGroups[ci];

        row.push({
          rowGroup,
          colGroup,
        });
      }
      cells.push(row);
    }

    return cells;
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
      this.getCellsBetweenVectors.bind(this)
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
      this.rowGroups,
      this.drawRow,
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
      this.colGroups,
      this.drawCol,
      this.eventEmitter
    );
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.layers,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.colGroups,
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
      this.rowGroups,
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

  initializeViewport() {
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri <= this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRow(ri);
    }

    for (
      let ci = this.sheetViewportPositions.col.x;
      ci <= this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawCol(ci);
    }

    this.setPreviousSheetViewportPositions();
  }

  updateViewport() {
    this.drawViewportShapes();
    this.destroyOutOfViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    this.rowGroups.forEach((rowGroup, index) => {
      if (
        !this.hasOverlap(rowGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        rowGroup.destroy();
        delete this.rowGroups[index];
      }
    });
    this.colGroups.forEach((colGroup, index) => {
      if (
        !this.hasOverlap(colGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        colGroup.destroy();
        delete this.colGroups[index];
      }
    });
  }

  drawViewportShapes() {
    // Scrolling down
    for (
      let ri = this.previousSheetViewportPositions.row.y;
      ri < this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRow(ri);
    }
    // Scrolling up
    for (
      let ri = this.previousSheetViewportPositions.row.x;
      ri > this.sheetViewportPositions.row.x;
      ri--
    ) {
      this.drawRow(ri - 1, true);
    }
    // Scrolling right
    for (
      let ci = this.previousSheetViewportPositions.col.y;
      ci < this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawCol(ci);
    }
    // Scrolling left
    for (
      let ci = this.previousSheetViewportPositions.col.x;
      ci > this.sheetViewportPositions.col.x;
      ci--
    ) {
      this.drawCol(ci - 1, true);
    }
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

  drawRow = (ri: number, drawingAtTop = false) => {
    const prevRi = drawingAtTop ? ri + 1 : ri - 1;

    if (this.rowGroups[ri]) {
      this.rowGroups[ri].destroy();
    }

    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowGroups[prevRi];

    const y = prevRow
      ? drawingAtTop
        ? this.rowGroups[prevRi].y() - rowHeight
        : prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;

    const group = this.shapes.rowGroup.clone({
      index: ri,
      height: rowHeight,
      y,
    }) as Group;
    const rowHeader = this.drawRowHeader(ri);
    const isFrozen = getIsFrozenRow(ri, this.options);

    const xGridLine =
      ri === this.options.frozenCells.row
        ? this.drawXGridLine(ri, this.shapes.frozenGridLine)
        : this.drawXGridLine(ri);

    group.add(rowHeader.rect, rowHeader.text, rowHeader.resizeLine, xGridLine);

    this.rowGroups[ri] = group;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(group);
    } else {
      this.layers.xStickyLayer.add(group);
    }
  };

  drawCol = (ci: number, drawingAtLeft = false) => {
    const prevCi = drawingAtLeft ? ci + 1 : ci - 1;

    if (this.colGroups[ci]) {
      this.colGroups[ci].destroy();
    }

    const colWidth = this.getColWidth(ci);
    const prevCol = this.colGroups[prevCi];

    const x = prevCol
      ? drawingAtLeft
        ? this.colGroups[prevCi].x() - colWidth
        : prevCol.x() + prevCol.width()
      : this.sheetViewportDimensions.x;

    const group = this.shapes.colGroup.clone({
      index: ci,
      width: colWidth,
      x: x,
    }) as Group;
    const colHeader = this.drawColHeader(ci);
    const isFrozen = getIsFrozenCol(ci, this.options);

    const yGridLine =
      ci === this.options.frozenCells.col
        ? this.drawYGridLine(ci, this.shapes.frozenGridLine)
        : this.drawYGridLine(ci);

    group.add(colHeader.rect, colHeader.text, colHeader.resizeLine, yGridLine);

    this.colGroups[ci] = group;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(group);
    } else {
      this.layers.yStickyLayer.add(group);
    }
  };

  drawRowHeader(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const rect = this.shapes.rowHeaderRect.clone({
      height: rowHeight,
    }) as Rect;
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
    const rect = this.shapes.colHeaderRect.clone({
      width: colWidth,
    }) as Rect;
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

  drawXGridLine(ri: number, gridLine = this.shapes.xGridLine) {
    const rowHeight = this.getRowHeight(ri);
    const clone = gridLine.clone({
      // points: [this.sheetViewportDimensions.x, 0, this.stage.width(), 0],
      points: [0, 0, this.stage.width(), 0],
      y: rowHeight,
    }) as Line;

    return clone;
  }

  drawRowHeaderResizeLine(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const clone = this.rowResizer.shapes.resizeLine.clone({
      y: rowHeight,
    }) as Line;

    return clone;
  }

  drawYGridLine(ci: number, gridLine = this.shapes.yGridLine) {
    const colWidth = this.getColWidth(ci);
    const clone = gridLine.clone({
      // points: [0, this.sheetViewportDimensions.y, 0, this.stage.height()],
      points: [0, 0, 0, this.stage.height()],
      x: colWidth,
    }) as Line;

    return clone;
  }

  drawColHeaderResizeLine(ci: number) {
    const colWidth = this.getColWidth(ci);
    const clone = this.colResizer.shapes.resizeLine.clone({
      x: colWidth,
    }) as Line;

    return clone;
  }
}

export default Canvas;
