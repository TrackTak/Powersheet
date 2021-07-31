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

export interface IHeaderDimensions {
  width: number;
  height: number;
}

export interface ISheetDimensions {
  width: number;
  height: number;
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

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  mainLayer!: Layer;
  verticallyStickyLayer!: Layer;
  horizontallyStickyLayer!: Layer;
  private horizontalScrollBar!: HorizontalScrollBar;
  private verticalScrollBar!: VerticalScrollBar;
  private styles: ICanvasStyles;
  private sheetDimensions!: ISheetDimensions;
  private rowHeaderDimensions: IHeaderDimensions;
  private colHeaderDimensions: IHeaderDimensions;
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
      width: params.cols.reduce(
        (currentWidth, col) => this.getWidthFromCol(col) + currentWidth,
        0
      ),
      height: params.rows.reduce(
        (currentHeight, row) => this.getHeightFromRow(row) + currentHeight,
        0
      ),
    };

    this.create(params.stageConfig);
    this.createScrollBars();
    this.drawTopLeftOffsetRect();
    this.drawHeaders(params.rows, params.cols);
    this.drawGridLines(params.rows, params.cols);
  }

  getWidthFromCol(col: Col) {
    return col.width ? col.width : this.colHeaderDimensions.width;
  }

  getHeightFromRow(row: Row) {
    return row.height ? row.height : this.rowHeaderDimensions.height;
  }

  private create(stageConfig: ICreateStageConfig = {}) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`, styles.canvas);

    this.stage = new Stage({
      container: this.container,
      width,
      height,
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
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.verticallyStickyLayer,
      this.sheetDimensions,
      this.rowHeaderDimensions
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.horizontallyStickyLayer,
      this.sheetDimensions,
      this.colHeaderDimensions,
      this.horizontalScrollBar.getBoundingClientRect
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
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

  drawHeaders(rows: Row[], cols: Col[]) {
    this.drawRowHeaders(rows);
    this.drawColHeaders(cols);
  }

  drawRowHeaders(rows: Row[]) {
    const startOffset = this.colHeaderDimensions.height;

    const rect = new Rect({
      ...this.rowHeaderDimensions,
      ...this.styles.rowHeader.rect,
    });

    rect.cache();

    let clone;

    rows.forEach((row, i) => {
      const height = this.getHeightFromRow(row);
      const y = i * height + startOffset;

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

  drawColHeaders(cols: Col[]) {
    const startOffset = this.rowHeaderDimensions.width;
    const rect = new Rect({
      ...this.colHeaderDimensions,
      ...this.styles.colHeader.rect,
    });

    rect.cache();

    let clone;

    cols.forEach((col, i) => {
      const width = this.getWidthFromCol(col);
      const startCharCode = 'A'.charCodeAt(0);
      const colLetter = String.fromCharCode(startCharCode + i);
      const x = i * width + startOffset;

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

  drawGridLines(rows: Row[], cols: Col[]) {
    this.drawHorizontalGridLines(rows);
    this.drawVerticalGridLines(cols);
  }

  drawHorizontalGridLines(rows: Row[]) {
    const line = new Line({
      ...this.styles.horizontalGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        this.stage.width(),
        this.colHeaderDimensions.height,
      ],
    });

    let clone;

    rows.forEach((row) => {
      const height = this.getHeightFromRow(row);

      clone = line.clone({
        y: row.number * height,
      });

      this.mainLayer.add(clone);
    });
  }

  drawVerticalGridLines(cols: Col[]) {
    const line = new Line({
      ...this.styles.verticalGridLine,
      points: [
        this.rowHeaderDimensions.width,
        this.colHeaderDimensions.height,
        this.rowHeaderDimensions.width,
        this.stage.height(),
      ],
    });

    let clone;

    cols.forEach((col) => {
      const width = this.getWidthFromCol(col);

      clone = line.clone({
        x: col.number * width,
      });

      this.mainLayer.add(clone);
    });
  }
}

export default Canvas;
