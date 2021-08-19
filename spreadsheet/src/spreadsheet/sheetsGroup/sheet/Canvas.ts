import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Stage, StageConfig } from 'konva/lib/Stage';
import { isNil, merge } from 'lodash';
import { Text } from 'konva/lib/shapes/Text';
import { prefix } from '../../utils';
import EventEmitter from 'eventemitter3';
import styles from './Canvas.module.scss';
import HorizontalScrollBar from './scrollBars/HorizontalScrollBar';
import VerticalScrollBar from './scrollBars/VerticalScrollBar';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import events from '../../events';
import { Group } from 'konva/lib/Group';
import { IRect, Vector2d } from 'konva/lib/types';
import {
  defaultCanvasStyles,
  ICanvasStyles,
  IColHeaderConfig,
  IRowHeaderConfig,
  performanceProperties,
} from './canvasStyles';
import Resizer from './Resizer';
import { IMergedCells, IOptions, ISizes } from '../../options';
import Selector from './Selector';
import { ShapeConfig } from 'konva/lib/Shape';
import { flatMap } from 'lodash';

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

interface IGridLineParams {
  line?: Line;
  config?: LineConfig;
}

export interface ICanvasShapes {
  sheetGroup: Group;
  sheet: Rect;
  rowGroup: Group;
  rowHeaderGroup: Group;
  rowHeaderRect: Rect;
  colGroup: Group;
  colHeaderGroup: Group;
  colHeaderRect: Rect;
  frozenGridLine: Line;
  xGridLine: Line;
  yGridLine: Line;
}

export interface ICustomSizePosition {
  axis: number;
  size: number;
}

export interface ILayers {
  mainLayer: Layer;
  yStickyLayer: Layer;
  xStickyLayer: Layer;
  xyStickyLayer: Layer;
}

export interface ICustomSizes {
  size: number;
}

export interface IMergedCellsMap {
  row: Record<string, number[]>;
  col: Record<string, number[]>;
}

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

export const getIsFrozenRow = (ri: number, options: IOptions) => {
  return isNil(options.frozenCells.row) ? false : ri <= options.frozenCells.row;
};

export const getIsFrozenCol = (ci: number, options: IOptions) => {
  return isNil(options.frozenCells.col) ? false : ci <= options.frozenCells.col;
};

export const calculateSheetViewportEndPosition = (
  sheetViewportDimensionSize: number,
  sheetViewportStartYIndex: number,
  defaultSize: number,
  sizes?: ISizes,
  customSizeChanges?: ICustomSizes[]
) => {
  let sumOfSizes = 0;
  let i = sheetViewportStartYIndex;

  const getSize = () => {
    // TODO: Remove when we have snapping to row/col for scroll
    let offset = 0;

    if (customSizeChanges?.[i]?.size) {
      offset = customSizeChanges[i].size;
    }

    return (sizes?.[i] ?? defaultSize) - offset;
  };

  while (sumOfSizes + getSize() < sheetViewportDimensionSize) {
    sumOfSizes += getSize();
    i += 1;
  }

  return i;
};

class Canvas {
  container!: HTMLDivElement;
  stage!: Stage;
  layers!: ILayers;
  horizontalScrollBar!: HorizontalScrollBar;
  verticalScrollBar!: VerticalScrollBar;
  selector!: Selector;
  rowResizer!: Resizer;
  colResizer!: Resizer;
  private styles: ICanvasStyles;
  private rowHeaderGroups: Group[];
  private colHeaderGroups: Group[];
  private rowGroups: Group[];
  private colGroups: Group[];
  private gridLinesMergedCellsMap: IMergedCellsMap;
  private shapes!: ICanvasShapes;
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
        const widths = Object.values(that.options.col.widths);

        const totalWidthsDifference = widths.reduce((currentWidth, width) => {
          return width - that.options.col.defaultWidth + currentWidth;
        }, 0);

