import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import Row from './Row';
import { merge, throttle } from 'lodash';
import { Text, TextConfig } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import events from '../../events';

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

interface ICanvasStyles {
  backgroundColor: string;
  horizontalGridLine: IGridLineConfig;
  verticalGridLine: IGridLineConfig;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
}

interface IHeaderDimensions {
  width: number;
  height: number;
}

interface ISheetDimensions {
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

const padding = 5;

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  mainLayer!: Layer;
  scrollLayer!: Layer;
  private styles: ICanvasStyles;
  private verticalScrollBar!: Rect;
  private horizontalScrollBar!: Rect;
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

    this.create(params.stageConfig);
    this.drawHeaders(params.rows, params.cols);
    this.drawGridLines(params.rows, params.cols);
    this.drawScrollBars();

    console.log(this.verticalScrollBar.width());

    this.sheetDimensions = {
      width: params.cols.reduce(
        (currentWidth, col) => this.getWidthFromCol(col) + currentWidth,
        0
      ),
      height: 3000,
    };
  }

  getWidthFromCol(col: Col) {
    return col.width ? col.width : this.colHeaderDimensions.width;
  }

  getHeightFromRow(row: Row) {
    return row.height ? row.height : this.rowHeaderDimensions.height;
  }

  create(stageConfig: ICreateStageConfig = {}) {
    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`);

    this.stage = new Stage({
      container: this.container,
      width: window.innerWidth - 100,
      height: window.innerHeight - 100,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    this.mainLayer = new Layer();
    this.scrollLayer = new Layer();

    this.stage.add(this.mainLayer);
    this.stage.add(this.scrollLayer);

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const dx = e.evt.deltaX;
      const dy = e.evt.deltaY;

      const minX = -(this.sheetDimensions.width - this.stage.width());
      const maxX = 0;

      const x = Math.max(minX, Math.min(this.mainLayer.x() - dx, maxX));

      const minY = -(this.sheetDimensions.height - this.stage.height());
      const maxY = 0;

      const y = Math.max(minY, Math.min(this.mainLayer.y() - dy, maxY));
      this.mainLayer.position({ x, y });

      const availableHeight =
        this.stage.height() - padding * 2 - this.verticalScrollBar.height();
      const vy =
        (this.mainLayer.y() /
          (-this.sheetDimensions.height + this.stage.height())) *
          availableHeight +
        padding;
      this.verticalScrollBar.y(vy);

      const availableWidth =
        this.stage.width() - padding * 2 - this.horizontalScrollBar.width();

      const hx =
        (this.mainLayer.x() /
          (-this.sheetDimensions.width + this.stage.width())) *
          availableWidth +
        padding;
      this.horizontalScrollBar.x(hx);
    });
  }

  drawScrollBars() {
    this.drawHorizontalScrollBar();
    this.drawVerticalScrollBar();
  }

  drawHorizontalScrollBar() {
    this.horizontalScrollBar = new Rect({
      width: 100,
      height: 10,
      fill: 'grey',
      opacity: 0.8,
      x: padding,
      y: this.stage.height() - padding - 10,
      draggable: true,
      dragBoundFunc: (pos) => {
        pos.x = Math.max(
          Math.min(
            pos.x,
            this.stage.width() - this.horizontalScrollBar.width() - padding
          ),
          padding
        );
        pos.y = this.stage.height() - padding - 10;

        return pos;
      },
    });

    this.scrollLayer.add(this.horizontalScrollBar);

    this.horizontalScrollBar.on('dragmove', () => {
      const availableWidth =
        this.stage.width() - padding * 2 - this.horizontalScrollBar.width();

      var delta = (this.horizontalScrollBar.x() - padding) / availableWidth;

      this.mainLayer.x(
        -(this.sheetDimensions.width - this.stage.width()) * delta
      );
    });
  }

  drawVerticalScrollBar() {
    this.verticalScrollBar = new Rect({
      width: 10,
      height: 100,
      fill: 'grey',
      opacity: 0.8,
      x: this.stage.width() - padding - 10,
      y: padding,
      draggable: true,
      dragBoundFunc: (pos) => {
        pos.x = this.stage.width() - padding - 10;
        pos.y = Math.max(
          Math.min(
            pos.y,
            this.stage.height() - this.verticalScrollBar.height() - padding
          ),
          padding
        );
        return pos;
      },
    });

    this.scrollLayer.add(this.verticalScrollBar);

    this.verticalScrollBar.on('dragmove', () => {
      const availableHeight =
        this.stage.height() - padding * 2 - this.verticalScrollBar.height();
      const delta = (this.verticalScrollBar.y() - padding) / availableHeight;

      this.mainLayer.y(
        -(this.sheetDimensions.height - this.stage.height()) * delta
      );
    });
  }

  destroy() {
    this.stage.destroy();
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

      this.mainLayer.add(clone);
      this.mainLayer.add(text);
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

      this.mainLayer.add(clone);
      this.mainLayer.add(text);
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
