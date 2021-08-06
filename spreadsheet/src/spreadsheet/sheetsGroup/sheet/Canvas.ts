import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import Row from './Row';
import { merge } from 'lodash';
import { Text, TextConfig } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { IRowCol } from './IRowCol';
import { IOptions } from '../../IOptions';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import events from '../../events';
import { Group } from 'konva/lib/Group';
import { IRect } from 'konva/lib/types';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  rows: Row[];
  cols: Col[];
  options: IOptions;
  eventEmitter: EventEmitter;
}

interface IRowHeaderRectConfig extends RectConfig {
  width: number;
}

interface IColHeaderRectConfig extends RectConfig {
  height: number;
}

interface IRowHeaderConfig {
  rect: IRowHeaderRectConfig;
  text: TextConfig;
}

interface IColHeaderConfig {
  rect: IColHeaderRectConfig;
  text: TextConfig;
}

interface IFrozenGridLine extends LineConfig {}

interface ICellRect extends RectConfig {}

interface ITopLeftRectConfig extends RectConfig {}

interface ICanvasStyles {
  backgroundColor: string;
  frozenGridLine: IFrozenGridLine;
  cellRect: ICellRect;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
  topLeftRect: ITopLeftRectConfig;
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

interface IShapes {
  cellRect: Rect;
  rowHeaderRect: Rect;
  colHeaderRect: Rect;
  frozenGridLine: Line;
}

const sharedCanvasStyles = {
  headerRect: {
    fill: '#f4f5f8',
    stroke: '#E6E6E6',
    strokeWidth: 0.6,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    perfectDrawEnabled: false,
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    listening: false,
    perfectDrawEnabled: false,
  },
};

const strokeWidth = 0.6;

const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  frozenGridLine: {
    stroke: 'blue',
    strokeWidth,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    listening: false,
    perfectDrawEnabled: false,
  },
  cellRect: {
    fill: '#fff',
    stroke: '#c6c6c6',
    strokeWidth,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    perfectDrawEnabled: false,
  },
  rowHeader: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      width: 25,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
  },
  colHeader: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      height: 20,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
  },
  topLeftRect: {
    fill: sharedCanvasStyles.headerRect.fill,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    perfectDrawEnabled: false,
  },
};

const getHeaderMidPoints = (rect: Rect, text: Text) => {
  const rectMidPoint = {
    x: rect.x() + rect.width() / 2,
    y: rect.y() + rect.height() / 2,
  };

  const textMidPoint = {
    x: text.width() / 2,
    y: text.height() / 2,
  };

  return {
    x: rectMidPoint.x - textMidPoint.x,
    y: rectMidPoint.y - textMidPoint.y,
  };
};

