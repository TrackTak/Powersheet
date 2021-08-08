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
import { IRect } from 'konva/lib/types';
import { KonvaEventObject, NodeConfig } from 'konva/lib/Node';

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

interface IResizeLineConfig extends LineConfig {
  onHoverStroke: string;
  strokeWidth: number;
  stroke: string;
}

interface ICanvasStyles {
  backgroundColor: string;
  resizeLine: IResizeLineConfig;
  resizeGuideLine: LineConfig;
  gridLine: LineConfig;
  frozenGridLine: LineConfig;
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
  rowHeaderResizeLine: Line;
  resizeGuideLine: Line;
  rowGroup: Group;
  rowHeaderRect: Rect;
  colHeaderResizeLine: Line;
  colGroup: Group;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
  selector: Rect;
}

const resizeLineStrokeHitWidth = 15;
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
  resizeLine: {
    ...sharedCanvasStyles.gridLine,
    onHoverStroke: '#0057ff',
    hitStrokeWidth: resizeLineStrokeHitWidth,
    listening: true,
    opacity: 0.3,
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
      'mouseover',
      this.rowHeaderResizeLineOnMouseover
    );
    this.shapes.colHeaderResizeLine.on(
      'mouseover',
      this.colHeaderResizeLineOnMouseOver
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseout',
      this.rowHeaderResizeLineOnMouseout
    );
    this.shapes.colHeaderResizeLine.on(
      'mouseout',
      this.colHeaderResizeLineOnMouseout
    );
  }

  rowHeaderResizeLineOnMouseover = (e: KonvaEventObject<MouseEvent>) => {
    const target = e.target as Line;

    document.body.style.cursor = 'row-resize';

    target.strokeWidth(resizeLineStrokeHitWidth);
    target.stroke(this.styles.resizeLine.onHoverStroke);

    this.shapes.resizeGuideLine.y(target.parent!.y() + target.y());
    this.shapes.resizeGuideLine.points([
      this.sheetViewportDimensions.x,
      0,
      this.sheetViewportDimensions.width,
      0,
    ]);
    this.shapes.resizeGuideLine.show();
  };

  rowHeaderResizeLineOnMouseout = (e: any) => {
    const target = e.target as Line;

    document.body.style.cursor = 'default';

    target.strokeWidth(this.styles.resizeLine.strokeWidth);
    target.stroke(this.styles.resizeLine.stroke);

    this.shapes.resizeGuideLine.setPosition({
      x: 0,
      y: 0,
    });
    this.shapes.resizeGuideLine.hide();
  };

  colHeaderResizeLineOnMouseOver = (e: any) => {
    const target = e.target as Line;

    document.body.style.cursor = 'col-resize';

    target.strokeWidth(resizeLineStrokeHitWidth);
    target.stroke(this.styles.resizeLine.onHoverStroke);

    this.shapes.resizeGuideLine.x(target.parent!.x() + target.x());
    this.shapes.resizeGuideLine.points([
      0,
      this.sheetViewportDimensions.y,
      0,
      this.sheetViewportDimensions.height,
    ]);
    this.shapes.resizeGuideLine.show();
  };

  colHeaderResizeLineOnMouseout = (e: any) => {
    const target = e.target as Line;

    document.body.style.cursor = 'default';

    target.strokeWidth(this.styles.resizeLine.strokeWidth);
    target.stroke(this.styles.resizeLine.stroke);

    this.shapes.resizeGuideLine.setPosition({
      x: 0,
      y: 0,
    });
    this.shapes.resizeGuideLine.hide();
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

    const rowIndex = isFrozenRowClicked ? ySheetPos : rowXPosition;
    const colIndex = isFrozenColClicked ? xSheetPos : colXPosition;

    this.shapes.selector.height(this.getRowHeight(rowIndex));
    this.shapes.selector.width(this.getColWidth(colIndex));

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
    this.shapes.sheetGroup.off('click', this.sheetOnClick);
    this.shapes.rowHeaderResizeLine.off(
      'mouseover',
      this.rowHeaderResizeLineOnMouseover
    );
    this.shapes.colHeaderResizeLine.off(
      'mouseover',
      this.colHeaderResizeLineOnMouseOver
    );
    this.shapes.rowHeaderResizeLine.off(
      'mouseout',
      this.rowHeaderResizeLineOnMouseout
    );
    this.shapes.colHeaderResizeLine.off(
      'mouseout',
      this.colHeaderResizeLineOnMouseout
    );

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
    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowGroups[ri - 1];
    const y = prevRow
      ? prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;
    const group = this.shapes.rowGroup.clone({
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
