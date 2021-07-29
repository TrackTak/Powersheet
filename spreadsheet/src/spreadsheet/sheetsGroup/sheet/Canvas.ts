import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import defaultCanvasStyles, { ICanvasStyles } from './defaultCanvasStyles';
import Row from './Row';

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

interface IColHeaderConfig extends RectConfig {}
interface IRowHeaderConfig extends RectConfig {}

const defaultColHeaderConfig = {
  fill: '#f4f5f8',
  height: 20,
};

const defaultRowHeaderConfig = {
  fill: '#f4f5f8',
  width: 25,
};

class Canvas {
  container!: HTMLDivElement;
  private stage!: Stage;
  private layer!: Layer;
  private styles!: ICanvasStyles;

  constructor(params: IConstructor) {
    this.styles = {
      ...defaultCanvasStyles,
      ...params.styles,
    };

    this.create(params.stageConfig);
    this.drawHeaders(
      params.rows,
      params.cols,
      params.rowHeaderConfig,
      params.colHeaderConfig
    );
    this.drawGridLines(
      params.rows,
      params.cols,
      params.colHeaderConfig?.rowWidth,
      params.colHeaderConfig?.colHeight
    );
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

  drawHeaders(
    rows: Row[],
    cols: Col[],
    rowHeaderConfig: IColHeaderConfig = defaultRowHeaderConfig,
    colHeaderConfig: IColHeaderConfig = defaultColHeaderConfig
  ) {
    const getRowHeader = (y: number, height: number) => {
      return new Rect({
        y,
        height,
        ...rowHeaderConfig,
      });
    };

    const getColHeader = (x: number, width: number) => {
      return new Rect({
        x,
        width,
        ...colHeaderConfig,
      });
    };

    rows.forEach((row, i) => {
      const header = getRowHeader(i * row.height, row.height);

      this.layer.add(header);
    });

    cols.forEach((col, i) => {
      const header = getColHeader(i * col.width, col.width);

      this.layer.add(header);
    });
  }

  drawGridLines(
    rows: Row[],
    cols: Col[],
    rowHeaderOffset: number = defaultRowHeaderConfig.width,
    colHeaderOffset: number = defaultColHeaderConfig.height
  ) {
    const lineConfig: LineConfig = {
      stroke: this.styles.gridLineStroke,
    };

    const getHorizontalGridLine = (y: number) => {
      return new Line({
        ...lineConfig,
        points: [
          rowHeaderOffset,
          colHeaderOffset,
          this.stage.width(),
          colHeaderOffset,
        ],
        strokeWidth: 0.6,
        y,
      });
    };

    const getVerticalGridLine = (x: number) => {
      return new Line({
        ...lineConfig,
        points: [
          rowHeaderOffset,
          colHeaderOffset,
          rowHeaderOffset,
          this.stage.height(),
        ],
        strokeWidth: 0.6,
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
