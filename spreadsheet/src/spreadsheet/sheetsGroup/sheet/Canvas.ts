import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { merge } from 'lodash';
import { Text } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { IOptions } from '../../IOptions';
import { Line } from 'konva/lib/shapes/Line';
import events from '../../events';
import { Group } from 'konva/lib/Group';
import { IRect } from 'konva/lib/types';
import {
  defaultCanvasStyles,
  ICanvasStyles,
  IColHeaderConfig,
  IRowHeaderConfig,
  performanceProperties,
} from './canvasStyles';
import Resizer from './Resizer';

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

export interface ISelectedCell {
  ri: number;
  ci: number;
}

interface IShapes {
  sheetGroup: Group;
  sheet: Rect;
  rowGroup: Group;
  rowHeaderRect: Rect;
  colGroup: Group;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
  selector: Rect;
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

const calculateSheetViewportEndPosition = (
  sheetViewportDimensionSize: number,
  sheetViewportStartYIndex: number,
  defaultSize: number
) => {
  let newSheetViewportYIndex = sheetViewportStartYIndex;
  let sumOfSizes = sheetViewportDimensionSize;
  let i = newSheetViewportYIndex;

  while (sumOfSizes > 0) {
    newSheetViewportYIndex = i;

    i++;
    sumOfSizes -= defaultSize;
  }

  return newSheetViewportYIndex;
};

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  mainLayer!: Layer;
  yStickyLayer!: Layer;
  xStickyLayer!: Layer;
  xyStickyLayer!: Layer;
  horizontalScrollBar!: HorizontalScrollBar;
  verticalScrollBar!: VerticalScrollBar;
  rowResizer!: Resizer;
  colResizer!: Resizer;
  private selectedCell?: ISelectedCell;
  private styles: ICanvasStyles;
  private rowGroups: Group[];
  private colGroups: Group[];
  private shapes!: IShapes;
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
        const widths = Object.values(that.options.col.widths ?? {});

        const totalWidthsDifference = widths.reduce((currentWidth, width) => {
          return width - that.options.col.defaultWidth + currentWidth;
        }, 0);

