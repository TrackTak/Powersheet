import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import Row from './Row';
import { merge } from 'lodash';
import { Text, TextConfig } from 'konva/lib/shapes/Text';

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
  row: IRowHeaderConfig;
  col: IColHeaderConfig;
}

const sharedCanvasStyles = {
  gridLine: {
    stroke: '#c6c6c6',
    strokeWidth: 0.6,
  },
  headerRect: {
    fill: '#f4f5f8',
    stroke: '#E6E6E6',
    strokeWidth: 0.6,
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
  },
};

const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  horizontalGridLine: sharedCanvasStyles.gridLine,
  verticalGridLine: sharedCanvasStyles.gridLine,
  col: {
    rect: {
      ...sharedCanvasStyles.headerRect,
      height: 20,
    },
    text: {
      ...sharedCanvasStyles.headerText,
    },
  },
  row: {
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
  container!: HTMLDivElement;
  private stage!: Stage;
  private layer!: Layer;
  private styles: ICanvasStyles;

  constructor(params: IConstructor) {
    this.styles = merge({}, defaultCanvasStyles, params.styles);

    this.create(params.stageConfig);
    this.drawHeaders(params.rows, params.cols);
    this.drawGridLines(params.rows, params.cols);
  }

  create(stageConfig: ICreateStageConfig = {}) {
    const id = 'powersheet-canvas';

    this.container = document.createElement('div');

    this.container.id = id;

    this.stage = new Stage({
      container: this.container,
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    this.layer = new Layer();

    this.stage.add(this.layer);

    this.layer.draw();
  }

  drawHeaders(rows: Row[], cols: Col[]) {
    const colHeaderXOffset = this.styles.row.rect.width;
    const rowHeaderYOffset = this.styles.col.rect.height;

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
      const y = i * row.height + rowHeaderYOffset;
      const height = row.height;

      const rect = new Rect({
        y,
        height,
        ...this.styles.row.rect,
      });

      rect.cache();

      const text = new Text({
        y,
        text: row.number.toString(),
        ...this.styles.row.text,
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
      const x = i * col.width + colHeaderXOffset;
      const width = col.width;

      const rect = new Rect({
        x,
        width,
        ...this.styles.col.rect,
      });

      const text = new Text({
        x,
        text: colLetter,
        ...this.styles.col.text,
      });

      const midPoints = getMidPoints(rect, text);

      text.x(midPoints.x);
      text.y(midPoints.y);

      this.layer.add(rect);
      this.layer.add(text);
    });
  }

  drawGridLines(rows: Row[], cols: Col[]) {
    const rowHeaderXOffset = this.styles.row.rect.width;
    const colHeaderYOffset = this.styles.col.rect.height;

    const getHorizontalGridLine = (y: number) => {
      return new Line({
        ...this.styles.horizontalGridLine,
        points: [
          rowHeaderXOffset,
          colHeaderYOffset,
          this.stage.width(),
          colHeaderYOffset,
        ],
        y,
      });
    };

    const getVerticalGridLine = (x: number) => {
      return new Line({
        ...this.styles.verticalGridLine,
        points: [
          rowHeaderXOffset,
          colHeaderYOffset,
          rowHeaderXOffset,
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
