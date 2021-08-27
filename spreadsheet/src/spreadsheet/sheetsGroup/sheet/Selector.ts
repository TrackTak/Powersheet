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
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

interface ISelectedCell extends Group {}

class Selector {
  shapes!: IShapes;
  isInSelectionMode: boolean;
  selectedCells: Group[];
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
      selectionFirstCell: new Rect({
        ...this.canvas.styles.selectionFirstCell,
        firstCell: true,
      }),
      selection: new Rect({
        ...this.canvas.styles.selection,
      }),
    };

    this.selectedCells = [];

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
    this.isInSelectionMode = false;
  };

  startSelection(cells: ISelectedCell[]) {
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

      if (this.selectedCells.length !== cells.length) {
        this.removeSelectedCells();

        this.selectCells(cells);

        this.selectedFirstCell?.moveToTop();
      }
    }
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
        const mergedCell = this.canvas.merger.associatedMergedCellMap.get(id);

        if (mergedCell) {
          const group = new Group({
            id: mergedCell.id(),
            isMerged: true,
            x: mergedCell.x(),
            y: mergedCell.y(),
          });
          const config: RectConfig = {
            width: mergedCell.width(),
            height: mergedCell.height(),
          };
          const clone = selectionShape.clone(config) as Rect;

          group.add(clone);
          cells.push(group);
        } else {
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
            width: colGroup.width(),
            height: rowGroup.height(),
          };
          const clone = selectionShape.clone(config) as Rect;

          group.add(clone);
          cells.push(group);
        }
      });
    });

    return cells;
  }

  onResizeEnd = () => {
    if (this.selectedCells.length) {
      this.removeSelectedCells(true);
    }
  };

  removeSelectedCells(removeFirstCell = false) {
    this.selectedCells
      .filter((cell) => cell !== this.selectedFirstCell)
      .forEach((cell) => {
        cell.destroy();
      });

    if (this.selectedFirstCell && removeFirstCell) {
      this.selectedFirstCell.destroy();
      this.selectedFirstCell = null;
    }
  }

  selectCells(cells: ISelectedCell[]) {
    cells.forEach((cell) => {
      // const isFrozenRow = this.canvas.row.getIsFrozen(cell.attrs.start.row);
      // const isFrozenCol = this.canvas.col.getIsFrozen(cell.attrs.start.col);

      this.selectedCells.push(cell);

      // if (isFrozenRow && isFrozenCol) {
      //   this.canvas.scrollGroups.xySticky.add(cell);
      // } else if (isFrozenRow) {
      //   this.canvas.scrollGroups.ySticky.add(cell);
      // } else if (isFrozenCol) {
      //   this.canvas.scrollGroups.xSticky.add(cell);
      // } else {
      this.canvas.scrollGroups.main.add(cell);
      // }

      if (cell.attrs.isMerged) {
        const mergedCell = this.canvas.merger.mergedCellsMap.get(
          cell.attrs.id
        )!;

        cell.zIndex(mergedCell.zIndex() + 1);
      } else {
        cell.moveToBottom();
      }
    });

    this.canvas.eventEmitter.emit(events.selector.selectCells, cells);
  }
}

export default Selector;