        return (
          that.options.numberOfCols * that.options.col.defaultWidth +
          totalWidthsDifference
        );
      },
      get height() {
        const heights = Object.values(that.options.row.heights);

        const totalHeightsDifference = heights.reduce(
          (currentHeight, height) => {
            return height - that.options.row.defaultHeight + currentHeight;
          },
          0
        );

        return (
          that.options.numberOfRows * that.options.row.defaultHeight +
          totalHeightsDifference
        );
      },
    };

    this.rowHeaderGroups = [];
    this.colHeaderGroups = [];
    this.rowGroups = [];
    this.colGroups = [];

    this.gridLinesMergedCellsMap = {
      row: {},
      col: {},
    };

    this.setMergedCells(this.options.mergedCells);

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
    const availableRowHeight =
      window.innerHeight -
      this.sheetViewportDimensions.y -
      this.horizontalScrollBar.getBoundingClientRect().height;

    const availableColWidth =
      window.innerWidth -
      this.sheetViewportDimensions.x -
      this.verticalScrollBar.getBoundingClientRect().width;

    const rowYIndex = (this.sheetViewportPositions.row.y =
      calculateSheetViewportEndPosition(
        availableRowHeight,
        0,
        this.options.row.defaultHeight,
        this.options.row.heights
      ));

    const colYIndex = (this.sheetViewportPositions.col.y =
      calculateSheetViewportEndPosition(
        availableColWidth,
        0,
        this.options.col.defaultWidth,
        this.options.col.widths
      ));

    let sumOfRowHeights = 0;
    let sumOfColWidths = 0;

    for (let ri = 0; ri < rowYIndex; ri++) {
      sumOfRowHeights += this.getRowHeight(ri);
    }

    for (let ci = 0; ci < colYIndex; ci++) {
      sumOfColWidths += this.getColWidth(ci);
    }

    this.stage.width(sumOfColWidths + this.sheetViewportDimensions.x);
    this.stage.height(sumOfRowHeights + this.sheetViewportDimensions.y);

    this.sheetViewportPositions.row.y = rowYIndex;
    this.sheetViewportPositions.col.y = colYIndex;

    this.shapes.sheetGroup.setAttrs({
      x: this.sheetViewportDimensions.x,
      y: this.sheetViewportDimensions.y,
    });

    this.shapes.sheet.setAttrs({
      width: this.sheetViewportDimensions.width,
      height: this.sheetViewportDimensions.height,
    });

    this.createResizer();
    this.createSelector();
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

    // The order here matters
    this.layers = {
      mainLayer: new Layer(),
      xStickyLayer: new Layer(),
      yStickyLayer: new Layer(),
      xyStickyLayer: new Layer(),
    };

    Object.values(this.layers).forEach((layer) => {
      this.stage.add(layer);
    });

    this.shapes = {
      sheetGroup: new Group({
        ...performanceProperties,
        listening: true,
      }),
      sheet: new Rect({
        ...performanceProperties,
        listening: true,
        opacity: 0,
      }),
      rowHeaderRect: new Rect({
        ...this.rowHeaderDimensions,
        ...this.styles.rowHeader.rect,
      }),
      rowHeaderGroup: new Group(),
      rowGroup: new Group(),
      colHeaderRect: new Rect({
        ...this.colHeaderDimensions,
        ...this.styles.colHeader.rect,
      }),
      colGroup: new Group(),
      colHeaderGroup: new Group(),
      xGridLine: new Line({
        ...this.styles.gridLine,
      }),
      yGridLine: new Line({
        ...this.styles.gridLine,
      }),
      frozenGridLine: new Line({
        ...this.styles.frozenGridLine,
      }),
    };

    this.shapes.rowHeaderGroup.cache(this.rowHeaderDimensions);
    this.shapes.rowGroup.cache(this.rowHeaderDimensions);

    this.shapes.colHeaderGroup.cache(this.colHeaderDimensions);
    this.shapes.colGroup.cache(this.colHeaderDimensions);

    this.shapes.rowHeaderRect.cache();
    this.shapes.colHeaderRect.cache();
    this.shapes.xGridLine.cache();
    this.shapes.yGridLine.cache();
    this.shapes.frozenGridLine.cache();

    this.shapes.sheetGroup.add(this.shapes.sheet);

    this.layers.xyStickyLayer.add(this.shapes.sheetGroup);

    this.eventEmitter.on(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.on(events.resize.col.start, this.onResizeColStart);

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  setMergedCells(mergedCells: IMergedCells[]) {
    const gridLinesMergedCellsMap: IMergedCellsMap = {
      row: {},
      col: {},
    };
    const comparer = (a: number, b: number) => a - b;

    mergedCells.forEach(({ start, end }) => {
      const rowsArr: number[] = [];
      const colsArr: number[] = [];

      for (let index = start.row; index <= end.row; index++) {
        rowsArr.push(index);
      }

      for (let index = start.col; index <= end.col; index++) {
        colsArr.push(index);
      }

      rowsArr.forEach((value, i) => {
        if (i !== 0) {
          gridLinesMergedCellsMap.row[value] = [
            ...(gridLinesMergedCellsMap.row[value] ?? []),
            ...colsArr,
          ];

          gridLinesMergedCellsMap.row[value].sort(comparer);
        }
      });

      colsArr.forEach((value, i) => {
        if (i !== 0) {
          gridLinesMergedCellsMap.col[value] = [
            ...(gridLinesMergedCellsMap.col[value] ?? []),
            ...rowsArr,
          ];
          gridLinesMergedCellsMap.col[value].sort(comparer);
        }
      });
    });

    this.options.mergedCells = mergedCells;
    this.gridLinesMergedCellsMap = gridLinesMergedCellsMap;
  }

  mergeSelectedCells() {
    const selectedRowCols = this.selector.selectedRowCols;

    if (!selectedRowCols.rows.length || !selectedRowCols.cols.length) {
      return;
    }

    const start = {
      row: selectedRowCols.rows[0].attrs.index,
      col: selectedRowCols.cols[0].attrs.index,
    };

    const end = {
      row: selectedRowCols.rows[selectedRowCols.rows.length - 1].attrs.index,
      col: selectedRowCols.cols[selectedRowCols.cols.length - 1].attrs.index,
    };

    const mergedSelectedRow = selectedRowCols.rows.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedRow && mergedSelectedRow.attrs.index >= end.row) {
      let totalRowHeight = this.rowGroups[start.row].height();

      while (totalRowHeight < mergedSelectedRow.height()) {
        end.row += 1;
        totalRowHeight += this.rowGroups[end.row].height();
      }
    }

    const mergedSelectedCol = selectedRowCols.cols.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedCol && mergedSelectedCol.attrs.index >= end.col) {
      let totalColWidth = this.colGroups[start.col].width();

      while (totalColWidth < mergedSelectedCol.width()) {
        end.col += 1;
        totalColWidth += this.colGroups[end.col].width();
      }
    }

    this.mergeCells([{ start, end }]);
  }

  unmergeSelectedCells() {
    const selectedRowCols = this.selector.selectedRowCols;

    if (!selectedRowCols.rows.length || !selectedRowCols.cols.length) {
      return;
    }

    const areAllRowsMerged = selectedRowCols.rows.every(
      (row) => row.attrs.isMerged
    );
    const areAllColsMerged = selectedRowCols.cols.every(
      (col) => col.attrs.isMerged
    );

    if (areAllRowsMerged && areAllColsMerged) {
      let { index: rowIndex, height } = selectedRowCols.rows[0].attrs;

      const startRowIndex = rowIndex;

      while (height > 0) {
        height -= this.rowGroups[rowIndex].height();
        rowIndex += 1;
      }

      let { index: colIndex, width } = selectedRowCols.cols[0].attrs;

      const startColIndex = colIndex;

      while (width > 0) {
        width -= this.colGroups[colIndex].width();
        colIndex += 1;
      }

      const mergedCellToRemove = this.options.mergedCells.findIndex(
        (x) => x.start.row === startRowIndex && x.start.col === startColIndex
      );

      this.options.mergedCells.splice(mergedCellToRemove, 1);

      this.setMergedCells(this.options.mergedCells);

      for (let index = startRowIndex; index < rowIndex; index++) {
        this.drawRowLines(index);
      }

      for (let index = startColIndex; index < colIndex; index++) {
        this.drawColLines(index);
      }
    }
  }

  mergeCells(cells: IMergedCells[]) {
    const doesOverlapCells = (x: IMergedCells) => {
      return !cells.some((z) => {
        return (
          x.start.row >= z.start.row &&
          x.end.row <= z.end.row &&
          x.start.col >= z.start.col &&
          x.end.col <= z.end.col
        );
      });
    };

    const existingMergedCells =
      this.options.mergedCells.filter(doesOverlapCells);
    const mergedCells = [...existingMergedCells, ...cells];

    this.setMergedCells(mergedCells);

    for (let index = 0; index < cells.length; index++) {
      const { start, end } = cells[index];

      for (let index = start.row; index <= end.row; index++) {
        this.drawRowLines(index);
      }

      for (let index = start.col; index <= end.col; index++) {
        this.drawColLines(index);
      }
    }
  }

  onResizeRowStart = () => {
    this.rowResizer.shapes.resizeGuideLine.moveToTop();
  };

  onResizeColStart = () => {
    this.colResizer.shapes.resizeGuideLine.moveToTop();
  };

  reverseVectorsIfStartBiggerThanEnd(start: Vector2d, end: Vector2d) {
    const newStart = { ...start };
    const newEnd = { ...end };

    if (start.x > end.x) {
      const temp = start.x;

      newStart.x = end.x;
      newEnd.x = temp;
    }

    if (start.y > end.y) {
      const temp = start.y;

      newStart.y = end.y;
      newEnd.y = temp;
    }

    return {
      start: newStart,
      end: newEnd,
    };
  }

  getRowColsBetweenVectors(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } =
      this.reverseVectorsIfStartBiggerThanEnd(start, end);

    const rowCustomSize: ICustomSizes[] = [];

    rowCustomSize[this.verticalScrollBar.scrollOffset.index] = {
      size: this.verticalScrollBar.scrollOffset.size,
    };

    const colCustomSize = [];

    colCustomSize[this.horizontalScrollBar.scrollOffset.index] = {
      size: this.horizontalScrollBar.scrollOffset.size,
    };

    const cellIndexes = {
      start: {
        ri: calculateSheetViewportEndPosition(
          newStart.y,
          this.sheetViewportPositions.row.x,
          this.options.row.defaultHeight,
          this.options.row.heights,
          rowCustomSize
        ),
        ci: calculateSheetViewportEndPosition(
          newStart.x,
          this.sheetViewportPositions.col.x,
          this.options.col.defaultWidth,
          this.options.col.widths,
          colCustomSize
        ),
      },
      end: {
        ri: calculateSheetViewportEndPosition(
          newEnd.y,
          this.sheetViewportPositions.row.x,
          this.options.row.defaultHeight,
          this.options.row.heights,
          rowCustomSize
        ),
        ci: calculateSheetViewportEndPosition(
          newEnd.x,
          this.sheetViewportPositions.col.x,
          this.options.col.defaultWidth,
          this.options.col.widths,
          colCustomSize
        ),
      },
    };

    const comparer = (a: Group, b: Group) => a.attrs.index - b.attrs.index;

    let rows: Group[] = [];
    let cols: Group[] = [];

    for (let ri = cellIndexes.start.ri; ri <= cellIndexes.end.ri; ri++) {
      const rowGroup = this.rowHeaderGroups[ri];

      rows.push(rowGroup);
    }

    for (let ci = cellIndexes.start.ci; ci <= cellIndexes.end.ci; ci++) {
      const colGroup = this.colHeaderGroups[ci];

      cols.push(colGroup);
    }

    const mergedCell = this.options.mergedCells.find((x) => {
      return (
        (cellIndexes.start.ri >= x.start.row &&
          cellIndexes.start.ri <= x.end.row &&
          cellIndexes.start.ci >= x.start.col &&
          cellIndexes.start.ci <= x.end.col) ||
        (cellIndexes.end.ri >= x.start.row &&
          cellIndexes.end.ri <= x.end.row &&
          cellIndexes.end.ci >= x.start.col &&
          cellIndexes.end.ci <= x.end.col)
      );
    });

    console.log(cellIndexes);

    if (mergedCell) {
      let totalMergedHeight = 0;
      let totalMergedWidth = 0;

      const firstRow = this.rowGroups[mergedCell.start.row];
      const firstCol = this.colGroups[mergedCell.start.col];

      for (
        let index = mergedCell.start.row;
        index <= mergedCell.end.row;
        index++
      ) {
        const rowGroup = this.rowGroups[index];

        totalMergedHeight += rowGroup.height();

        rows = rows.filter((x) => x.attrs.index !== index);
      }

      for (
        let index = mergedCell.start.col;
        index <= mergedCell.end.col;
        index++
      ) {
        const colGroup = this.colGroups[index];

        totalMergedWidth += colGroup.width();

        cols = cols.filter((x) => x.attrs.index !== index);
      }

      const newMergedRowGroup = new Group({
        y: firstRow.y(),
        height: totalMergedHeight,
        index: firstRow.attrs.index,
        isMerged: true,
      });

      const newMergedColGroup = new Group({
        x: firstCol.x(),
        width: totalMergedWidth,
        index: firstCol.attrs.index,
        isMerged: true,
      });

      // if (!rows.some((row) => row.attrs.index === firstRow.attrs.index)) {
      rows.push(newMergedRowGroup);
      //  }

      //  if (!cols.some((col) => col.attrs.index === firstCol.attrs.index)) {
      cols.push(newMergedColGroup);
      // }
    }

    const sortedRows = rows.sort(comparer);
    const sortedCols = cols.sort(comparer);

    return {
      rows: sortedRows,
      cols: sortedCols,
    };
  }

  onHorizontalScroll = () => {
    this.updateViewport();
  };

  onVerticalScroll = () => {
    this.updateViewport();
  };

  createSelector() {
    this.selector = new Selector(
      this.styles,
      this.eventEmitter,
      this.shapes,
      this.layers,
      this.options,
      this.getRowColsBetweenVectors.bind(this)
    );
  }

  createResizer() {
    this.rowResizer = new Resizer(
      'row',
      this.layers,
      this.rowHeaderDimensions,
      this.styles,
      {
        points: [this.sheetViewportDimensions.x, 0, this.stage.width(), 0],
      },
      {
        points: [0, 0, this.rowHeaderDimensions.width, 0],
      },
      {
        minSize: this.options.row.minHeight,
        defaultSize: this.options.row.defaultHeight,
        sizes: this.options.row.heights,
      },
      this.rowHeaderGroups,
      this.drawRow,
      this.eventEmitter
    );

    this.colResizer = new Resizer(
      'col',
      this.layers,
      this.colHeaderDimensions,
      this.styles,
      {
        points: [0, this.sheetViewportDimensions.y, 0, this.stage.height()],
      },
      {
        points: [0, 0, 0, this.colHeaderDimensions.height],
      },
      {
        minSize: this.options.col.minWidth,
        defaultSize: this.options.col.defaultWidth,
        sizes: this.options.col.widths,
      },
      this.colHeaderGroups,
      this.drawCol,
      this.eventEmitter
    );
  }

  createScrollBars() {
    this.horizontalScrollBar = new HorizontalScrollBar(
      this.stage,
      this.layers,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.colHeaderGroups,
      this.eventEmitter,
      this.options,
      this.sheetViewportDimensions,
      this.onHorizontalScroll
    );

    this.verticalScrollBar = new VerticalScrollBar(
      this.stage,
      this.layers,
      this.sheetDimensions,
      this.sheetViewportPositions,
      this.horizontalScrollBar.getBoundingClientRect,
      this.rowHeaderGroups,
      this.eventEmitter,
      this.options,
      this.sheetViewportDimensions,
      this.onVerticalScroll
    );

    this.container.appendChild(this.horizontalScrollBar.scrollBar);
    this.container.appendChild(this.verticalScrollBar.scrollBar);
  }

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

    this.eventEmitter.off(events.resize.row.start, this.onResizeRowStart);
    this.eventEmitter.off(events.resize.col.start, this.onResizeColStart);

    this.horizontalScrollBar.destroy();
    this.verticalScrollBar.destroy();
    this.selector.destroy();
    this.rowResizer.destroy();
    this.colResizer.destroy();
    this.stage.destroy();
  }

  drawTopLeftOffsetRect() {
    const rect = new Rect({
      width: this.rowHeaderDimensions.width,
      height: this.colHeaderDimensions.height,
      ...this.styles.topLeftRect,
    });

    this.layers.xyStickyLayer.add(rect);
  }

  // Use center-center distance check for non-rotated rects.
  // https://longviewcoder.com/2021/02/04/html5-canvas-viewport-optimisation-with-konva/
  hasOverlap(rectOne: IRect, rectTwo: IRect) {
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
    const hasOverlap = diff.x <= compWidth && diff.y <= compHeight;

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

    for (
      let ri = this.sheetViewportPositions.row.x;
      ri <= this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRowLines(ri);
    }

    for (
      let ci = this.sheetViewportPositions.col.x;
      ci <= this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawColLines(ci);
    }

    this.setPreviousSheetViewportPositions();
  }

  updateViewport() {
    this.drawViewportShapes();
    this.destroyOutOfViewportShapes();

    this.setPreviousSheetViewportPositions();
  }

  destroyOutOfViewportShapes() {
    this.rowHeaderGroups.forEach((rowGroup, index) => {
      if (
        !this.hasOverlap(rowGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        rowGroup.destroy();
        delete this.rowHeaderGroups[index];
      }
    });
    this.colHeaderGroups.forEach((colGroup, index) => {
      if (
        !this.hasOverlap(colGroup.getClientRect(), this.sheetViewportDimensions)
      ) {
        colGroup.destroy();
        delete this.colHeaderGroups[index];
      }
    });
  }

  drawViewportShapes() {
    // Scrolling down
    for (
      let ri = this.previousSheetViewportPositions.row.y;
      ri < this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRow(ri);
    }
    // Scrolling up
    for (
      let ri = this.previousSheetViewportPositions.row.x;
      ri > this.sheetViewportPositions.row.x;
      ri--
    ) {
      this.drawRow(ri - 1, true);
    }
    // Scrolling right
    for (
      let ci = this.previousSheetViewportPositions.col.y;
      ci < this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawCol(ci);
    }
    // Scrolling left
    for (
      let ci = this.previousSheetViewportPositions.col.x;
      ci > this.sheetViewportPositions.col.x;
      ci--
    ) {
      this.drawCol(ci - 1, true);
    }

    // Scrolling down
    for (
      let ri = this.previousSheetViewportPositions.row.y;
      ri < this.sheetViewportPositions.row.y;
      ri++
    ) {
      this.drawRowLines(ri);
    }
    // Scrolling up
    for (
      let ri = this.previousSheetViewportPositions.row.x;
      ri > this.sheetViewportPositions.row.x;
      ri--
    ) {
      this.drawRowLines(ri - 1);
    }
    // Scrolling right
    for (
      let ci = this.previousSheetViewportPositions.col.y;
      ci < this.sheetViewportPositions.col.y;
      ci++
    ) {
      this.drawColLines(ci);
    }
    // Scrolling left
    for (
      let ci = this.previousSheetViewportPositions.col.x;
      ci > this.sheetViewportPositions.col.x;
      ci--
    ) {
      this.drawColLines(ci - 1);
    }
  }

  getRowHeight(ri: number) {
    const rowHeight =
      this.options.row.heights[ri] ?? this.options.row.defaultHeight;

    return rowHeight;
  }

  getColWidth(ci: number) {
    const colWidth =
      this.options.col.widths[ci] ?? this.options.col.defaultWidth;

    return colWidth;
  }

  drawRow = (ri: number, drawingAtTop = false) => {
    const prevRi = drawingAtTop ? ri + 1 : ri - 1;

    if (this.rowHeaderGroups[ri]) {
      this.rowHeaderGroups[ri].destroy();
    }

    const rowHeight = this.getRowHeight(ri);
    const prevRow = this.rowHeaderGroups[prevRi];

    const y = prevRow
      ? drawingAtTop
        ? this.rowHeaderGroups[prevRi].y() - rowHeight
        : prevRow.y() + prevRow.height()
      : this.sheetViewportDimensions.y;

    const groupConfig: ShapeConfig = {
      index: ri,
      height: rowHeight,
      y,
    };
    const rowHeaderGroup = this.shapes.rowHeaderGroup.clone(
      groupConfig
    ) as Group;
    const rowHeader = this.drawRowHeader(ri);
    const isFrozen = getIsFrozenRow(ri, this.options);

    rowHeaderGroup.add(rowHeader.rect, rowHeader.text, rowHeader.resizeLine);

    this.rowHeaderGroups[ri] = rowHeaderGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(rowHeaderGroup);
    } else {
      this.layers.xStickyLayer.add(rowHeaderGroup);
    }
  };

  drawCol = (ci: number, drawingAtLeft = false) => {
    const prevCi = drawingAtLeft ? ci + 1 : ci - 1;

    if (this.colHeaderGroups[ci]) {
      this.colHeaderGroups[ci].destroy();
    }

    const colWidth = this.getColWidth(ci);
    const prevCol = this.colHeaderGroups[prevCi];

    const x = prevCol
      ? drawingAtLeft
        ? this.colHeaderGroups[prevCi].x() - colWidth
        : prevCol.x() + prevCol.width()
      : this.sheetViewportDimensions.x;

    const groupConfig: ShapeConfig = {
      index: ci,
      width: colWidth,
      x: x,
    };
    const colHeaderGroup = this.shapes.colHeaderGroup.clone(
      groupConfig
    ) as Group;
    const colHeader = this.drawColHeader(ci);
    const isFrozen = getIsFrozenCol(ci, this.options);

    colHeaderGroup.add(colHeader.rect, colHeader.text, colHeader.resizeLine);

    this.colHeaderGroups[ci] = colHeaderGroup;

    if (isFrozen) {
      this.layers.xyStickyLayer.add(colHeaderGroup);
    } else {
      this.layers.yStickyLayer.add(colHeaderGroup);
    }
  };

  drawRowHeader(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const rectConfig: RectConfig = {
      height: rowHeight,
    };
    const rect = this.shapes.rowHeaderRect.clone(rectConfig) as Rect;
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
    const rectConfig: RectConfig = {
      width: colWidth,
    };
    const rect = this.shapes.colHeaderRect.clone(rectConfig) as Rect;
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

  drawRowLines(ri: number) {
    if (this.rowGroups[ri]) {
      this.rowGroups[ri].destroy();
    }

    const groupConfig: ShapeConfig = {
      index: ri,
      height: this.rowHeaderGroups[ri].height(),
      y: this.rowHeaderGroups[ri].y(),
    };

    const rowGroup = this.shapes.rowGroup.clone(groupConfig) as Group;

    const xGridLines =
      ri === this.options.frozenCells.row
        ? this.drawXGridLines(ri, { line: this.shapes.frozenGridLine })
        : this.drawXGridLines(ri);

    xGridLines.forEach((xGridLine) => {
      rowGroup.add(xGridLine);
    });

    this.rowGroups[ri] = rowGroup;

    this.layers.mainLayer.add(rowGroup);
  }

  drawColLines(ci: number) {
    if (this.colGroups[ci]) {
      this.colGroups[ci].destroy();
    }

    const groupConfig: ShapeConfig = {
      index: ci,
      width: this.colHeaderGroups[ci].width(),
      x: this.colHeaderGroups[ci].x(),
    };

    const colGroup = this.shapes.colGroup.clone(groupConfig) as Group;

    const yGridLines =
      ci === this.options.frozenCells.col
        ? this.drawYGridLines(ci, { line: this.shapes.frozenGridLine })
        : this.drawYGridLines(ci);

    yGridLines.forEach((yGridLine) => {
      colGroup.add(yGridLine);
    });

    this.colGroups[ci] = colGroup;

    this.layers.mainLayer.add(colGroup);
  }

  drawXGridLines(ri: number, gridLineParams?: IGridLineParams) {
    const { line = this.shapes.xGridLine, config } = gridLineParams ?? {};
    const lineConfig: LineConfig = {
      points: [0, 0, this.stage.width(), 0],
      ...config,
    };
    const mergedRow = this.gridLinesMergedCellsMap.row[ri];

    const clone = line.clone(lineConfig) as Line;

    if (mergedRow) {
      return flatMap(mergedRow, (ci, i) => {
        const prevColGroupIndex = mergedRow[i - 1];
        const prevColGroup = !isNil(prevColGroupIndex)
          ? this.colHeaderGroups[prevColGroupIndex]
          : null;

        const colGroup = this.colHeaderGroups[ci];

        const nextColGroupIndex = mergedRow[i + 1];
        const nextColGroup = !isNil(nextColGroupIndex)
          ? this.colHeaderGroups[nextColGroupIndex]
          : null;

        const getLeftLine = () => {
          let x0 = 0;
          const x1 = colGroup.x();

          if (prevColGroup) {
            x0 = prevColGroup.x() + prevColGroup.width();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [x0, 0, x1, 0],
          }) as Line;

          return clone;
        };

        const getRightLine = () => {
          const x0 = colGroup.x() + colGroup.width();
          let x1 = this.stage.width();

          if (nextColGroup) {
            x1 = nextColGroup.x();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [x0, 0, x1, 0],
          }) as Line;

          return clone;
        };

        return [getLeftLine(), getRightLine()];
      });
    }

    return [clone];
  }

  drawRowHeaderResizeLine(ri: number) {
    const rowHeight = this.getRowHeight(ri);
    const lineConfig: LineConfig = {
      y: rowHeight,
    };
    const clone = this.rowResizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }

  drawYGridLines(ci: number, gridLineParams?: IGridLineParams) {
    const { line = this.shapes.yGridLine, config } = gridLineParams ?? {};
    const lineConfig: LineConfig = {
      points: [0, 0, 0, this.stage.height()],
      ...config,
    };

    const clone = line.clone(lineConfig) as Line;

    const mergedCol = this.gridLinesMergedCellsMap.col[ci];

    if (mergedCol) {
      return flatMap(mergedCol, (ri, i) => {
        const prevRowGroupIndex = mergedCol[i - 1];
        const prevRowGroup = !isNil(prevRowGroupIndex)
          ? this.rowHeaderGroups[prevRowGroupIndex]
          : null;

        const rowGroup = this.rowHeaderGroups[ri];

        const nextRowGroupIndex = mergedCol[i + 1];
        const nextRowGroup = !isNil(nextRowGroupIndex)
          ? this.rowHeaderGroups[nextRowGroupIndex]
          : null;

        const getTopLine = () => {
          let y0 = 0;
          let y1 = rowGroup.y();

          if (prevRowGroup) {
            y0 = prevRowGroup.y() + prevRowGroup.height();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [0, y0, 0, y1],
          }) as Line;

          return clone;
        };

        const getBottomLine = () => {
          let y0 = rowGroup.y() + rowGroup.height();
          let y1 = this.stage.height();

          if (nextRowGroup) {
            y1 = nextRowGroup.y();
          }

          const clone = line.clone({
            ...lineConfig,
            points: [0, y0, 0, y1],
          }) as Line;

          return clone;
        };

        return [getTopLine(), getBottomLine()];
      });
    }

    return [clone];
  }

  drawColHeaderResizeLine(ci: number) {
    const colWidth = this.getColWidth(ci);
    const lineConfig: LineConfig = {
      x: colWidth,
    };
    const clone = this.colResizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }
}

export default Canvas;
