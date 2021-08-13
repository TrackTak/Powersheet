import EventEmitter from 'eventemitter3';
import { Node } from 'konva/lib/Node';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import { IOptions } from '../../options';
import {
  getIsFrozenCol,
  getIsFrozenRow,
  ICanvasShapes,
  ICell,
  ILayers,
} from './Canvas';
import { ICanvasStyles } from './canvasStyles';

export interface ISelectedCell {
  ri: number;
  ci: number;
}

interface ISelectorShapes {
  selection: Rect;
  selectionBorder: Rect;
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

class Selector {
  shapes!: ISelectorShapes;
  private selectionArea: ISelectionArea;
  private selectedCells: ICell[][];
  private selectedRects: Rect[];
  private isInSelectionMode: boolean;

  constructor(
    private styles: ICanvasStyles,
    private eventEmitter: EventEmitter,
    private canvasShapes: ICanvasShapes,
    private layers: ILayers,
    private options: IOptions,
    private getCellsBetweenVectors: (
      start: Vector2d,
      end: Vector2d
    ) => ICell[][]
  ) {
    this.styles = styles;
    this.eventEmitter = eventEmitter;
    this.canvasShapes = canvasShapes;
    this.layers = layers;
    this.options = options;
    this.getCellsBetweenVectors = getCellsBetweenVectors;
    this.isInSelectionMode = false;
    this.selectionArea = {
      start: {
        x: 0,
        y: 0,
      },
      end: {
        x: 0,
        y: 0,
      },
    };
    this.selectedCells = [];
    this.selectedRects = [];

    this.create();
  }

  private create() {
    this.shapes = {
      selectionBorder: new Rect({
        ...this.styles.selectionBorder,
      }),
      selection: new Rect({
        ...this.styles.selection,
      }),
    };

    this.shapes.selection.cache();

    this.eventEmitter.on(events.resize.row.end, this.onResizeRowEnd);
    this.eventEmitter.on(events.resize.col.end, this.onResizeColEnd);

    this.canvasShapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
    this.canvasShapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.canvasShapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
  }

  destroy() {
    this.eventEmitter.off(events.resize.row.end, this.onResizeRowEnd);
    this.eventEmitter.off(events.resize.col.end, this.onResizeColEnd);
    this.canvasShapes.sheetGroup.off('mouseup', this.onSheetMouseUp);
    this.canvasShapes.sheetGroup.off('mousedown', this.onSheetMouseDown);
    this.canvasShapes.sheetGroup.off('mousemove', this.onSheetMouseMove);

    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  onSheetMouseUp = () => {
    this.setSelectionBorder();
  };

  onSheetMouseMove = () => {
    if (this.isInSelectionMode) {
      const selectedRectsAfterFirst = this.selectedRects!.filter(
        (cell) => !cell.attrs.strokeWidth
      );

      selectedRectsAfterFirst.forEach((rect) => {
        rect.destroy();
      });

      const { x, y } = this.canvasShapes.sheet.getRelativePointerPosition();

      const start = {
        x: this.selectionArea.start.x + 1,
        y: this.selectionArea.start.y + 1,
      };

      const end = {
        x: x + 1,
        y: y + 1,
      };

      this.selectionArea.end = {
        x,
        y,
      };

      const firstSelectedCell = this.selectedRects.find(
        (x) => x.attrs.strokeWidth
      )!;

      this.selectCells(start, end, {
        strokeWidth: 0,
      });

      firstSelectedCell.moveToTop();
    }
  };

  onSheetMouseDown = () => {
    this.removeSelectedCells();
    this.isInSelectionMode = true;

    const { x, y } = this.canvasShapes.sheet.getRelativePointerPosition();

    this.selectionArea = {
      start: {
        x,
        y,
      },
      end: {
        x,
        y,
      },
    };

    this.selectCells(this.selectionArea.start, this.selectionArea.end);
  };

  onResizeRowEnd = () => {
    if (this.selectedCells) {
      this.removeSelectedCells();
    }
  };

  onResizeColEnd = () => {
    if (this.selectedCells) {
      this.removeSelectedCells();
    }
  };

  removeSelectedCells() {
    this.shapes.selectionBorder.destroy();
    this.selectedRects.forEach((rect) => rect.destroy());

    this.selectedRects = [];
  }

  selectCells(start: Vector2d, end: Vector2d, selectionConfig?: RectConfig) {
    this.selectedCells = this.getCellsBetweenVectors(start, end);

    this.selectedCells.forEach((row) => {
      row.forEach(({ rowGroup, colGroup }) => {
        const isFrozenRow = getIsFrozenRow(rowGroup.attrs.index, this.options);
        const isFrozenCol = getIsFrozenCol(colGroup.attrs.index, this.options);

        const config: RectConfig = {
          ...selectionConfig,
          x: colGroup.x(),
          y: rowGroup.y(),
          width: colGroup.width(),
          height: rowGroup.height(),
        };
        const clone = this.shapes.selection.clone(config) as Rect;

        this.selectedRects.push(clone);

        if (isFrozenRow && isFrozenCol) {
          this.layers.xyStickyLayer.add(clone);
        } else if (isFrozenRow) {
          this.layers.yStickyLayer.add(clone);
        } else if (isFrozenCol) {
          this.layers.xStickyLayer.add(clone);
        } else {
          this.layers.mainLayer.add(clone);
        }
      });
    });
  }

  setSelectionBorder() {
    this.isInSelectionMode = false;

    let totalWidth = 0;
    let totalHeight = 0;

    const colsMap: Record<string, boolean> = {};

    this.selectedCells.forEach((row) => {
      const rowGroup = row[0].rowGroup;

      row.forEach(({ colGroup }) => {
        const ci = colGroup.attrs.index;

        if (!colsMap[ci]) {
          colsMap[ci] = true;

          totalWidth += colGroup.width();
        }
      });

      totalHeight += rowGroup.height();
    });

    const colGroup = this.selectedCells[0][0].colGroup;
    const rowGroup = this.selectedCells[0][0].rowGroup;

    const config: RectConfig = {
      x: colGroup.x(),
      y: rowGroup.y(),
      width: totalWidth,
      height: totalHeight,
    };

    this.shapes.selectionBorder.setAttrs(config);

    this.layers.mainLayer.add(this.shapes.selectionBorder);
  }
}

export default Selector;
