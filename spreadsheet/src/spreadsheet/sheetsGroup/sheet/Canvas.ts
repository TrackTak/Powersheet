import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import defaultCanvasStyles from './defaultCanvasStyles';
import Row from './Row';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface ICanvasStyles {
  backgroundColor?: string;
  gridLineStroke?: string;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  canvasStyles?: ICanvasStyles;
  rows: Row[];
  cols: Col[];
}

class Canvas {
  container!: HTMLDivElement;
  private stage!: Stage;
  private layer!: Layer;

  constructor(params: IConstructor) {
    this.create(params.stageConfig, params.canvasStyles);
    this.drawGridLines(params.rows, params.cols);
  }

  create(stageConfig: ICreateStageConfig = {}, canvasStyles?: ICanvasStyles) {
    const id = 'powersheet-canvas';

    this.container = document.createElement('div');

    this.container.id = id;

    this.stage = new Stage({
      container: this.container,
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor =
      canvasStyles?.backgroundColor ?? defaultCanvasStyles?.backgroundColor;

    this.layer = new Layer();

    this.stage.add(this.layer);

    this.layer.draw();
  }

  drawGridLines(rows: Row[], cols: Col[], canvasStyles?: ICanvasStyles) {
    const lineConfig: LineConfig = {
      stroke:
        canvasStyles?.gridLineStroke ?? defaultCanvasStyles.gridLineStroke,
    };

    const getHorizontalGridLine = (y: number) => {
      return new Line({
        ...lineConfig,
        points: [0, 0, this.stage.width(), 0],
        strokeWidth: 0.6,
        y,
      });
    };

    const getVerticalGridLine = (x: number) => {
      return new Line({
        ...lineConfig,
        points: [0, 0, 0, this.stage.height()],
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
