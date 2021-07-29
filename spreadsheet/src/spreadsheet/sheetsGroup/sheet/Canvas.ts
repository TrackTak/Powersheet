import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import Row from './Row';
import { merge, throttle } from 'lodash';
import { Text, TextConfig } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import styles from './Canvas.module.scss';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  colHeaderConfig?: IColHeaderConfig;
  rowHeaderConfig?: IRowHeaderConfig;
  rows: Row[];
  cols: Col[];
}

interface IColHeaderRectConfig extends RectConfig {
  height: number;
}

interface IRowHeaderRectConfig extends RectConfig {
  width: number;
}

interface IColHeaderConfig {
  rect: IColHeaderRectConfig;
  text: TextConfig;
}

interface IRowHeaderConfig {
  rect: IRowHeaderRectConfig;
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

const sharedCanvasStyles = {
  gridLine: {
    stroke: '#c6c6c6',
    strokeWidth: 0.6,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
  },
  headerRect: {
    fill: '#f4f5f8',
    stroke: '#E6E6E6',
    strokeWidth: 0.6,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
  },
};

const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  horizontalGridLine: sharedCanvasStyles.gridLine,
  verticalGridLine: sharedCanvasStyles.gridLine,
  colHeader: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      height: 20,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
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
};

class Canvas {
  scrollContainer!: HTMLDivElement;
  private largeContainer!: HTMLDivElement;
  private container!: HTMLDivElement;
  private stage!: Stage;
  private layer!: Layer;
  private styles: ICanvasStyles;
  private spreadsheetWidth: number;
  private rowHeaderWidth: number;
  private colHeaderHeight: number;
  private scrollPadding: number;
  private throttledScroll: () => void;

  constructor(params: IConstructor) {
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.scrollPadding = 500;

    this.spreadsheetWidth = params.cols.reduce(
      (currentWidth, col) => col.width + currentWidth,
      0
    );

    this.rowHeaderWidth = this.styles.rowHeader.rect.width;
    this.colHeaderHeight = this.styles.colHeader.rect.height;

    this.throttledScroll = throttle(this.scroll, 75);
    this.create(params.stageConfig);
    this.drawHeaders(params.rows, params.cols);
    this.drawGridLines(params.rows, params.cols);
  }

  create(stageConfig: ICreateStageConfig = {}) {
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.classList.add(
      `${prefix}-canvas-scroll-container`,
      styles.scrollContainer
    );

    this.largeContainer = document.createElement('div');
    this.largeContainer.classList.add(
      `${prefix}-canvas-large-container`,
      styles.largeContainer
    );

    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`);

    this.scrollContainer.appendChild(this.largeContainer);
    this.largeContainer.appendChild(this.container);

    this.largeContainer.style.width = `${
      this.spreadsheetWidth + this.rowHeaderWidth
    }px`;

    this.stage = new Stage({
      container: this.container,
      width: window.innerWidth + this.scrollPadding * 2,
      height: window.innerHeight + this.scrollPadding * 2,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    this.layer = new Layer();

    this.stage.add(this.layer);

    this.scrollContainer.addEventListener('scroll', this.throttledScroll);

    this.layer.draw();
  }

  destroy() {
    this.scrollContainer.removeEventListener('scroll', this.throttledScroll);
  }

  scroll() {
    const dx = this.scrollContainer.scrollLeft - this.scrollPadding;
    const dy = this.scrollContainer.scrollTop - this.scrollPadding;

    this.stage.container().style.transform =
      'translate(' + dx + 'px, ' + dy + 'px)';

    this.stage.x(-dx);
    this.stage.y(-dy);
  }

  drawHeaders(rows: Row[], cols: Col[]) {
    const getMidPoints = (rect: Rect, text: Text) => {
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

    rows.forEach((row, i) => {
      const y = i * row.height + this.colHeaderHeight;
      const height = row.height;

      const rect = new Rect({
        y,
        height,
        ...this.styles.rowHeader.rect,
      });

      const text = new Text({
        y,
        text: row.number.toString(),
        ...this.styles.rowHeader.text,
      });

      const midPoints = getMidPoints(rect, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      this.layer.add(rect);
      this.layer.add(text);
    });

    cols.forEach((col, i) => {
      const startCharCode = 'A'.charCodeAt(0);
      const colLetter = String.fromCharCode(startCharCode + i);
      const x = i * col.width + this.rowHeaderWidth;
      const width = col.width;

      const rect = new Rect({
        x,
        width,
        ...this.styles.colHeader.rect,
      });

      const text = new Text({
        x,
        text: colLetter,
        ...this.styles.colHeader.text,
      });

      const midPoints = getMidPoints(rect, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      this.layer.add(rect);
      this.layer.add(text);
    });
  }

  drawGridLines(rows: Row[], cols: Col[]) {
    const getHorizontalGridLine = (y: number) => {
      return new Line({
        ...this.styles.horizontalGridLine,
        points: [
          this.rowHeaderWidth,
          this.colHeaderHeight,
          this.stage.width(),
          this.colHeaderHeight,
        ],
        y,
      });
    };

    const getVerticalGridLine = (x: number) => {
      return new Line({
        ...this.styles.verticalGridLine,
        points: [
          this.rowHeaderWidth,
          this.colHeaderHeight,
          this.rowHeaderWidth,
          this.stage.height(),
        ],
        x,
      });
    };

    rows.forEach((row) => {
      const horizontalGridLine = getHorizontalGridLine(row.number * row.height);

      this.layer.add(horizontalGridLine);
    });

    cols.forEach((col) => {
      const verticalGridLine = getVerticalGridLine(col.number * col.width);

      this.layer.add(verticalGridLine);
    });
  }
}

export default Canvas;
