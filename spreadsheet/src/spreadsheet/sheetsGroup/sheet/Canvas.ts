import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { merge } from 'lodash';
import { Text, TextConfig } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { IOptions } from '../../IOptions';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import events from '../../events';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import { KonvaEventObject } from 'konva/lib/Node';

interface ICreateStageConfig extends Omit<StageConfig, 'container'> {
  container?: HTMLDivElement;
}

interface IConstructor {
  stageConfig?: ICreateStageConfig;
  styles?: Partial<ICanvasStyles>;
  rowHeaderConfig?: IRowHeaderConfig;
  colHeaderConfig?: IColHeaderConfig;
  options: IOptions;
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

interface ICanvasStyles {
  backgroundColor: string;
  resizeLine: LineConfig;
  resizeGuideLine: LineConfig;
  gridLine: LineConfig;
  frozenGridLine: LineConfig;
  rowResizeMarker: RectConfig;
  colResizeMarker: RectConfig;
  rowHeader: IRowHeaderConfig;
  colHeader: IColHeaderConfig;
  topLeftRect: RectConfig;
  selector: RectConfig;
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

interface IShapes {
  sheetGroup: Group;
  sheet: Rect;
  resizeGuideLine: Line;
  rowHeaderResizeLine: Line;
  rowResizeMarker: Rect;
  rowGroup: Group;
  rowHeaderRect: Rect;
  colHeaderResizeLine: Line;
  colResizeMarker: Rect;
  colGroup: Group;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
  selector: Rect;
}

const resizeLineStrokeHitWidth = 8;
const optimizedProperties = {
  shadowForStrokeEnabled: false,
  hitStrokeWidth: 0,
  perfectDrawEnabled: false,
  listening: false,
};

const sharedCanvasStyles = {
  gridLine: {
    ...optimizedProperties,
    stroke: '#c6c6c6',
    strokeWidth: 0.6,
  },
  resizeMarker: {
    ...optimizedProperties,
    fill: '#0057ff',
    opacity: 0.3,
    visible: false,
  },
  headerRect: {
    ...optimizedProperties,
    fill: '#f4f5f8',
    listening: true,
  },
  headerText: {
    ...optimizedProperties,
    fontSize: 12,
    fontFamily: 'Source Sans Pro',
    fill: '#585757',
  },
};

const defaultCanvasStyles: ICanvasStyles = {
  backgroundColor: 'white',
  selector: {
    ...optimizedProperties,
    stroke: '#0057ff',
    fill: '#EDF3FF',
    strokeWidth: 1,
  },
  frozenGridLine: {
    ...sharedCanvasStyles.gridLine,
    stroke: 'blue',
  },
  resizeGuideLine: {
    ...sharedCanvasStyles.gridLine,
    stroke: 'blue',
  },
  rowResizeMarker: {
    ...sharedCanvasStyles.resizeMarker,
    height: resizeLineStrokeHitWidth,
  },
  colResizeMarker: {
    ...sharedCanvasStyles.resizeMarker,
    width: resizeLineStrokeHitWidth,
  },
  resizeLine: {
    ...sharedCanvasStyles.gridLine,
    hitStrokeWidth: resizeLineStrokeHitWidth,
    listening: true,
    draggable: true,
    opacity: 0.7,
  },
  gridLine: {
    ...sharedCanvasStyles.gridLine,
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
    ...optimizedProperties,
    fill: sharedCanvasStyles.headerRect.fill,
  },
};

const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.x + rectOne.width / 2,
    y: rectOne.y + rectOne.height / 2,
  };

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2,
  };

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y,
  };
};

