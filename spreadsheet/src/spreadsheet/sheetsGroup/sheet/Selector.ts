import { Shape } from 'konva/lib/Shape';
import { RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../../events';
import Sheet, { Cell, getCellRectFromCell, makeShapeCrisp } from './Sheet';

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

    this.sheet.shapes.sheet.on('mousedown', this.onSheetMouseDown);
    this.sheet.shapes.sheet.on('mousemove', this.onSheetMouseMove);
    this.sheet.shapes.sheet.on('mouseup', this.onSheetMouseUp);
    this.sheet.eventEmitter.on(events.sheet.load, this.onSheetLoad);
  }

  onSheetLoad = () => {
    this.startSelection({ x: 0, y: 0 }, { x: 0, y: 0 });
  };

  updateSelectedCells() {
    if (!this.selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(this.selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(this.selectedCells);

    const rows = this.sheet.row.convertFromRangeToGroups(row);
    const cols = this.sheet.col.convertFromRangeToGroups(col);

    const cells = this.sheet.convertFromRowColsToCells(rows, cols);

    this.setCells(cells);

    const cell = cells.find((x) => x.id() === this.selectedFirstCell?.id());

    if (cell) {
      this.setFirstCell(cell);
    }

    this.selectCells(cells);
  }

  startSelection(start: Vector2d, end: Vector2d) {
    const { rows, cols } = this.sheet.getRowColsBetweenVectors(start, end);

    const cells = this.sheet.convertFromRowColsToCells(rows, cols);

    this.setFirstCell(cells[0]);
    this.selectCells(cells);

    this.sheet.toolbar?.setFocusedSheet(this.sheet);
    this.sheet.toolbar?.setToolbarState();

    this.sheet.emit(
      events.selector.startSelection,
      this.sheet,
      this.selectedFirstCell
    );
  }

  setFirstCell(cell: Cell) {
    this.removeSelectedCells();

    const firstCellRect = getCellRectFromCell(cell);

    const rectConfig: RectConfig = this.sheet.styles.selectionFirstCell;

    firstCellRect.setAttrs(rectConfig);

    const offsetAmount = firstCellRect.strokeWidth() / 2;

    cell.x(cell.x() + offsetAmount);
    cell.y(cell.y() + offsetAmount);

    firstCellRect.width(firstCellRect.width() - firstCellRect.strokeWidth());
    firstCellRect.height(firstCellRect.height() - firstCellRect.strokeWidth());

    makeShapeCrisp(firstCellRect);

    this.selectedFirstCell = cell;
  }

  setCells(cells: Cell[]) {
    if (cells.length !== 1) {
      cells.forEach((cell) => {
        const rectConfig: RectConfig = this.sheet.styles.selection;
        const rect = getCellRectFromCell(cell);

        rect.setAttrs(rectConfig);
      });
    }
  }

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

      const cells = this.sheet.convertFromRowColsToCells(rows, cols);

      if (this.selectedCells.length !== cells.length) {
        this.setCells(cells);

        this.removeSelectedCells(false);

        this.selectCells(cells);

        this.sheet.toolbar?.setToolbarState();

        this.sheet.emit(events.selector.moveSelection, cells);
      }
    }
  };

  onSheetMouseUp = () => {
    this.isInSelectionMode = false;

    this.setSelectionBorder();

    this.sheet.emit(events.selector.endSelection);
  };

  removeSelectedCells(destroySelectedFirstCell: boolean = true) {
    this.selectedCells
      .filter((cell) => cell !== this.selectedFirstCell)
      .forEach((cell) => {
        cell.destroy();
      });

    this.selectedCells = [];

    if (destroySelectedFirstCell && this.selectedFirstCell) {
      this.selectedFirstCell.destroy();
    }

    if (this.selectionBorderCell) {
      this.selectionBorderCell.destroy();
      this.selectionBorderCell = null;
    }
  }

  selectCells(cells: Cell[]) {
    cells.forEach((cell) => {
      this.selectedCells.push(cell);

      this.sheet.drawCell(cell);

      cell.moveToTop();
    });
  }

  setSelectionBorder() {
    if (!this.selectedCells.length) return;

    // const row = this.sheet.row.convertFromCellsToRange(this.selectedCells);
    // const col = this.sheet.col.convertFromCellsToRange(this.selectedCells);

    // const rows = this.sheet.row.convertFromRangeToGroups(row);
    // const cols = this.sheet.col.convertFromRangeToGroups(col);

    // const width = cols.reduce((prev, curr) => {
    //   return (prev += curr.width());
    // }, 0);

    // const height = rows.reduce((prev, curr) => {
    //   return (prev += curr.height());
    // }, 0);

    // const indexZeroCell = this.selectedCells[0];

    // const rect: IRect = {
    //   x: indexZeroCell.x(),
    //   y: indexZeroCell.y(),
    //   width,
    //   height,
    // };

    // const cell = this.sheet.getCell(
    //   null,
    //   rect,
    //   indexZeroCell.attrs.row,
    //   indexZeroCell.attrs.col
    // );

    // const cellRect = getCellRectFromCell(cell);

    // cellRect.setAttrs(this.sheet.styles.selectionBorder);

    // this.sheet.drawCell(cell);

    // this.selectionBorderCell = cell;
  }
}

export default Selector;
