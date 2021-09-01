import { Shape } from 'konva/lib/Shape';
import { IRect, Vector2d } from 'konva/lib/types';
import events from '../../events';
import Sheet, { Cell, convertFromCellsToCellsRange, getNewCell } from './Sheet';

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
  selectedCells: Cell[];
  selectionBorderCell: Cell | null;
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

    const cells = this.sheet.convertFromRowColsToCells(rows, cols, {
      rectConfig: this.sheet.styles.selectionFirstCell,
    });

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

      const cells = this.sheet.convertFromRowColsToCells(rows, cols, {
        rectConfig: this.sheet.styles.selection,
      });

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

    const cell = getNewCell(
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
}

export default Selector;
