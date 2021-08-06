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
import { KonvaEventObject } from 'konva/lib/Node';

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

interface ICanvasStyles {
  backgroundColor: string;
  sheet: RectConfig;
  gridLine: LineConfig;
  frozenGridLine: LineConfig;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
  topLeftRect: RectConfig;
  selector: RectConfig;
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
  sheet: Rect;
  rowHeaderRect: Rect;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
  selector: Rect;
}

const sharedCanvasStyles = {
  gridLine: {
    strokeWidth: 0.6,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
    listening: false,
    perfectDrawEnabled: false,
  },
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

const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  sheet: {
    opacity: 0,
  },
  selector: {
    stroke: 'blue',
  },
  frozenGridLine: {
    ...sharedCanvasStyles.gridLine,
    stroke: 'blue',
  },
  gridLine: {
    ...sharedCanvasStyles.gridLine,
    stroke: '#c6c6c6',
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

  while (sumOfSizes > 0) {
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
      width:
        params.cols.reduce((currentWidth, col) => col.width + currentWidth, 0) +
        this.rowHeaderDimensions.width,
      height:
        params.rows.reduce(
          (currentHeight, row) => row.height + currentHeight,
          0
        ) + this.colHeaderDimensions.height,
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

    this.shapes.sheet.width(this.sheetViewportDimensions.width);
    this.shapes.sheet.height(this.sheetViewportDimensions.height);

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
      sheet: new Rect({
        ...this.sheetViewportDimensions,
        ...this.styles.sheet,
      }),
      rowHeaderRect: new Rect({
        ...this.rowHeaderDimensions,
        ...this.styles.rowHeader.rect,
      }),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
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

    this.xyStickyLayer.add(this.shapes.sheet);

    this.shapes.rowHeaderRect.cache();
    this.shapes.colHeaderRect.cache();
    this.shapes.xGridLine.cache();
    this.shapes.yGridLine.cache();
    this.shapes.frozenGridLine.cache();

    window.addEventListener('DOMContentLoaded', this.onLoad);

    this.shapes.sheet.on('click', this.onSheetClick);
  }

  onSheetClick = (e: KonvaEventObject<MouseEvent>) => {
    debugger;
    const pos = this.shapes.sheet.getRelativePointerPosition();
    // let colIndex = ???
    let colGroups = this.colGroups;
    let cols = this.cols;
    let widthOfSheet = this.sheetViewportDimensions.width;

    this.mainLayer.add(this.shapes.selector);

    // e.target is a clicked Konva.Shape or current stage if you clicked on empty space
    console.log('clicked on', e.target);
  };

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
    this.shapes.sheet.off('click', this.onSheetClick);
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
      const row = this.rows[ri];

      this.drawRow(row);
    }

    for (
      let ci = this.sheetViewportPositions.col.x;
      ci <= this.sheetViewportPositions.col.y;
      ci++
    ) {
      const col = this.cols[ci];

      this.drawCol(col);
    }

    this.setPreviousSheetViewportPositions();
  }

  updateViewport() {
    this.destroyOutOfViewportShapes();
    this.drawViewportShapes();

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
      let ri = this.sheetViewportPositions.row.y;
      ri > this.previousSheetViewportPositions.row.y;
      ri--
    ) {
      const row = this.rows[ri];

      this.drawRow(row);
    }
    // Scrolling up
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri < this.previousSheetViewportPositions.row.x;
      ri++
    ) {
      const row = this.rows[ri];

      this.drawRow(row);
    }
    // Scrolling right
    for (
      let ci = this.sheetViewportPositions.col.y;
      ci > this.previousSheetViewportPositions.col.y;
      ci--
    ) {
      const col = this.cols[ci];

      this.drawCol(col);
    }
    // Scrolling left
    for (
      let ci = this.sheetViewportPositions.col.x;
      ci < this.previousSheetViewportPositions.col.x;
      ci++
    ) {
      const col = this.cols[ci];

      this.drawCol(col);
    }
  }

  drawRow(row: Row) {
    const rowHeader = this.drawRowHeader(this.shapes.rowHeaderRect, row);
    const xGridLine =
      row.isFrozen && this.options.frozenCells?.row === row.index
        ? this.drawXGridLine(row, this.shapes.frozenGridLine)
        : this.drawXGridLine(row);

    const group = new Group();

    group.add(rowHeader, xGridLine);

    this.rowGroups[row.index] = group;

    if (row.isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.xStickyLayer.add(group);
    }
  }

  drawCol(col: Col) {
    const colHeader = this.drawColHeader(this.shapes.colHeaderRect, col);
    const yGridLine =
      col.isFrozen && this.options.frozenCells?.col === col.index
        ? this.drawYGridLine(col, this.shapes.frozenGridLine)
        : this.drawYGridLine(col);

    const group = new Group();

    group.add(colHeader, yGridLine);

    this.colGroups[col.index] = group;

    if (col.isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.yStickyLayer.add(group);
    }
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

    return group;
  }

  drawXGridLine(row: Row, gridLine = this.shapes.xGridLine) {
    const clone = gridLine.clone({
      points: [
        this.sheetViewportDimensions.x,
        this.sheetViewportDimensions.y,
        this.stage.width(),
        this.sheetViewportDimensions.y,
      ],
    }) as Line;

    clone.y((row.index + 1) * row.height);

    return clone;
  }

  drawYGridLine(col: Col, gridLine = this.shapes.yGridLine) {
    const clone = gridLine.clone({
      points: [
        this.sheetViewportDimensions.x,
        this.sheetViewportDimensions.y,
        this.sheetViewportDimensions.x,
        this.stage.height(),
      ],
    }) as Line;

    clone.x((col.index + 1) * col.width);

    return clone;
  }
}

export default Canvas;
