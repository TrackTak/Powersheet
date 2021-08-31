import { Group } from 'konva/lib/Group';
import { NodeConfig } from 'konva/lib/Node';
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

    this.canvas.shapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.canvas.shapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
    this.canvas.shapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
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
        this.removeSelectedCells(false);

        this.selectCells(cells);

        this.selectedFirstCell?.moveToTop();
      }
    }
  };

  onSheetMouseUp = () => {
    this.isInSelectionMode = false;
  };

  startSelection(cells: ISelectedCell[]) {
    this.removeSelectedCells();
    this.isInSelectionMode = true;

    this.selectCells(cells);

    this.selectedFirstCell = cells[0];
  }

  convertFromRowColsToCells(
    rows: Group[],
    cols: Group[],
    selectionShape: Rect
  ) {
    const mergedCellsAddedMap = new Map();
    const cells: ISelectedCell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const mergedCell = this.canvas.merger.associatedMergedCellMap.get(id);
        const group = new Group();

        const pushToCells = (rectConfig: RectConfig) => {
          const clone = selectionShape.clone(rectConfig) as Rect;

          group.add(clone);
          cells.push(group);
        };

        if (mergedCell) {
          const id = mergedCell.id();

          if (!mergedCellsAddedMap.get(id)) {
            const groupConfig: NodeConfig = {
              id,
              isMerged: true,
              x: mergedCell.x(),
              y: mergedCell.y(),
              start: mergedCell.attrs.start,
              end: mergedCell.attrs.end,
            };

            group.setAttrs(groupConfig);

            const rectConfig: RectConfig = {
              width: mergedCell.width(),
              height: mergedCell.height(),
            };
            pushToCells(rectConfig);

            mergedCellsAddedMap.set(id, group);
          }
        } else {
          const groupConfig: NodeConfig = {
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
          };

          group.setAttrs(groupConfig);

          const rectConfig: RectConfig = {
            width: colGroup.width(),
            height: rowGroup.height(),
          };

          pushToCells(rectConfig);
        }
      });
    });

    return cells;
  }

  removeSelectedCells(removeFirstCell = true) {
    this.selectedCells
      .filter((cell) => cell !== this.selectedFirstCell)
      .forEach((cell) => {
        cell.destroy();
      });

    this.selectedCells = [];

    if (this.selectedFirstCell && removeFirstCell) {
      this.selectedFirstCell.destroy();
      this.selectedFirstCell = null;
    }
  }

  selectCells(cells: ISelectedCell[]) {
    cells.forEach((cell) => {
      const isFrozenRow = this.canvas.row.getIsFrozen(cell.attrs.start.row);
      const isFrozenCol = this.canvas.col.getIsFrozen(cell.attrs.start.col);

      this.selectedCells.push(cell);

      if (isFrozenRow && isFrozenCol) {
        this.canvas.scrollGroups.xySticky.add(cell);
      } else if (isFrozenRow) {
        this.canvas.scrollGroups.ySticky.add(cell);
      } else if (isFrozenCol) {
        this.canvas.scrollGroups.xSticky.add(cell);
      } else {
        this.canvas.scrollGroups.main.add(cell);
      }

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

  getSelectedCell() {
    return this.selectedCells[0];
  }
}

export default Selector;
