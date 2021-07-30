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
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  rows: Row[];
  cols: Col[];
  defaultRowHeight: number;
  defaultColWidth: number;
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

interface IDimensions {
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

class Canvas {
  scrollContainer!: HTMLDivElement;
  private largeContainer!: HTMLDivElement;
  private container!: HTMLDivElement;
  private stage!: Stage;
  private layer!: Layer;
  private styles: ICanvasStyles;
  private spreadsheetWidth: number;
  private rowHeaderDimensions: IDimensions;
  private colHeaderDimensions: IDimensions;
  private scrollPadding: number;
  private throttledScroll: () => void;

  constructor(params: IConstructor) {
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.scrollPadding = 500;

    this.rowHeaderDimensions = {
      width: this.styles.rowHeader.rect.width,
      height: params.defaultRowHeight,
    };
    this.colHeaderDimensions = {
      width: params.defaultColWidth,
      height: this.styles.colHeader.rect.height,
    };

    this.spreadsheetWidth = params.cols.reduce(
      (currentWidth, col) => this.getWidthFromCol(col) + currentWidth,
      0
    );

    this.throttledScroll = throttle(this.scroll, 75);
    this.create(params.stageConfig);
    this.drawHeaders(params.rows, params.cols);
    this.drawGridLines(params.rows, params.cols);
  }

  getWidthFromCol(col: Col) {
    return col.width ? col.width : this.colHeaderDimensions.width;
  }

  getHeightFromRow(row: Row) {
    return row.height ? row.height : this.rowHeaderDimensions.height;
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
      this.spreadsheetWidth + this.rowHeaderDimensions.width
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
    this.stage.destroy();
  }

  scroll = () => {
    const dx = this.scrollContainer.scrollLeft - this.scrollPadding;
    const dy = this.scrollContainer.scrollTop - this.scrollPadding;
    this.stage.container().style.transform =
      'translate(' + dx + 'px, ' + dy + 'px)';
    this.stage.x(-dx);
    this.stage.y(-dy);
  };

  drawHeaders(rows: Row[], cols: Col[]) {
    this.drawRowHeaders(rows);
    this.drawColHeaders(cols);
  }

  drawRowHeaders(rows: Row[]) {
    const rect = new Rect({
      ...this.rowHeaderDimensions,
      ...this.styles.rowHeader.rect,
    });

    rect.cache();

    let clone;

    rows.forEach((row, i) => {
      const height = this.getHeightFromRow(row);
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

      this.layer.add(clone);
      this.layer.add(text);
    });
  }

  drawColHeaders(cols: Col[]) {
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

      this.layer.add(clone);
      this.layer.add(text);
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

      this.layer.add(clone);
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

      this.layer.add(clone);
    });
  }
}

export default Canvas;
