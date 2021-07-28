import { Layer } from 'konva/lib/Layer';
import { NodeConfig } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';

interface ICreateParams {
  width?: NodeConfig['width'];
  height?: NodeConfig['height'];
  [index: string]: any;
}

interface IConstructor extends ICreateParams {}

class Canvas {
  public container!: HTMLDivElement;
  public stage!: Stage;
  public layer!: Layer;

  constructor(params: IConstructor = {}) {
    this.create(params);
  }

  create({ width, height, ...stageConfig }: ICreateParams = {}) {
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
}

export default Canvas;