        return (
          that.options.numberOfCols * that.options.col.defaultWidth +
          totalWidthsDifference
        );
      },
      get height() {
        const heights = Object.values(that.options.row.heights ?? {});

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
    const height =
      window.innerHeight -
      this.sheetViewportDimensions.y -
      this.horizontalScrollBar.getBoundingClientRect().height;

    const rowHeight = this.options.row.defaultHeight;
    let sumOfHeights = 0;

    while (sumOfHeights + rowHeight <= height) {
      sumOfHeights += rowHeight;
    }

    const width =
      window.innerWidth -
      this.sheetViewportDimensions.x -
      this.verticalScrollBar.getBoundingClientRect().width;

    const colWidth = this.options.col.defaultWidth;
    let sumOfWidths = 0;

    while (sumOfWidths + colWidth <= width) {
      sumOfWidths += colWidth;
    }

    this.stage.width(sumOfWidths + this.sheetViewportDimensions.x);
    this.stage.height(sumOfHeights + this.sheetViewportDimensions.y);

    this.sheetViewportPositions.row.y = 100;

    this.sheetViewportPositions.col.y = 26;

    this.shapes.sheetGroup.setAttrs({
      x: this.sheetViewportDimensions.x,
      y: this.sheetViewportDimensions.y,
    });

    this.shapes.sheet.setAttrs({
      width: this.sheetViewportDimensions.width,
      height: this.sheetViewportDimensions.height,
    });

    this.createResizer();
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

    this.xStickyLayer = new Layer();
    this.yStickyLayer = new Layer();
    this.xyStickyLayer = new Layer();
    this.mainLayer = new Layer();

    // The order here matters
    this.stage.add(this.xStickyLayer);
    this.stage.add(this.yStickyLayer);
    this.stage.add(this.xyStickyLayer);
    this.stage.add(this.mainLayer);

    this.eventEmitter.on(events.scroll.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scrollWheel.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scroll.horizontal, this.onHorizontalScroll);
    this.eventEmitter.on(
      events.scrollWheel.horizontal,
      this.onHorizontalScroll
    );
    this.eventEmitter.on(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.on(events.resize.col.start, this.onResizeColStart);
    this.eventEmitter.on(events.resize.row.end, this.onResizeRowEnd);
    this.eventEmitter.on(events.resize.col.end, this.onResizeColEnd);

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
      selector: new Rect({
        ...this.styles.selector,
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
    this.xyStickyLayer.add(this.shapes.sheetGroup);

    window.addEventListener('DOMContentLoaded', this.onLoad);

    this.shapes.sheetGroup.on('click', this.sheetOnClick);
  }

  onResizeRowStart = () => {
    this.rowResizer.shapes.resizeGuideLine.zIndex(
      this.shapes.selector.zIndex()
    );
  };

  onResizeColStart = () => {
    this.colResizer.shapes.resizeGuideLine.zIndex(
      this.shapes.selector.zIndex()
    );
  };

  onResizeRowEnd = () => {
    if (this.selectedCell) {
      this.setCellSelected(this.selectedCell);
    }
  };

  onResizeColEnd = () => {
    if (this.selectedCell) {
      this.setCellSelected(this.selectedCell);
      this.rowResizer.shapes.resizeGuideLine.zIndex(
        this.shapes.selector.zIndex()
      );
    }
  };

  sheetOnClick = () => {
    const pos = this.shapes.sheet.getRelativePointerPosition();
    let ri = this.sheetViewportPositions.row.x;
    let sumOfHeights = this.rowGroups[ri].height();

    while (sumOfHeights < pos.y) {
      ri++;
      sumOfHeights += this.rowGroups[ri].height();
    }

    let ci = this.sheetViewportPositions.col.x;
    let sumOfWidths = this.colGroups[ci].width();

    while (sumOfWidths < pos.x) {
      ci++;

      sumOfWidths += this.colGroups[ci].width();
    }

    this.selectedCell = { ri, ci };
    this.setCellSelected(this.selectedCell);
  };

  setCellSelected({ ri, ci }: ISelectedCell) {
    const row = this.rowGroups[ri];
    const col = this.colGroups[ci];

    // const x = colXPosition * this.options.col.defaultWidth;

    // this.shapes.selector.y(y + this.colHeaderDimensions.height);
    this.shapes.selector.y(row.y());
    this.shapes.selector.x(col.x());

    const isFrozenRowClicked =
      this.options.frozenCells && ri <= this.options.frozenCells.row;

    const isFrozenColClicked =
      this.options.frozenCells && ci <= this.options.frozenCells?.col;

    // const ri = isFrozenRowClicked ? ySheetPos : rowXPosition;
    //const ci = isFrozenColClicked ? xSheetPos : colXPosition;

    this.shapes.selector.height(row.height());
    this.shapes.selector.width(col.width());

    if (isFrozenRowClicked && isFrozenColClicked) {
      this.xyStickyLayer.add(this.shapes.selector);
    } else if (isFrozenRowClicked) {
      this.yStickyLayer.add(this.shapes.selector);
    } else if (isFrozenColClicked) {
      this.xStickyLayer.add(this.shapes.selector);
    } else {
      this.mainLayer.add(this.shapes.selector);
    }
  }

  onHorizontalScroll = () => {
    this.updateViewport();
  };

  onVerticalScroll = () => {
    this.updateViewport();
  };

  createResizer() {
    this.rowResizer = new Resizer(
      this.mainLayer,
      'row',
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
        sizes: this.options.row.heights ?? {},
      },
      this.rowGroups,
      this.drawRow,
      this.eventEmitter
    );

    this.colResizer = new Resizer(
      this.mainLayer,
      'col',
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
        sizes: this.options.col.widths ?? {},
      },
      this.colGroups,
      this.drawCol,
      this.eventEmitter
    );
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.yStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.eventEmitter,
      this.options,
      this.colGroups,
      this.sheetViewportDimensions
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.xStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.eventEmitter,
      this.options,
      this.rowGroups,
      this.sheetViewportDimensions
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.eventEmitter.off(events.scroll.vertical, this.onVerticalScroll);
    this.eventEmitter.off(events.scrollWheel.vertical, this.onVerticalScroll);
    this.eventEmitter.off(events.scroll.horizontal, this.onHorizontalScroll);
    this.eventEmitter.off(events.scrollWheel.vertical, this.onHorizontalScroll);
    this.eventEmitter.off(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.off(events.resize.col.start, this.onResizeColStart);
    this.eventEmitter.off(events.resize.row.end, this.onResizeRowEnd);
    this.eventEmitter.off(events.resize.col.end, this.onResizeColEnd);
    this.horizontalScrollBar.destroy();
    this.verticalScrollBar.destroy();
    this.stage.destroy();
  }

  drawTopLeftOffsetRect() {
    const rect = new Rect({
      width: this.rowHeaderDimensions.width,
      height: this.colHeaderDimensions.height,
      ...this.styles.topLeftRect,
    });

    this.xyStickyLayer.add(rect);
  }

  // Use center-center distance check for non-rotated rects.
  // https://longviewcoder.com/2021/02/04/html5-canvas-viewport-optimisation-with-konva/
  hasOverlap(rectOne: IRect, rectTwo: IRect, offset: number = 0) {
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
    const hasOverlap =
      diff.x <= compWidth - offset && diff.y <= compHeight - offset;

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
    this.destroyOutOfViewportShapes();
    this.drawViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    // this.rowGroups.forEach((rowGroup, index) => {
    //   if (
    //     !this.hasOverlap(rowGroup.getClientRect(), this.sheetViewportDimensions)
    //   ) {
    //     rowGroup.destroy();
    //     delete this.rowGroups[index];
    //   }
    // });
    // this.colGroups.forEach((colGroup, index) => {
    //   if (
    //     !this.hasOverlap(colGroup.getClientRect(), this.sheetViewportDimensions)
    //   ) {
    //     colGroup.destroy();
    //     delete this.colGroups[index];
    //   }
    // });
  }

  drawViewportShapes() {
    // Scrolling down
    for (
      let ri = this.sheetViewportPositions.row.y;
      ri > this.previousSheetViewportPositions.row.y;
      ri--
    ) {
      this.drawRow(ri);
    }
    // Scrolling up
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri < this.previousSheetViewportPositions.row.x;
      ri++
    ) {
      this.drawRow(ri);
    }
    // Scrolling right
    for (
      let ci = this.sheetViewportPositions.col.y;
      ci > this.previousSheetViewportPositions.col.y;
      ci--
    ) {
      this.drawCol(ci);
    }
    // Scrolling left
    for (
      let ci = this.sheetViewportPositions.col.x;
      ci < this.previousSheetViewportPositions.col.x;
      ci++
    ) {
      this.drawCol(ci);
    }
  }

  getRowHeight(ri: number) {
    const rowHeight =
      this.options.row.heights?.[ri] ?? this.options.row.defaultHeight;

    return rowHeight;
  }

  getColWidth(ci: number) {
    const colWidth =
      this.options.col.widths?.[ci] ?? this.options.col.defaultWidth;

    return colWidth;
  }

  drawRow = (ri: number) => {
    if (this.rowGroups[ri]) {
      this.rowGroups[ri].destroy();
    }

    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowGroups[ri - 1];
    const y = prevRow
      ? prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;
    const group = this.shapes.rowGroup.clone({
      index: ri,
      height: rowHeight,
      y,
    }) as Group;
    const rowHeader = this.drawRowHeader(ri);
    const isFrozen = this.options.frozenCells?.row === ri;
    const xGridLine = isFrozen
      ? this.drawXGridLine(ri, this.shapes.frozenGridLine)
      : this.drawXGridLine(ri);

    group.add(rowHeader.rect, rowHeader.text, rowHeader.resizeLine, xGridLine);

    this.rowGroups[ri] = group;

    if (isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.xStickyLayer.add(group);
    }
  };

  drawCol = (ci: number) => {
    if (this.colGroups[ci]) {
      this.colGroups[ci].destroy();
    }

    const colWidth = this.getColWidth(ci);
    const prevCol = this.colGroups[ci - 1];
    const x = prevCol
      ? prevCol.x() + prevCol.width()
      : this.sheetViewportDimensions.x;
    const group = this.shapes.colGroup.clone({
      index: ci,
      width: colWidth,
      x: x,
    }) as Group;
    const colHeader = this.drawColHeader(ci);
    const isFrozen = this.options.frozenCells?.col === ci;
    const yGridLine = isFrozen
      ? this.drawYGridLine(ci, this.shapes.frozenGridLine)
      : this.drawYGridLine(ci);

    group.add(colHeader.rect, colHeader.text, colHeader.resizeLine, yGridLine);

    this.colGroups[ci] = group;

    if (isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.yStickyLayer.add(group);
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