const calculateSheetViewportEndPosition = (
  sheetViewportDimensionSize: number,
  sheetViewportStartYIndex: number,
  defaultSize: number
) => {
  let newSheetViewportYIndex = sheetViewportStartYIndex;
  let sumOfSizes = sheetViewportDimensionSize;
  let i = newSheetViewportYIndex;

  while (sumOfSizes > 0) {
    newSheetViewportYIndex = i;

    i++;
    sumOfSizes -= defaultSize;
  }

  return newSheetViewportYIndex;
};

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  mainLayer!: Layer;
  yStickyLayer!: Layer;
  xStickyLayer!: Layer;
  xyStickyLayer!: Layer;
  horizontalScrollBar!: HorizontalScrollBar;
  verticalScrollBar!: VerticalScrollBar;
  private rowResizeStartPos: Vector2d;
  private rowResizePosition: Vector2d;
  private styles: ICanvasStyles;
  private rowGroups: Group[];
  private colGroups: Group[];
  private shapes!: IShapes;
  private sheetDimensions: IDimensions;
  private rowHeaderDimensions: IDimensions;
  private colHeaderDimensions: IDimensions;
  private sheetViewportDimensions: IRect;
  private sheetViewportPositions: ISheetViewportPositions;
  private previousSheetViewportPositions!: ISheetViewportPositions;
  private eventEmitter: EventEmitter;
  private options: IOptions;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;
    this.styles = merge({}, defaultCanvasStyles, params.styles);
    this.options = params.options;

    this.rowHeaderDimensions = {
      width: this.styles.rowHeader.rect.width,
      height: this.options.row.defaultHeight,
    };

    this.colHeaderDimensions = {
      width: this.options.col.defaultWidth,
      height: this.styles.colHeader.rect.height,
    };

    this.sheetDimensions = {
      get width() {
        const widths = Object.values(that.options.col.widths ?? {});

        const totalWidthsDifference = widths.reduce((currentWidth, width) => {
          return width - that.options.col.defaultWidth + currentWidth;
        }, 0);

        return (
          that.options.numberOfCols * that.options.col.defaultWidth +
          totalWidthsDifference +
          that.rowHeaderDimensions.width
        );
      },
      get height() {
        const heights = Object.values(that.options.row.heights ?? {});

        const totalHeightsDifference = heights.reduce(
          (currentHeight, height) => {
            return height - that.options.row.defaultHeight + currentHeight;
          },
          0
        );

        return (
          that.options.numberOfRows * that.options.row.defaultHeight +
          totalHeightsDifference +
          that.colHeaderDimensions.height
        );
      },
    };

    this.rowResizeStartPos = {
      x: 0,
      y: 0,
    };

    this.rowResizePosition = {
      x: 0,
      y: 0,
    };

    this.rowGroups = [];
    this.colGroups = [];

    const that = this;

    this.sheetViewportDimensions = {
      x: that.rowHeaderDimensions.width,
      y: that.colHeaderDimensions.height,
      get width() {
        return that.stage.width() - that.rowHeaderDimensions.width;
      },
      get height() {
        return that.stage.height() - that.colHeaderDimensions.height;
      },
    };

    this.create(params.stageConfig);

    this.sheetViewportPositions = {
      // Based on the y 100% axis of the row
      row: {
        x: 0,
        y: 0,
      },
      // Based the x 100 axis of the row
      col: {
        x: 0,
        y: 0,
      },
    };

    this.setPreviousSheetViewportPositions();

    this.createScrollBars();
    this.drawTopLeftOffsetRect();
  }

  setPreviousSheetViewportPositions() {
    this.previousSheetViewportPositions = {
      row: {
        ...this.sheetViewportPositions.row,
      },
      col: {
        ...this.sheetViewportPositions.col,
      },
    };
  }

  onLoad = () => {
    this.stage.width(
      window.innerWidth - this.verticalScrollBar.getBoundingClientRect().width
    );
    this.stage.height(
      window.innerHeight -
        this.horizontalScrollBar.getBoundingClientRect().height
    );

    this.sheetViewportPositions.row.y = calculateSheetViewportEndPosition(
      this.sheetViewportDimensions.height,
      0,
      this.options.row.defaultHeight
    );

    this.sheetViewportPositions.col.y = calculateSheetViewportEndPosition(
      this.sheetViewportDimensions.width,
      0,
      this.options.col.defaultWidth
    );

    this.shapes.sheetGroup.setAttrs({
      x: this.sheetViewportDimensions.x,
      y: this.sheetViewportDimensions.y,
    });

    this.shapes.sheet.setAttrs({
      width: this.sheetViewportDimensions.width,
      height: this.sheetViewportDimensions.height,
    });

    this.initializeViewport();
  };

  private create(stageConfig: ICreateStageConfig = {}) {
    this.container = document.createElement('div');
    this.container.classList.add(`${prefix}-canvas`, styles.canvas);

    this.stage = new Stage({
      container: this.container,
      ...stageConfig,
    });

    this.stage.container().style.backgroundColor = this.styles.backgroundColor;

    this.xStickyLayer = new Layer();
    this.yStickyLayer = new Layer();
    this.xyStickyLayer = new Layer();
    this.mainLayer = new Layer();

    // The order here matters
    this.stage.add(this.xStickyLayer);
    this.stage.add(this.yStickyLayer);
    this.stage.add(this.xyStickyLayer);
    this.stage.add(this.mainLayer);

    this.eventEmitter.on(events.scroll.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scrollWheel.vertical, this.onVerticalScroll);
    this.eventEmitter.on(events.scroll.horizontal, this.onHorizontalScroll);
    this.eventEmitter.on(
      events.scrollWheel.horizontal,
      this.onHorizontalScroll
    );

    this.shapes = {
      sheetGroup: new Group({
        ...optimizedProperties,
        listening: true,
      }),
      sheet: new Rect({
        ...optimizedProperties,
        listening: true,
        opacity: 0,
      }),
      rowResizeMarker: new Rect({
        width: this.rowHeaderDimensions.width,
        ...this.styles.rowResizeMarker,
      }),
      resizeGuideLine: new Line({
        ...this.styles.resizeGuideLine,
      }),
      rowHeaderResizeLine: new Line({
        ...this.styles.resizeLine,
      }),
      rowHeaderRect: new Rect({
        ...this.rowHeaderDimensions,
        ...this.styles.rowHeader.rect,
      }),
      rowGroup: new Group(),
      colResizeMarker: new Rect({
        height: this.colHeaderDimensions.height,
        ...this.styles.rowResizeMarker,
      }),
      colHeaderResizeLine: new Line({
        ...this.styles.resizeLine,
      }),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
      colGroup: new Group(),
      xGridLine: new Line({
        ...this.styles.gridLine,
      }),
      yGridLine: new Line({
        ...this.styles.gridLine,
      }),
      frozenGridLine: new Line({
        ...this.styles.frozenGridLine,
      }),
      selector: new Rect({
        ...this.styles.selector,
      }),
    };
    this.shapes.sheetGroup.add(this.shapes.sheet);

    this.mainLayer.add(this.shapes.rowResizeMarker);
    this.mainLayer.add(this.shapes.colResizeMarker);
    this.mainLayer.add(this.shapes.resizeGuideLine);
    this.xyStickyLayer.add(this.shapes.sheetGroup);

    this.shapes.rowGroup.cache(this.rowHeaderDimensions);
    this.shapes.colGroup.cache(this.colHeaderDimensions);
    this.shapes.rowHeaderRect.cache();
    this.shapes.colHeaderRect.cache();
    this.shapes.rowHeaderResizeLine.cache();
    this.shapes.colHeaderResizeLine.cache();
    this.shapes.xGridLine.cache();
    this.shapes.yGridLine.cache();
    this.shapes.frozenGridLine.cache();

    window.addEventListener('DOMContentLoaded', this.onLoad);

    this.shapes.sheetGroup.on('click', this.sheetOnClick);
    this.shapes.rowHeaderResizeLine.on(
      'dragstart',
      this.rowHeaderResizeLineDragStart
    );
    this.shapes.rowHeaderResizeLine.on(
      'dragmove',
      this.rowHeaderResizeLineDragMove
    );
    this.shapes.rowHeaderResizeLine.on(
      'dragend',
      this.rowHeaderResizeLineDragEnd
    );
    this.shapes.rowHeaderResizeLine.on(
      'mousedown',
      this.rowHeaderResizeLineOnMousedown
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseover',
      this.rowHeaderResizeLineOnMouseover
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseout',
      this.rowHeaderResizeLineOnMouseout
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseup',
      this.rowHeaderResizeLineOnMouseup
    );
  }

  showRowResizeMarker(target: Line) {
    document.body.style.cursor = 'row-resize';

    this.shapes.rowResizeMarker.y(
      target.parent!.y() + target.y() - this.shapes.rowResizeMarker.height()
    );
    this.shapes.rowResizeMarker.show();
  }

  hideRowResizeMarker() {
    this.shapes.rowResizeMarker.hide();
  }

  showRowGuideLine(target: Line) {
    this.shapes.resizeGuideLine.y(target.parent!.y() + target.y());
    this.shapes.resizeGuideLine.points([
      this.sheetViewportDimensions.x,
      0,
      this.stage.width(),
      0,
    ]);
    this.shapes.resizeGuideLine.show();
  }

  hideRowGuideLine() {
    this.shapes.resizeGuideLine.hide();
  }

  resizeRow(ri: number, newHeight: number) {
    const height =
      this.options.row.heights?.[ri] ?? this.options.row.defaultHeight;
    const heightChange = newHeight - height;

    if (heightChange !== 0) {
      this.options.row.heights = {
        ...this.options.row.heights,
        [ri]: newHeight,
      };

      this.drawRow(ri);

      for (let index = ri + 1; index < this.rowGroups.length; index++) {
        const row = this.rowGroups[index];
        const newY = row.y() + heightChange;

        row.y(newY);
      }
    }
  }

  rowHeaderResizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this.rowResizeStartPos = e.target.getPosition();
  };

  rowHeaderResizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line;
    const { x, y } = target.getPosition();
    const minHeight = this.options.row.minHeight;
    let newY = y;

    if (y <= minHeight) {
      newY = minHeight;
      target.setPosition({
        y: newY,
        x,
      });
    }

    this.rowResizePosition = {
      x,
      y: newY,
    };

    this.showRowResizeMarker(target);
    this.showRowGuideLine(target);

    // Stops moving this element completely
    target.setPosition(this.rowResizeStartPos);
  };

  rowHeaderResizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    document.body.style.cursor = 'default';

    const target = e.target as Line;
    const ri = target.parent!.attrs.index;

    const { y } = this.rowResizePosition;
    const minHeight = this.options.row.minHeight;

    this.hideRowGuideLine();
    this.hideRowResizeMarker();

    if (y >= minHeight) {
      this.resizeRow(ri, y);
    }
  };

  rowHeaderResizeLineOnMousedown = (e: KonvaEventObject<Event>) => {
    const target = e.target as Line;

    this.showRowGuideLine(target);
  };

  rowHeaderResizeLineOnMouseup = () => {
    this.hideRowGuideLine();
  };

  rowHeaderResizeLineOnMouseover = (e: KonvaEventObject<Event>) => {
    const target = e.target as Line;

    this.showRowResizeMarker(target);
  };

  rowHeaderResizeLineOnMouseout = () => {
    document.body.style.cursor = 'default';

    this.hideRowResizeMarker();
  };

  sheetOnClick = () => {
    this.setCellSelected();
  };

  setCellSelected() {
    const pos = this.shapes.sheet.getRelativePointerPosition();
    const xSheetPos = Math.floor(pos.x / this.options.col.defaultWidth);
    const ySheetPos = Math.floor(pos.y / this.options.row.defaultHeight);
    const rowXPosition = this.sheetViewportPositions.row.x + ySheetPos;
    const colXPosition = this.sheetViewportPositions.col.x + xSheetPos;

    const x = colXPosition * this.options.col.defaultWidth;
    const y = rowXPosition * this.options.row.defaultHeight;

    this.shapes.selector.x(x + this.rowHeaderDimensions.width);
    this.shapes.selector.y(y + this.colHeaderDimensions.height);

    const isFrozenRowClicked =
      this.options.frozenCells && ySheetPos <= this.options.frozenCells?.row;
    const isFrozenColClicked =
      this.options.frozenCells && xSheetPos <= this.options.frozenCells?.col;

    const ri = isFrozenRowClicked ? ySheetPos : rowXPosition;
    const ci = isFrozenColClicked ? xSheetPos : colXPosition;

    this.shapes.selector.height(this.getRowHeight(ri));
    this.shapes.selector.width(this.getColWidth(ci));

    this.shapes.selector.x(x + this.rowHeaderDimensions.width);
    this.shapes.selector.y(y + this.colHeaderDimensions.height);

    if (isFrozenRowClicked && isFrozenColClicked) {
      this.xyStickyLayer.add(this.shapes.selector);
    } else if (isFrozenRowClicked) {
      this.yStickyLayer.add(this.shapes.selector);
    } else if (isFrozenColClicked) {
      this.xStickyLayer.add(this.shapes.selector);
    } else {
      this.mainLayer.add(this.shapes.selector);
    }
  }

  onHorizontalScroll = () => {
    this.updateViewport();
  };

  onVerticalScroll = () => {
    this.updateViewport();
  };

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.mainLayer,
      this.yStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.eventEmitter,
      this.options
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.mainLayer,
      this.xStickyLayer,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.eventEmitter,
      this.options
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.eventEmitter.off(events.scroll.vertical, this.onVerticalScroll);
    this.eventEmitter.off(events.scrollWheel.vertical, this.onVerticalScroll);
    this.eventEmitter.off(events.scroll.horizontal, this.onHorizontalScroll);
    this.eventEmitter.off(events.scrollWheel.vertical, this.onHorizontalScroll);
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

    this.xyStickyLayer.add(rect);
  }

  // Use center-center distance check for non-rotated rects.
  // https://longviewcoder.com/2021/02/04/html5-canvas-viewport-optimisation-with-konva/
  hasOverlap(rectOne: IRect, rectTwo: IRect, offset: number = 0) {
    const diff = {
      x: Math.abs(
        rectOne.x + rectOne.width / 2 - (rectTwo.x + rectTwo.width / 2)
      ),
      y: Math.abs(
        rectOne.y + rectOne.height / 2 - (rectTwo.y + rectTwo.height / 2)
      ),
    };
    const compWidth = (rectOne.width + rectTwo.width) / 2;
    const compHeight = (rectOne.height + rectTwo.height) / 2;
    const hasOverlap =
      diff.x <= compWidth - offset && diff.y <= compHeight - offset;

    return hasOverlap;
  }

  initializeViewport() {
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri <= this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRow(ri);
    }

    for (
      let ci = this.sheetViewportPositions.col.x;
      ci <= this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawCol(ci);
    }

    this.setPreviousSheetViewportPositions();
  }

  updateViewport() {
    this.destroyOutOfViewportShapes();
    this.drawViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    // this.rowGroups.forEach((rowGroup, index) => {
    //   if (
    //     !this.hasOverlap(rowGroup.getClientRect(), this.sheetViewportDimensions)
    //   ) {
    //     rowGroup.destroy();
    //     delete this.rowGroups[index];
    //   }
    // });
    // this.colGroups.forEach((colGroup, index) => {
    //   if (
    //     !this.hasOverlap(colGroup.getClientRect(), this.sheetViewportDimensions)
    //   ) {
    //     colGroup.destroy();
    //     delete this.colGroups[index];
    //   }
    // });
  }

  drawViewportShapes() {
    // Scrolling down
    for (
      let ri = this.sheetViewportPositions.row.y;
      ri > this.previousSheetViewportPositions.row.y;
      ri--
    ) {
      this.drawRow(ri);
    }
    // Scrolling up
    for (
      let ri = this.sheetViewportPositions.row.x;
      ri < this.previousSheetViewportPositions.row.x;
      ri++
    ) {
      this.drawRow(ri);
    }
    // Scrolling right
    for (
      let ci = this.sheetViewportPositions.col.y;
      ci > this.previousSheetViewportPositions.col.y;
      ci--
    ) {
      this.drawCol(ci);
    }
    // Scrolling left
    for (
      let ci = this.sheetViewportPositions.col.x;
      ci < this.previousSheetViewportPositions.col.x;
      ci++
    ) {
      this.drawCol(ci);
    }
  }

  getRowHeight(ri: number) {
    const rowHeight =
      this.options.row.heights?.[ri] ?? this.options.row.defaultHeight;

    return rowHeight;
  }

  getColWidth(ci: number) {
    const colWidth =
      this.options.col.widths?.[ci] ?? this.options.col.defaultWidth;

    return colWidth;
  }

  drawRow(ri: number) {
    if (this.rowGroups[ri]) {
      this.rowGroups[ri].destroy();
    }

    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowGroups[ri - 1];
    const y = prevRow
      ? prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;
    const group = this.shapes.rowGroup.clone({
      index: ri,
      height: rowHeight,
      y,
    }) as Group;
    const rowHeader = this.drawRowHeader(ri);
    const isFrozen = this.options.frozenCells?.row === ri;
    const xGridLine = isFrozen
      ? this.drawXGridLine(ri, this.shapes.frozenGridLine)
      : this.drawXGridLine(ri);

    group.add(rowHeader.rect, rowHeader.text, rowHeader.resizeLine, xGridLine);

    this.rowGroups[ri] = group;

    if (isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.xStickyLayer.add(group);
    }
  }

  drawCol(ci: number) {
    const colWidth = this.getColWidth(ci);
    const prevCol = this.colGroups[ci - 1];
    const x = prevCol
      ? prevCol.x() + prevCol.width()
      : this.sheetViewportDimensions.x;
    const group = this.shapes.colGroup.clone({
      index: ci,
      width: colWidth,
      x: x,
    }) as Group;
    const colHeader = this.drawColHeader(ci);
    const isFrozen = this.options.frozenCells?.col === ci;
    const yGridLine = isFrozen
      ? this.drawYGridLine(ci, this.shapes.frozenGridLine)
      : this.drawYGridLine(ci);

    group.add(colHeader.rect, colHeader.text, colHeader.resizeLine, yGridLine);

    this.colGroups[ci] = group;

    if (isFrozen) {
      this.xyStickyLayer.add(group);
    } else {
      this.yStickyLayer.add(group);
    }
  }

  drawRowHeader(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const rect = this.shapes.rowHeaderRect.clone({
      height: rowHeight,
    }) as Rect;
    const text = new Text({
      text: (ri + 1).toString(),
      ...this.styles.rowHeader.text,
    });
    const resizeLine = this.drawRowHeaderResizeLine(ri);

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
      resizeLine,
    };
  }

  drawColHeader(ci: number) {
    const colWidth = this.getColWidth(ci);
    const startCharCode = 'A'.charCodeAt(0);
    const letter = String.fromCharCode(startCharCode + ci);
    const rect = this.shapes.colHeaderRect.clone({
      width: colWidth,
    }) as Rect;
    const text = new Text({
      text: letter,
      ...this.styles.colHeader.text,
    });
    const resizeLine = this.drawColHeaderResizeLine(ci);

    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
      resizeLine,
    };
  }

  drawXGridLine(ri: number, gridLine = this.shapes.xGridLine) {
    const rowHeight = this.getRowHeight(ri);
    const clone = gridLine.clone({
      points: [this.sheetViewportDimensions.x, 0, this.stage.width(), 0],
      y: rowHeight,
    }) as Line;

    return clone;
  }

  drawRowHeaderResizeLine(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const clone = this.shapes.rowHeaderResizeLine.clone({
      points: [0, 0, this.rowHeaderDimensions.width, 0],
      y: rowHeight,
    }) as Line;

    return clone;
  }

  drawYGridLine(ci: number, gridLine = this.shapes.yGridLine) {
    const colWidth = this.getColWidth(ci);
    const clone = gridLine.clone({
      points: [0, this.sheetViewportDimensions.y, 0, this.stage.height()],
      x: colWidth,
    }) as Line;

    return clone;
  }

  drawColHeaderResizeLine(ci: number) {
    const colWidth = this.getColWidth(ci);
    const clone = this.shapes.colHeaderResizeLine.clone({
      points: [0, 0, 0, this.colHeaderDimensions.height],
      x: colWidth,
    }) as Line;

    return clone;
  }
}

export default Canvas;
