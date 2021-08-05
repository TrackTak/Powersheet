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
  private sheetDimensions: IDimensions;
  private rowHeaderDimensions: IDimensions;
  private colHeaderDimensions: IDimensions;
  private sheetViewportDimensions: IDimensions;
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

    this.setPreviousSheetViewportPositions();

    const rows = [];
    const cols = [];

    for (
      let index = this.sheetViewportPositions.row.x;
      index <= this.sheetViewportPositions.row.y;
      index++
    ) {
      rows.push(this.rows[index]);
    }

    for (
      let index = this.sheetViewportPositions.col.x;
      index <= this.sheetViewportPositions.col.y;
      index++
    ) {
      cols.push(this.cols[index]);
    }

    this.drawViewport(rows, cols);
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

  updateViewport() {
    this.destroyOutOfViewportShapes();
    this.drawViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    // If the amount scrolled is more than the current viewport cells
    if (
      this.sheetViewportPositions.row.x -
        this.previousSheetViewportPositions.row.x >
        this.cells.length ||
      this.previousSheetViewportPositions.row.y -
        this.sheetViewportPositions.row.y >
        this.cells.length
    ) {
      this.cells.forEach((row) => {
        row.forEach((cell) => {
          cell.destroy();
        });
      });

      this.rowHeaders.forEach((rowHeader) => {
        rowHeader.destroy();
      });

      this.rowHeaders = [];
      this.cells = [];

      return;
    }

    if (
      this.sheetViewportPositions.col.x -
        this.previousSheetViewportPositions.col.x >
        this.cells?.[0]?.length ||
      this.previousSheetViewportPositions.col.y -
        this.sheetViewportPositions.col.y >
        this.cells?.[0]?.length
    ) {
      this.cells.forEach((row) => {
        row.forEach((cell) => {
          cell.destroy();
        });
      });

      this.colHeaders.forEach((colHeader) => {
        colHeader.destroy();
      });

      this.colHeaders = [];
      this.cells = [];

      return;
    }

    // Scrolling down
    for (
      let index = this.previousSheetViewportPositions.row.x;
      index < this.sheetViewportPositions.row.x;
      index++
    ) {
      this.cells[index].forEach((cell) => {
        cell.destroy();
      });
      this.rowHeaders[index].destroy();

      delete this.rowHeaders[index];
      delete this.cells[index];
    }

    // Scrolling up
    for (
      let index = this.previousSheetViewportPositions.row.y;
      index > this.sheetViewportPositions.row.y;
      index--
    ) {
      this.cells[index].forEach((cell) => {
        cell.destroy();
      });
      this.rowHeaders[index].destroy();

      delete this.rowHeaders[index];
      delete this.cells[index];
    }

    // Scrolling right
    for (
      let index = this.previousSheetViewportPositions.col.x;
      index < this.sheetViewportPositions.col.x;
      index++
    ) {
      try {
        this.colHeaders[index].destroy();
      } catch (error) {
        debugger;
      }
      delete this.colHeaders[index];

      this.cells.forEach((row) => {
        const colCell = row[index];

        colCell.destroy();

        delete row[index];
      });
    }

    // Scrolling left
    for (
      let index = this.previousSheetViewportPositions.col.y;
      index > this.sheetViewportPositions.col.y;
      index--
    ) {
      this.colHeaders[index].destroy();
      delete this.colHeaders[index];

      this.cells.forEach((row) => {
        const colCell = row[index];

        colCell.destroy();

        delete row[index];
      });
    }
  }

  drawViewportShapes = () => {
    const cellRect = new Rect({
      ...this.styles.cellRect,
      width: this.options.col.defaultWidth,
      height: this.options.row.defaultHeight,
    });
    const rowHeaderRect = new Rect({
      ...this.rowHeaderDimensions,
      ...this.styles.rowHeader.rect,
    });
    const colHeaderRect = new Rect({
      ...this.colHeaderDimensions,
      ...this.styles.colHeader.rect,
    });

    cellRect.cache();
    rowHeaderRect.cache();
    colHeaderRect.cache();

    // Scrolling down
    for (
      let ri = this.sheetViewportPositions.row.y;
      ri > this.previousSheetViewportPositions.row.y;
      ri--
    ) {
      const row = this.rows[ri];

      const rowHeader = this.drawRowHeader(rowHeaderRect, row);

      this.rowHeaders[ri] = rowHeader;

      const cells: Rect[] = [];

      for (
        let ci = this.sheetViewportPositions.col.x;
        ci <= this.sheetViewportPositions.col.y;
        ci++
      ) {
        const col = this.cols[ci];
        const cell = this.drawCell(cellRect, row, col);

        cells[ci] = cell;
      }

      this.cells[ri] = cells;
    }

    // Scrolling up
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri < this.previousSheetViewportPositions.row.x;
      ri++
    ) {
      const row = this.rows[ri];

      const rowHeader = this.drawRowHeader(rowHeaderRect, row);

      this.rowHeaders[ri] = rowHeader;

      const cells: Rect[] = [];

      for (
        let ci = this.sheetViewportPositions.col.x;
        ci <= this.sheetViewportPositions.col.y;
        ci++
      ) {
        const col = this.cols[ci];
        const cell = this.drawCell(cellRect, row, col);

        cells[ci] = cell;
      }

      this.cells[ri] = cells;
    }

    // Scrolling right
    for (
      let ci = this.sheetViewportPositions.col.y;
      ci > this.previousSheetViewportPositions.col.y;
      ci--
    ) {
      const col = this.cols[ci];

      const colHeader = this.drawColHeader(colHeaderRect, col);

      this.colHeaders[ci] = colHeader;

      for (
        let ri = this.sheetViewportPositions.row.x;
        ri <= this.sheetViewportPositions.row.y;
        ri++
      ) {
        const row = this.rows[ri];
        const cell = this.drawCell(cellRect, row, col);

        this.cells[ri][ci] = cell;
      }
    }

    // Scrolling left
    for (
      let ci = this.sheetViewportPositions.col.x;
      ci < this.previousSheetViewportPositions.col.x;
      ci++
    ) {
      const col = this.cols[ci];

      const colHeader = this.drawColHeader(colHeaderRect, col);

      this.colHeaders[ci] = colHeader;

      for (
        let ri = this.sheetViewportPositions.row.x;
        ri <= this.sheetViewportPositions.row.y;
        ri++
      ) {
        const row = this.rows[ri];
        const cell = this.drawCell(cellRect, row, col);

        this.cells[ri][ci] = cell;
      }
    }
  };

  drawViewport(rows: Row[], cols: Col[]) {
    const cellRect = new Rect({
      ...this.styles.cellRect,
      width: this.options.col.defaultWidth,
      height: this.options.row.defaultHeight,
    });
    const line = new Line({
      ...this.styles.frozenGridLine,
    });
    const rowHeaderRect = new Rect({
      ...this.rowHeaderDimensions,
      ...this.styles.rowHeader.rect,
    });
    const colHeaderRect = new Rect({
      ...this.colHeaderDimensions,
      ...this.styles.colHeader.rect,
    });

    cellRect.cache();
    rowHeaderRect.cache();
    colHeaderRect.cache();
    line.cache();

    let sumOfRowHeights = 0;
    let sumOfColWidths = 0;

    let frozenRow: Row | null = null;
    let frozenCol: Col | null = null;

    cols.forEach((col) => {
      const colHeader = this.drawColHeader(colHeaderRect, col);

      this.colHeaders.push(colHeader);

      sumOfColWidths += col.width;

      if (col.isFrozen && this.options.frozenCells?.col === col.index) {
        frozenCol = col;
      }
    });

    rows.forEach((row) => {
      const rowHeader = this.drawRowHeader(rowHeaderRect, row);

      this.rowHeaders.push(rowHeader);

      sumOfRowHeights += row.height;

      if (row.isFrozen && this.options.frozenCells?.row === row.index) {
        frozenRow = row;
      }

      const rowCells: Rect[] = [];

      cols.forEach((col) => {
        const cell = this.drawCell(cellRect, row, col);

        rowCells.push(cell);
      });

      this.cells.push(rowCells);
    });

    if (frozenRow) {
      this.drawXFrozenGridLine(frozenRow, sumOfColWidths);
    }

    if (frozenCol) {
      this.drawYFrozenGridLine(frozenCol, sumOfRowHeights);
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

    if (row.isFrozen) {
      this.yStickyLayer.add(clone);
    } else if (col.isFrozen) {
      this.xStickyLayer.add(clone);
    } else {
      this.mainLayer.add(clone);
    }

    return clone;
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
      this.xyStickyLayer.add(group);
    } else {
      this.xStickyLayer.add(group);
    }

    return group;
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
      this.xyStickyLayer.add(group);
    } else {
      this.yStickyLayer.add(group);
    }

    return group;
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
