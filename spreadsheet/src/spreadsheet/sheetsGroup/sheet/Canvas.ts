import { Layer } from 'konva/lib/Layer';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Stage, StageConfig } from 'konva/lib/Stage';
import Col from './Col';
import Row from './Row';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  rows: Row[];
  cols: Col[];
}

class Canvas {
  public container!: HTMLDivElement;
  public stage!: Stage;
  public layer!: Layer;

  constructor(params: IConstructor) {
    this.create(params.stageConfig);
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

    this.stage.container().style.backgroundColor = 'white';

    this.layer = new Layer();

    this.stage.add(this.layer);

    this.layer.draw();
  }

  drawGridLines(rows: Row[], cols: Col[]) {
    const lineConfig: LineConfig = {
      stroke: '#c6c6c6',
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
