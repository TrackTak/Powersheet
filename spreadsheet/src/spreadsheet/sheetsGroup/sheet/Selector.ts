import { Container } from 'konva/lib/Container';
import { Group } from 'konva/lib/Group';
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

interface ISelectedCell extends Group {}

interface ISelectedCellsGroup extends Group {}

class Selector {
  shapes!: IShapes;
  isInSelectionMode: boolean;
  selectedCellsGroup: ISelectedCellsGroup;
  selectedFirstCell: ISelectedCell | null;
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

    this.selectedCellsGroup = new Group();

    this.canvas.layers.mainLayer.add(this.selectedCellsGroup);

    this.canvas.eventEmitter.on(events.resize.row.end, this.onResizeEnd);
    this.canvas.eventEmitter.on(events.resize.col.end, this.onResizeEnd);

    this.canvas.shapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.canvas.shapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
    this.canvas.shapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
  }

  destroy() {
    this.canvas.eventEmitter.off(events.resize.row.end, this.onResizeEnd);
    this.canvas.eventEmitter.off(events.resize.col.end, this.onResizeEnd);

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

  startSelection(cells: ISelectedCell[]) {
    this.removeSelectedCells(true);
    this.isInSelectionMode = true;
    this.selectedCellsGroup.moveToBottom();

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

      if (this.selectedCellsGroup.children!.length !== cells.length) {
        this.removeSelectedCells();

        this.selectCells(cells);

        this.selectedFirstCell?.moveToTop();
      }
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
    rows: Group[],
    cols: Group[],
    selectionShape: Rect
  ) {
    const cells: ISelectedCell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const group = new Group({
          id,
          start: {
            row: rowGroup.attrs.index,
            col: colGroup.attrs.index,
          },
          end: {
            row: rowGroup.attrs.index,
            col: colGroup.attrs.index,
          },
          x: colGroup.x(),
          y: rowGroup.y(),
        });
        const config: RectConfig = {
          //   isFrozenRow: this.canvas.row.getIsFrozen(rowGroup.attrs.index),
          //   isFrozenCol: this.canvas.col.getIsFrozen(colGroup.attrs.index),
          width: colGroup.width(),
          height: rowGroup.height(),
        };
        const clone = selectionShape.clone(config);

        group.add(clone);
        cells.push(group);
      });
    });

    return cells;
  }

  onResizeEnd = () => {
    if (this.selectedCellsGroup.children!.length) {
      this.removeSelectedCells(true);
    }
  };

  removeSelectedCells(removeFirstCell = false) {
    this.selectedCellsGroup.children
      ?.filter((x) => x !== this.selectedFirstCell)
      .forEach((x) => x.destroy());

    if (this.selectedFirstCell && removeFirstCell) {
      this.selectedFirstCell.destroy();
      this.selectedFirstCell = null;
    }
  }

  selectCells(cells: ISelectedCell[]) {
    cells.forEach((cell) => {
      const isFrozenRow = cell.attrs.isFrozenRow;
      const isFrozenCol = cell.attrs.isFrozenCol;

      if (isFrozenRow && isFrozenCol) {
        // this.canvas.layers.xyStickyLayer.add(cell);
      } else if (isFrozenRow) {
        //   this.canvas.layers.yStickyLayer.add(cell);
      } else if (isFrozenCol) {
        //    this.canvas.layers.xStickyLayer.add(cell);
      } else {
        this.selectedCellsGroup.add(cell);
      }
    });

    this.canvas.eventEmitter.emit(events.selector.selectCells, cells);
  }

  setSelectionBorder() {
    this.isInSelectionMode = false;

    if (!this.selectedCellsGroup.children!.length) return;

    const getMin = (property: string) =>
      Math.min(
        ...this.selectedCellsGroup.children!.map((o) => o.attrs.start[property])
      );
    const getMax = (property: string) =>
      Math.max(
        ...this.selectedCellsGroup.children!.map((o) => o.attrs.end[property])
      );

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
      totalHeight += this.canvas.row.rowColGroupMap.get(index)!.height();
    }

    for (let index = start.col; index <= end.col; index++) {
      totalWidth += this.canvas.col.rowColGroupMap.get(index)!.width();
    }

    const config: RectConfig = {
      width: totalWidth,
      height: totalHeight,
    };

    this.shapes.selectionBorder.setAttrs(config);

    (this.selectedCellsGroup.children![0] as Container<Shape>).add(
      this.shapes.selectionBorder
    );
  }
}

export default Selector;
