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

interface IGridLineConfig extends LineConfig {
  frozenStroke: string;
}

interface ICellRect extends RectConfig {}

interface ITopLeftRectConfig extends RectConfig {}

interface ICanvasStyles {
  backgroundColor: string;
  horizontalGridLine: IGridLineConfig;
  verticalGridLine: IGridLineConfig;
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
  gridLine: {
    stroke: '#c6c6c6',
    frozenStroke: 'blue',
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
  horizontalGridLine: sharedCanvasStyles.gridLine,
  verticalGridLine: sharedCanvasStyles.gridLine,
  cellRect: {
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
  private sheetDimensions: IDimensions;
  private rowHeaderDimensions: IDimensions;
  private colHeaderDimensions: IDimensions;
  private sheetViewportDimensions: IDimensions;
  private sheetViewportPositions: ISheetViewportPositions;
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
        get y() {
          // Minus headers
          return calculateSheetViewportEndPosition(
            that.sheetViewportDimensions.height,
            0,
            that.rows
          );
        },
      },
      // Based the x 100 axis of the row
      col: {
        x: 0,
        get y() {
          return calculateSheetViewportEndPosition(
            that.sheetViewportDimensions.width,
            0,
            that.cols
          );
        },
      },
    };

    this.createScrollBars();
    this.drawTopLeftOffsetRect();
    this.drawHeaders();
    this.drawGridLines();
    this.drawCells();
  }

  onLoad = () => {
    this.stage.width(
      window.innerWidth - this.verticalScrollBar.getBoundingClientRect().width
    );
    this.stage.height(
      window.innerHeight -
        this.horizontalScrollBar.getBoundingClientRect().height
    );
  };

  setSheetViewportPositions(sheetViewportPositions: ISheetViewportPositions) {
    this.sheetViewportPositions = sheetViewportPositions;
  }

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

    window.addEventListener('load', this.onLoad);
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.yStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.setSheetViewportPositions,
      this.cols,
      this.eventEmitter
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.xStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.setSheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.rows,
      this.eventEmitter
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
    window.removeEventListener('load', this.onLoad);
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

  drawHeaders() {
    this.drawRowHeaders();
    this.drawColHeaders();
  }

  drawRowHeaders() {
    const rect = new Rect({
      ...this.rowHeaderDimensions,
      ...this.styles.rowHeader.rect,
    });

    rect.cache();

    let clone;

    this.rows.forEach((row, i) => {
      const height = row.height;
      const y = i * height + this.colHeaderDimensions.height;

      clone = rect.clone({
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

      if (row.isFrozen) {
        this.xyStickyLayer.add(clone);
        this.xyStickyLayer.add(text);
      } else {
        this.xStickyLayer.add(clone);
        this.xStickyLayer.add(text);
      }
    });
  }

  drawColHeaders() {
    const rect = new Rect({
      ...this.colHeaderDimensions,
      ...this.styles.colHeader.rect,
    });

    rect.cache();

    let clone;

    this.cols.forEach((col, i) => {
      const width = col.width;
      const x = i * width + this.rowHeaderDimensions.width;

      const text = new Text({
        x,
        text: col.letter,
        ...this.styles.colHeader.text,
      });

      clone = rect.clone({
        x,
        width,
      }) as Rect;

      const midPoints = getHeaderMidPoints(clone, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      if (col.isFrozen) {
        this.xyStickyLayer.add(clone);
        this.xyStickyLayer.add(text);
      } else {
        this.yStickyLayer.add(clone);
        this.yStickyLayer.add(text);
      }
    });
  }

  drawCells() {
    const rect = new Rect({
      ...this.styles.cellRect,
      width: this.options.col.defaultWidth,
      height: this.options.row.defaultHeight,
    });

    let clone;

    this.rows.forEach((row) => {
      this.cols.forEach((col) => {
        clone = rect.clone({
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
      });
    });
  }

  drawGridLines() {
    this.drawHorizontalGridLines();
    this.drawVerticalGridLines();
  }

  drawHorizontalGridLines() {
    const line = new Line({
      ...this.styles.horizontalGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        this.sheetDimensions.width,
        this.colHeaderDimensions.height,
      ],
    });

    let clone;

    this.rows.forEach((row, i) => {
      const height = row.height;

      clone = line.clone({
        y: (i + 1) * height,
      }) as Line;

      if (row.isFrozen) {
        clone.stroke(this.styles.horizontalGridLine.frozenStroke);
        this.xyStickyLayer.add(clone);
      } else {
        this.mainLayer.add(clone);
      }
    });
  }

  drawVerticalGridLines() {
    const line = new Line({
      ...this.styles.verticalGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        this.rowHeaderDimensions.width,
        this.sheetDimensions.height,
      ],
    });

    let clone;

    this.cols.forEach((col, i) => {
      const width = col.width;

      clone = line.clone({
        x: (i + 1) * width,
      }) as Line;

      if (col.isFrozen) {
        clone.stroke(this.styles.verticalGridLine.frozenStroke);
        this.xyStickyLayer.add(clone);
      } else {
        this.mainLayer.add(clone);
      }
    });
  }
}

export default Canvas;
