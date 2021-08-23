import { Group } from 'konva/lib/Group';
import { Node } from 'konva/lib/Node';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';

export interface ISelectedRowCols {
  rows: Group[];
  cols: Group[];
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
  selectedRowCols: ISelectedRowCols;
  private selectionArea: ISelectionArea;
  private selectedRects: Rect[];
  private isInSelectionMode: boolean;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
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
    this.selectedRowCols = {
      rows: [],
      cols: [],
    };
    this.selectedRects = [];

    this.shapes = {
      selectionBorder: new Rect({
        ...this.canvas.styles.selectionBorder,
      }),
      selection: new Rect({
        ...this.canvas.styles.selection,
      }),
    };

    this.shapes.selection.cache();

    this.canvas.eventEmitter.on(events.resize.row.end, this.onResizeRowEnd);
    this.canvas.eventEmitter.on(events.resize.col.end, this.onResizeColEnd);

    this.canvas.shapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
    this.canvas.shapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.canvas.shapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
  }

  destroy() {
    this.canvas.eventEmitter.off(events.resize.row.end, this.onResizeRowEnd);
    this.canvas.eventEmitter.off(events.resize.col.end, this.onResizeColEnd);
    this.canvas.shapes.sheetGroup.off('mouseup', this.onSheetMouseUp);
    this.canvas.shapes.sheetGroup.off('mousedown', this.onSheetMouseDown);
    this.canvas.shapes.sheetGroup.off('mousemove', this.onSheetMouseMove);

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

      const { x, y } = this.canvas.shapes.sheet.getRelativePointerPosition();

      const start = {
        x: this.selectionArea.start.x,
        y: this.selectionArea.start.y,
      };

      const end = {
        x: x,
        y: y,
      };

      this.selectionArea.end = {
        x,
        y,
      };

      const firstSelectedCell = this.selectedRects.find(
        (x) => x.attrs.strokeWidth
      )!;

      // TODO: Make this func more efficient by only calling when we go to a new cell
      this.selectCells(start, end, {
        strokeWidth: 0,
      });

      firstSelectedCell.moveToTop();
    }
  };

  onSheetMouseDown = () => {
    this.removeSelectedCells();
    this.isInSelectionMode = true;

    const { x, y } = this.canvas.shapes.sheet.getRelativePointerPosition();

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
    if (this.selectedRects) {
      this.removeSelectedCells();
    }
  };

  onResizeColEnd = () => {
    if (this.selectedRects) {
      this.removeSelectedCells();
    }
  };

  removeSelectedCells() {
    this.shapes.selectionBorder.destroy();
    this.selectedRects.forEach((rect) => rect.destroy());

    this.selectedRects = [];
  }

  selectCells(start: Vector2d, end: Vector2d, selectionConfig?: RectConfig) {
    this.selectedRowCols = this.canvas.getRowColsBetweenVectors(start, end);

    this.selectedRowCols.rows.forEach((rowGroup) => {
      this.selectedRowCols.cols.forEach((colGroup) => {
        const isFrozenRow = this.canvas.row.getIsFrozen(rowGroup.attrs.index);
        const isFrozenCol = this.canvas.col.getIsFrozen(colGroup.attrs.index);

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
          this.canvas.layers.xyStickyLayer.add(clone);
        } else if (isFrozenRow) {
          this.canvas.layers.yStickyLayer.add(clone);
        } else if (isFrozenCol) {
          this.canvas.layers.xStickyLayer.add(clone);
        } else {
          this.canvas.layers.mainLayer.add(clone);
        }
      });
    });

    this.canvas.eventEmitter.emit(
      events.selector.selectCells,
      this.selectedRowCols
    );
  }

  setSelectionBorder() {
    this.isInSelectionMode = false;

    const totalHeight = this.selectedRowCols.rows.reduce(
      (totalHeight, rowGroup) => {
        return totalHeight + rowGroup.height();
      },
      0
    );

    const totalWidth = this.selectedRowCols.cols.reduce(
      (totalWidth, colGroup) => {
        return totalWidth + colGroup.width();
      },
      0
    );

    const colGroup = this.selectedRowCols.cols[0];
    const rowGroup = this.selectedRowCols.rows[0];

    const config: RectConfig = {
      x: colGroup.x(),
      y: rowGroup.y(),
      width: totalWidth,
      height: totalHeight,
    };

    this.shapes.selectionBorder.setAttrs(config);

    this.canvas.layers.mainLayer.add(this.shapes.selectionBorder);
  }
}

export default Selector;