const calculateSheetViewportEndPosition = (
  sheetViewportDimensionSize: number,
  sheetViewportStartYIndex: number,
  items: IRowCol[]
) => {
  let newSheetViewportYIndex = sheetViewportStartYIndex;
  let sumOfSizes = sheetViewportDimensionSize;
  let i = newSheetViewportYIndex;
  let currentItem = items[i];

  while (sumOfSizes >= currentItem?.getSize()) {
    currentItem = items[i];
    const size = currentItem.getSize();

    newSheetViewportYIndex = i;

    i++;
    sumOfSizes -= size;
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
  private styles: ICanvasStyles;
  private rows: Row[];
  private cols: Col[];
  private cells: Rect[][];
  private rowHeaders: Group[];
  private colHeaders: Group[];
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
      width:
        params.cols.reduce((currentWidth, col) => col.width + currentWidth, 0) +
        this.rowHeaderDimensions.width,
      height:
        params.rows.reduce(
          (currentHeight, row) => row.height + currentHeight,
          0
        ) + this.colHeaderDimensions.height,
    };

    this.cells = [];
    this.rowHeaders = [];
    this.colHeaders = [];

    const that = this;

    this.sheetViewportDimensions = {
      x: that.rowHeaderDimensions.width,
      y: that.colHeaderDimensions.height,
      get height() {
        return that.stage.height() - that.colHeaderDimensions.height;
      },
      get width() {
        return that.stage.width() - that.rowHeaderDimensions.width;
      },
    };

    this.create(params.stageConfig);

    this.rows = params.rows;
    this.cols = params.cols;

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
    this.stage.width(
      window.innerWidth - this.verticalScrollBar.getBoundingClientRect().width
    );
    this.stage.height(
      window.innerHeight -
        this.horizontalScrollBar.getBoundingClientRect().height
    );

    this.sheetViewportPositions.row.y = calculateSheetViewportEndPosition(
      this.sheetViewportDimensions.height,
      0,
      this.rows
    );

    this.sheetViewportPositions.col.y = calculateSheetViewportEndPosition(
      this.sheetViewportDimensions.width,
      0,
      this.cols
    );

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

    this.mainLayer = new Layer();
    this.xStickyLayer = new Layer();
    this.yStickyLayer = new Layer();
    this.xyStickyLayer = new Layer();

    // The order here matters. xy should take precedence above all others
    this.stage.add(this.mainLayer);
    this.stage.add(this.xStickyLayer);
    this.stage.add(this.yStickyLayer);
    this.stage.add(this.xyStickyLayer);

    this.eventEmitter.on(events.scroll.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scrollWheel.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scroll.horizontal, this.onHorizontalScroll);
    this.eventEmitter.on(
      events.scrollWheel.horizontal,
      this.onHorizontalScroll
    );

    this.shapes = {
      cellRect: new Rect({
        ...this.styles.cellRect,
        width: this.options.col.defaultWidth,
        height: this.options.row.defaultHeight,
      }),
      rowHeaderRect: new Rect({
        ...this.rowHeaderDimensions,
        ...this.styles.rowHeader.rect,
      }),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
      frozenGridLine: new Line({
        ...this.styles.frozenGridLine,
      }),
    };

    this.shapes.cellRect.cache();
    this.shapes.rowHeaderRect.cache();
    this.shapes.colHeaderRect.cache();
    this.shapes.frozenGridLine.cache();

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  onHorizontalScroll = () => {
    this.updateViewport();
  };

  onVerticalScroll = () => {
    this.updateViewport();
  };

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.yStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.cols,
      this.eventEmitter
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.xStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.rows,
      this.eventEmitter
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
    let frozenRow: Row | null = null;
    let frozenCol: Col | null = null;
    let sumOfRowHeights = 0;
    let sumOfColWidths = 0;

    for (
      let ri = this.sheetViewportPositions.row.x;
      ri <= this.sheetViewportPositions.row.y;
      ri++
    ) {
      const row = this.rows[ri];

      sumOfRowHeights += row.height;

      if (row.isFrozen && this.options.frozenCells?.row === row.index) {
        frozenRow = row;
      }

      this.drawRowHeader(this.shapes.rowHeaderRect, row);

      for (
        let ci = this.sheetViewportPositions.col.x;
        ci <= this.sheetViewportPositions.col.y;
        ci++
      ) {
        const col = this.cols[ci];

        if (ri === 0) {
          sumOfColWidths += col.width;

          if (col.isFrozen && this.options.frozenCells?.col === col.index) {
            frozenCol = col;
          }

          this.drawColHeader(this.shapes.colHeaderRect, col);
        }

        this.drawCell(this.shapes.cellRect, row, col);
      }
    }

    if (frozenRow) {
      this.drawXFrozenGridLine(frozenRow, sumOfColWidths);
    }

    if (frozenCol) {
      this.drawYFrozenGridLine(frozenCol, sumOfRowHeights);
    }

    this.setPreviousSheetViewportPositions();
  }

  updateViewport() {
    this.destroyOutOfViewportShapes();
    this.drawViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    this.cells.forEach((row, ri) => {
      const rowHeader = this.rowHeaders[ri];

      if (
        rowHeader &&
        !this.hasOverlap(
          rowHeader.getClientRect(),
          this.sheetViewportDimensions
        )
      ) {
        rowHeader.destroy();
        delete this.rowHeaders[ri];
      }

      row.forEach((cell, ci) => {
        if (
          !this.hasOverlap(cell.getClientRect(), this.sheetViewportDimensions)
        ) {
          cell.destroy();

          // this.colHeaders[ci].destroy();

          //  delete this.colHeaders[ci];
          delete this.cells[ri][ci];
        }
      });
    });
  }

  drawViewportShapes() {
    const drawCellsForRow = (row: Row) => {
      this.drawRowHeader(this.shapes.rowHeaderRect, row);

      for (
        let ci = this.sheetViewportPositions.col.x;
        ci <= this.sheetViewportPositions.col.y;
        ci++
      ) {
        const col = this.cols[ci];
        this.drawCell(this.shapes.cellRect, row, col);
      }
    };

    const drawCellsForCol = (col: Col) => {
      this.drawColHeader(this.shapes.colHeaderRect, col);

      for (
        let ri = this.sheetViewportPositions.row.x;
        ri <= this.sheetViewportPositions.row.y;
        ri++
      ) {
        const row = this.rows[ri];
        this.drawCell(this.shapes.cellRect, row, col);
      }
    };

    // Scrolling down
    for (
      let ri = this.sheetViewportPositions.row.y;
      ri > this.previousSheetViewportPositions.row.y;
      ri--
    ) {
      const row = this.rows[ri];

      drawCellsForRow(row);
    }

    // Scrolling up
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri < this.previousSheetViewportPositions.row.x;
      ri++
    ) {
      const row = this.rows[ri];

      drawCellsForRow(row);
    }

    // Scrolling right
    for (
      let ci = this.sheetViewportPositions.col.y;
      ci > this.previousSheetViewportPositions.col.y;
      ci--
    ) {
      const col = this.cols[ci];

      drawCellsForCol(col);
    }

    // Scrolling left
    for (
      let ci = this.sheetViewportPositions.col.x;
      ci < this.previousSheetViewportPositions.col.x;
      ci++
    ) {
      const col = this.cols[ci];

      drawCellsForCol(col);
    }
  }

  drawCell(rect: Rect, row: Row, col: Col) {
    const clone = rect.clone({
      x: this.rowHeaderDimensions.width + col.width * col.index,
      y: this.colHeaderDimensions.height + row.height * row.index,
    }) as Rect;

    if (col.width !== this.options.col.defaultWidth) {
      clone.width(col.width);
    }

    if (row.height !== this.options.row.defaultHeight) {
      clone.width(row.height);
    }

    if (row.isFrozen && col.isFrozen) {
      this.xyStickyLayer.add(clone);
    } else if (row.isFrozen) {
      this.yStickyLayer.add(clone);
    } else if (col.isFrozen) {
      this.xStickyLayer.add(clone);
    } else {
      this.mainLayer.add(clone);
    }

    if (!this.cells[row.index]) {
      this.cells[row.index] = [];
    }

    this.cells[row.index][col.index] = clone;
  }

  drawRowHeader(rect: Rect, row: Row) {
    const height = row.height;
    const y = row.index * height + this.colHeaderDimensions.height;
    const clone = rect.clone({
      y,
      height,
    }) as Rect;

    const text = new Text({
      y,
      text: row.number.toString(),
      ...this.styles.rowHeader.text,
    });

    const midPoints = getHeaderMidPoints(clone, text);

    text.x(midPoints.x);
    text.y(midPoints.y);

    const group = new Group();

    group.add(clone, text);

    if (row.isFrozen) {
      const frozenGroup = new Group();

      frozenGroup.add(clone, text);

      this.xyStickyLayer.add(frozenGroup);
    } else {
      this.xStickyLayer.add(group);
    }

    this.rowHeaders[row.index] = group;
  }

  drawColHeader(rect: Rect, col: Col) {
    const width = col.width;
    const x = col.index * width + this.rowHeaderDimensions.width;

    const text = new Text({
      x,
      text: col.letter,
      ...this.styles.colHeader.text,
    });

    const clone = rect.clone({
      x,
      width,
    }) as Rect;

    const midPoints = getHeaderMidPoints(clone, text);

    text.x(midPoints.x);
    text.y(midPoints.y);

    const group = new Group();

    group.add(clone, text);

    if (col.isFrozen) {
      const frozenGroup = new Group();

      frozenGroup.add(clone, text);

      this.xyStickyLayer.add(frozenGroup);
    } else {
      this.yStickyLayer.add(group);
    }

    this.colHeaders[col.index] = group;
  }

  drawXFrozenGridLine(row: Row, sumOfColWidths: number) {
    const line = new Line({
      ...this.styles.frozenGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        sumOfColWidths + this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
      ],
    });

    line.y((row.index + 1) * row.height);

    this.xyStickyLayer.add(line);
  }

  drawYFrozenGridLine(col: Col, sumOfRowHeights: number) {
    const line = new Line({
      ...this.styles.frozenGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        this.rowHeaderDimensions.width,
        sumOfRowHeights + this.colHeaderDimensions.height,
      ],
    });

    line.x((col.index + 1) * col.width);

    this.xyStickyLayer.add(line);
  }
}

export default Canvas;
