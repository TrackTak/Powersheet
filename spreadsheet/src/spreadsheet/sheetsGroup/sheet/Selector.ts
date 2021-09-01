import { Group } from 'konva/lib/Group';
import { Shape } from 'konva/lib/Shape';
import { RectConfig } from 'konva/lib/shapes/Rect';
import { IRect, Vector2d } from 'konva/lib/types';
import events from '../../events';
import Sheet, { Cell, convertFromCellsToCellsRange, getCellId } from './Sheet';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

export function* iterateSelection(selection: Vector2d) {
  for (let index = selection.x; index <= selection.y; index++) {
    yield index;
  }
}

class Selector {
  isInSelectionMode: boolean;
  selectedCells: Group[];
  selectionBorderCell: Group | null;
  selectedFirstCell: Cell | null;
  private selectionArea: ISelectionArea;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
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
    this.selectionBorderCell = null;

    this.selectedCells = [];

    this.sheet.shapes.sheetGroup.on('mousedown', this.onSheetMouseDown);
    this.sheet.shapes.sheetGroup.on('mousemove', this.onSheetMouseMove);
    this.sheet.shapes.sheetGroup.on('mouseup', this.onSheetMouseUp);
    this.sheet.eventEmitter.on(events.sheet.load, this.onSheetLoad);
  }

  onSheetLoad = () => {
    this.startSelection({ x: 0, y: 0 }, { x: 0, y: 0 });
  };

  onSheetMouseDown = () => {
    const { x, y } = this.sheet.shapes.sheet.getRelativePointerPosition();

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

    this.startSelection(start, end);

    this.isInSelectionMode = true;
  };

  startSelection(start: Vector2d, end: Vector2d) {
    if (this.selectedFirstCell) {
      this.selectedFirstCell.destroy();
    }

    this.removeSelectedCells();

    const { rows, cols } = this.sheet.getRowColsBetweenVectors(start, end);

    const cells = this.convertFromRowColsToCells(
      rows,
      cols,
      this.sheet.styles.selectionFirstCell
    );

    this.selectCells(cells);

    this.selectedFirstCell = cells[0];

    this.sheet.emit(
      events.selector.startSelection,
      this.sheet,
      this.selectedFirstCell
    );
  }

  onSheetMouseMove = () => {
    if (this.isInSelectionMode) {
      const { x, y } = this.sheet.shapes.sheet.getRelativePointerPosition();

      const start = {
        x: this.selectionArea.start.x,
        y: this.selectionArea.start.y,
      };

      this.selectionArea.end = {
        x,
        y,
      };

      const { rows, cols } = this.sheet.getRowColsBetweenVectors(
        start,
        this.selectionArea.end
      );

      const cells = this.convertFromRowColsToCells(
        rows,
        cols,
        this.sheet.styles.selection
      );

      if (this.selectedCells.length !== cells.length) {
        this.removeSelectedCells();

        this.selectCells(cells);

        this.sheet.emit(events.selector.moveSelection, cells);
      }
    }
  };

  onSheetMouseUp = () => {
    this.isInSelectionMode = false;

    this.setSelectionBorder();

    this.sheet.emit(events.selector.endSelection);
  };

  convertFromRowColsToCells(
    rows: Group[],
    cols: Group[],
    rectConfig?: RectConfig
  ) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const mergedCell = this.sheet.merger.associatedMergedCellMap.get(id);

        if (mergedCell) {
          const id = mergedCell.id();

          if (!mergedCellsAddedMap.get(id)) {
            const rect = mergedCell.getClientRect();
            const cell = this.sheet.getNewCell(
              rect,
              mergedCell.attrs.row,
              mergedCell.attrs.col,
              {
                groupConfig: {
                  id,
                  isMerged: true,
                },
                rectConfig,
              }
            );

            cells.push(cell);

            mergedCellsAddedMap.set(id, cell);
          }
        } else {
          const rect: IRect = {
            x: colGroup.x(),
            y: rowGroup.y(),
            width: colGroup.width(),
            height: rowGroup.height(),
          };
          const row = {
            x: rowGroup.attrs.index,
            y: rowGroup.attrs.index,
          };

          const col = {
            x: colGroup.attrs.index,
            y: colGroup.attrs.index,
          };

          const cell = this.sheet.getNewCell(rect, row, col, {
            groupConfig: {
              id,
            },
            rectConfig,
          });

          cells.push(cell);
        }
      });
    });

    return cells;
  }

  removeSelectedCells() {
    this.selectedCells
      .filter((cell) => cell !== this.selectedFirstCell)
      .forEach((cell) => {
        cell.destroy();
      });

    this.selectedCells = [];

    if (this.selectionBorderCell) {
      this.selectionBorderCell.destroy();
      this.selectionBorderCell = null;
    }
  }

  selectCells(cells: Cell[]) {
    cells.forEach((cell) => {
      this.selectedCells.push(cell);

      this.sheet.drawCell(cell);

      const existingCell = this.sheet.cellsMap.get(cell.id());

      if (existingCell) {
        cell.moveToTop();
      } else {
        cell.moveToBottom();
      }
    });
  }

  setSelectionBorder() {
    if (!this.selectedCells.length) return;

    const { row, col } = convertFromCellsToCellsRange(this.selectedCells);

    let totalWidth = 0;
    let totalHeight = 0;

    for (const ri of iterateSelection(row)) {
      totalHeight += this.sheet.row.rowColGroupMap.get(ri)!.height();
    }

    for (const ci of iterateSelection(col)) {
      totalWidth += this.sheet.col.rowColGroupMap.get(ci)!.width();
    }

    const indexZeroCell = this.selectedCells[0];

    const rect: IRect = {
      x: indexZeroCell.x(),
      y: indexZeroCell.y(),
      width: totalWidth,
      height: totalHeight,
    };

    const cell = this.sheet.getNewCell(
      rect,
      indexZeroCell.attrs.row,
      indexZeroCell.attrs.col,
      {
        rectConfig: this.sheet.styles.selectionBorder,
      }
    );

    // this.sheet.drawCell(cell);

    this.selectionBorderCell = cell;
  }

  getSelectedCell() {
    return this.selectedCells[0];
  }
}

export default Selector;
