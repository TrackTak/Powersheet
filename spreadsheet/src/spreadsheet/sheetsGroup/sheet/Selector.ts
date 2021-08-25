import { Node } from 'konva/lib/Node';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { Rect } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

interface ISelectorShapes {
  selection: Rect;
  selectionBorder: Rect;
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

interface ICell extends Shape {}

class Selector {
  shapes!: ISelectorShapes;
  isInSelectionMode: boolean;
  selectedCells: ICell[];
  private selectionArea: ISelectionArea;

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
    this.selectedCells = [];

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

    this.canvas.shapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.canvas.shapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
    this.canvas.shapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
  }

  destroy() {
    this.canvas.eventEmitter.off(events.resize.row.end, this.onResizeRowEnd);
    this.canvas.eventEmitter.off(events.resize.col.end, this.onResizeColEnd);

    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  onSheetMouseDown = () => {
    const { x, y } = this.canvas.shapes.sheet.getRelativePointerPosition();

    const start = {
      x,
      y,
    };
    const end = {
      x,
      y,
    };

    this.selectionArea = {
      start,
      end,
    };

    const { rows, cols } = this.canvas.getRowColsBetweenVectors(start, end);

    const cells = this.convertFromRowColsToCells(rows, cols);

    this.startSelection(cells);
  };

  onSheetMouseMove = () => {
    this.moveSelection();
  };

  onSheetMouseUp = () => {
    this.setSelectionBorder();
  };

  startSelection(cells: ICell[]) {
    this.removeSelectedCells();
    this.isInSelectionMode = true;

    this.selectCells(cells);
  }

  moveSelection() {
    if (this.isInSelectionMode) {
      const selectedCellsAfterFirst = this.selectedCells!.filter(
        (cell) => !cell.attrs.strokeWidth
      );

      const firstSelectedCell = this.selectedCells.find(
        (x) => x.attrs.strokeWidth
      )!;

      selectedCellsAfterFirst.forEach((rect) => {
        rect.destroy();
      });

      this.selectedCells = [firstSelectedCell];

      const { x, y } = this.canvas.shapes.sheet.getRelativePointerPosition();

      const start = {
        x: this.selectionArea.start.x,
        y: this.selectionArea.start.y,
      };

      this.selectionArea.end = {
        x,
        y,
      };

      const { rows, cols } = this.canvas.getRowColsBetweenVectors(
        start,
        this.selectionArea.end
      );

      const cells = this.convertFromRowColsToCells(rows, cols, {
        strokeWidth: 0,
      });

      // TODO: Make this func more efficient by only calling when we go to a new cell
      this.selectCells(cells);

      firstSelectedCell.moveToTop();
    }
  }

  convertShapeToCell(shape: Shape, cellConfig?: ShapeConfig) {
    const clone = this.shapes.selection.clone({
      ...cellConfig,
      start: shape.attrs.start,
      end: shape.attrs.end,
      id: shape.id(),
      x: shape.x(),
      y: shape.y(),
      width: shape.width(),
      height: shape.height(),
    });

    return clone;
  }

  convertFromRowColsToCells(
    rows: Shape[],
    cols: Shape[],
    cellConfig?: ShapeConfig
  ) {
    const cells: ICell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const clone = this.shapes.selection.clone({
          ...cellConfig,
          start: {
            row: rowGroup.attrs.index,
            col: colGroup.attrs.index,
          },
          end: {
            row: rowGroup.attrs.index,
            col: colGroup.attrs.index,
          },
          //   isFrozenRow: this.canvas.row.getIsFrozen(rowGroup.attrs.index),
          //   isFrozenCol: this.canvas.col.getIsFrozen(colGroup.attrs.index),
          x: colGroup.x(),
          y: rowGroup.y(),
          width: colGroup.width(),
          height: rowGroup.height(),
        });

        cells.push(clone);
      });
    });

    return cells;
  }

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
    this.selectedCells.forEach((rect) => rect.destroy());

    this.selectedCells = [];
  }

  selectCells(cells: ICell[]) {
    cells.forEach((cell) => {
      const isFrozenRow = cell.attrs.isFrozenRow;
      const isFrozenCol = cell.attrs.isFrozenCol;

      this.selectedCells.push(cell);

      if (isFrozenRow && isFrozenCol) {
        this.canvas.layers.xyStickyLayer.add(cell);
      } else if (isFrozenRow) {
        this.canvas.layers.yStickyLayer.add(cell);
      } else if (isFrozenCol) {
        this.canvas.layers.xStickyLayer.add(cell);
      } else {
        this.canvas.layers.mainLayer.add(cell);
      }
    });

    this.canvas.eventEmitter.emit(events.selector.selectCells, cells);
  }

  setSelectionBorder() {
    this.isInSelectionMode = false;

    // const totalHeight = this.selectedRowCols.rows.reduce(
    //   (totalHeight, rowGroup) => {
    //     return totalHeight + rowGroup.height();
    //   },
    //   0
    // );

    // const totalWidth = this.selectedRowCols.cols.reduce(
    //   (totalWidth, colGroup) => {
    //     return totalWidth + colGroup.width();
    //   },
    //   0
    // );

    // const colGroup = this.selectedRowCols.cols[0];
    // const rowGroup = this.selectedRowCols.rows[0];

    // const config: RectConfig = {
    //   x: colGroup.x(),
    //   y: rowGroup.y(),
    //   width: totalWidth,
    //   height: totalHeight,
    // };

    // this.shapes.selectionBorder.setAttrs(config);

    // this.canvas.layers.mainLayer.add(this.shapes.selectionBorder);
  }
}

export default Selector;
