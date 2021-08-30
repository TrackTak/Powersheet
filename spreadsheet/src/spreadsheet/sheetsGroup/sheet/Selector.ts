import { Group } from 'konva/lib/Group';
import { NodeConfig } from 'konva/lib/Node';
import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Canvas, { convertFromCellsToCellsRange } from './Canvas';
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

export function* iterateSelection(selection: Vector2d) {
  for (let index = selection.x; index <= selection.y; index++) {
    yield index;
  }
}

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
      }
    }
  };

  onSheetMouseUp = () => {
    this.isInSelectionMode = false;

    this.setSelectionBorder();
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
              row: mergedCell.attrs.row,
              col: mergedCell.attrs.col,
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
            row: {
              x: rowGroup.attrs.index,
              y: rowGroup.attrs.index,
            },
            col: {
              x: colGroup.attrs.index,
              y: colGroup.attrs.index,
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
    this.shapes.selectionBorder.destroy();

    if (this.selectedFirstCell && removeFirstCell) {
      this.selectedFirstCell.destroy();
      this.selectedFirstCell = null;
    }
  }

  setOpacity(selectedCell: ISelectedCell) {
    selectedCell.opacity(0.3);
  }

  selectCells(cells: ISelectedCell[]) {
    cells.forEach((cell) => {
      const isFrozenRow = this.canvas.row.getIsFrozen(cell.attrs.row.x);
      const isFrozenCol = this.canvas.col.getIsFrozen(cell.attrs.col.x);

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
        const existingCell = this.canvas.cellsMap.get(cell.id());

        if (existingCell) {
          cell.zIndex(existingCell.zIndex() + 2);
          this.setOpacity(cell);
        } else {
          cell.moveToBottom();
        }
      }
    });

    this.canvas.eventEmitter.emit(events.selector.selectCells, cells);
  }

  setSelectionBorder() {
    if (!this.selectedCells.length) return;

    const { row, col } = convertFromCellsToCellsRange(this.selectedCells);

    let totalWidth = 0;
    let totalHeight = 0;

    for (const ri of iterateSelection(row)) {
      totalHeight += this.canvas.row.rowColGroupMap.get(ri)!.height();
    }

    for (const ci of iterateSelection(col)) {
      totalWidth += this.canvas.col.rowColGroupMap.get(ci)!.width();
    }

    const config: RectConfig = {
      x: this.selectedCells[0].x(),
      y: this.selectedCells[0].y(),
      width: totalWidth,
      height: totalHeight,
    };

    this.shapes.selectionBorder.setAttrs(config);

    this.canvas.scrollGroups.main.add(this.shapes.selectionBorder);
  }
}

export default Selector;
