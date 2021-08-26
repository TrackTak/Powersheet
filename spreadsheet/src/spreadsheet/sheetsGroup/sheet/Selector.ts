import { Node } from 'konva/lib/Node';
import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Canvas from './Canvas';
import { getCellId } from './Merger';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

interface IShapes {
  selection: Rect;
  selectionFirstCell: Rect;
  selectionBorder: Rect;
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

interface ICell extends Rect {}

class Selector {
  shapes!: IShapes;
  isInSelectionMode: boolean;
  selectedCells: ICell[];
  selectedFirstCell: ICell | null;
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
    this.selectedFirstCell = null;

    this.shapes = {
      selectionBorder: new Rect({
        ...this.canvas.styles.selectionBorder,
      }),
      selectionFirstCell: new Rect({
        ...this.canvas.styles.selectionFirstCell,
        firstCell: true,
      }),
      selection: new Rect({
        ...this.canvas.styles.selection,
      }),
    };

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

    const cells = this.convertFromRowColsToCells(
      rows,
      cols,
      this.shapes.selectionFirstCell
    );

    this.startSelection(cells);
  };

  onSheetMouseMove = () => {
    this.moveSelection();
  };

  onSheetMouseUp = () => {
    this.setSelectionBorder();
  };

  startSelection(cells: ICell[]) {
    this.removeSelectedCells(true);
    this.isInSelectionMode = true;

    this.selectCells(cells);

    this.selectedFirstCell = cells[0];
  }

  moveSelection() {
    if (this.isInSelectionMode) {
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

      const cells = this.convertFromRowColsToCells(
        rows,
        cols,
        this.shapes.selection
      );

      this.removeSelectedCells();

      // TODO: Make this func more efficient by only calling when we go to a new cell
      this.selectCells(cells);

      this.selectedCells = cells;
      this.selectedFirstCell?.moveToTop();
    }
  }

  convertShapeToCell(shape: Shape) {
    const clone = this.shapes.selection.clone({
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
    selectionShape: Rect
  ) {
    const cells: ICell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);

        const clone = selectionShape.clone({
          id,
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
      this.removeSelectedCells(true);
    }
  };

  onResizeColEnd = () => {
    if (this.selectedCells) {
      this.removeSelectedCells(true);
    }
  };

  removeSelectedCells(removeFirstCell = false) {
    this.shapes.selectionBorder.destroy();
    this.selectedCells.forEach((rect) => rect.destroy());

    this.selectedCells = [];

    if (this.selectedFirstCell && removeFirstCell) {
      this.selectedFirstCell.destroy();
      this.selectedFirstCell = null;
    }
  }

  selectCells(cells: ICell[]) {
    cells.forEach((cell) => {
      const isFrozenRow = cell.attrs.isFrozenRow;
      const isFrozenCol = cell.attrs.isFrozenCol;

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

    if (!this.selectedCells.length) return;

    const getMin = (property: string) =>
      Math.min(...this.selectedCells.map((o) => o.attrs.start[property]));
    const getMax = (property: string) =>
      Math.max(...this.selectedCells.map((o) => o.attrs.end[property]));

    const start = {
      row: getMin('row'),
      col: getMin('col'),
    };

    const end = {
      row: getMax('row'),
      col: getMax('col'),
    };

    let totalWidth = 0;
    let totalHeight = 0;

    for (let index = start.row; index <= end.row; index++) {
      totalHeight += this.canvas.row.groups[index].height();
    }

    for (let index = start.col; index <= end.col; index++) {
      totalWidth += this.canvas.col.groups[index].width();
    }

    const config: RectConfig = {
      x: this.selectedCells[0].x(),
      y: this.selectedCells[0].y(),
      width: totalWidth,
      height: totalHeight,
    };

    this.shapes.selectionBorder.setAttrs(config);

    this.canvas.layers.mainLayer.add(this.shapes.selectionBorder);
  }
}

export default Selector;
