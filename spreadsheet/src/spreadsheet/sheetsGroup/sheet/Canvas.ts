import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
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
import { IRowColSize } from './IRowColSize';

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
  defaultRowHeight: number;
  defaultColWidth: number;
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

interface IGridLineConfig extends LineConfig {}

interface ITopLeftRectConfig extends RectConfig {}

interface ICanvasStyles {
  backgroundColor: string;
  horizontalGridLine: IGridLineConfig;
  verticalGridLine: IGridLineConfig;
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
  sheetViewportStartYPosition: number,
  items: IRowColSize[]
) => {
  let newSheetViewportYPosition = sheetViewportStartYPosition;
  let sumOfSizes = sheetViewportDimensionSize;
  let i = newSheetViewportYPosition - 1;
  let currentItem = items[i];

  while (sumOfSizes >= currentItem?.getSize()) {
    currentItem = items[i];
    const size = currentItem.getSize();

    newSheetViewportYPosition = currentItem.number;

    i++;
    sumOfSizes -= size;
  }

  return newSheetViewportYPosition;
};

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  mainLayer!: Layer;
  verticallyStickyLayer!: Layer;
  horizontallyStickyLayer!: Layer;
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

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultCanvasStyles, params.styles);

    this.rowHeaderDimensions = {
      width: this.styles.rowHeader.rect.width,
      height: params.defaultRowHeight,
    };

    this.colHeaderDimensions = {
      width: params.defaultColWidth,
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
        x: 1,
        get y() {
          // Minus headers
          return calculateSheetViewportEndPosition(
            that.sheetViewportDimensions.height,
            1,
            that.rows
          );
        },
      },
      // Based the x 100 axis of the row
      col: {
        x: 1,
        get y() {
          return calculateSheetViewportEndPosition(
            that.sheetViewportDimensions.width,
            1,
            that.cols
          );
        },
      },
    };

    this.createScrollBars();
    this.drawTopLeftOffsetRect();
    this.drawHeaders();
    this.drawGridLines();
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
    this.verticallyStickyLayer = new Layer();
    this.horizontallyStickyLayer = new Layer();

    // row headers should be behind column headers
    // so we put verticallyStickyLayer last
    this.stage.add(this.mainLayer);
    this.stage.add(this.horizontallyStickyLayer);
    this.stage.add(this.verticallyStickyLayer);

    window.addEventListener('load', this.onLoad);
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.verticallyStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.setSheetViewportPositions,
      this.cols,
      this.eventEmitter
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.horizontallyStickyLayer,
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

    this.verticallyStickyLayer.add(rect);
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
      });

      const text = new Text({
        y,
        text: row.number.toString(),
        ...this.styles.rowHeader.text,
      });

      const midPoints = getHeaderMidPoints(clone, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      this.horizontallyStickyLayer.add(clone);
      this.horizontallyStickyLayer.add(text);
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
      const startCharCode = 'A'.charCodeAt(0);
      const colLetter = String.fromCharCode(startCharCode + i);
      const x = i * width + this.rowHeaderDimensions.width;

      clone = rect.clone({
        x,
        width,
      });

      const text = new Text({
        x,
        text: colLetter,
        ...this.styles.colHeader.text,
      });

      const midPoints = getHeaderMidPoints(clone, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      this.verticallyStickyLayer.add(clone);
      this.verticallyStickyLayer.add(text);
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

    this.rows.forEach((row) => {
      const height = row.height;

      clone = line.clone({
        y: row.number * height,
      });

      this.mainLayer.add(clone);
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

    this.cols.forEach((col) => {
      const width = col.width;

      clone = line.clone({
        x: col.number * width,
      });

      this.mainLayer.add(clone);
    });
  }
}

export default Canvas;
