import { Shape } from 'konva/lib/Shape';
import { RectConfig } from 'konva/lib/shapes/Rect';
import { IRect, Vector2d } from 'konva/lib/types';
import events from '../events';
import Spreadsheet from '../Spreadsheet';
import { Cell } from './CellRenderer';
import Sheet, { getCellRectFromCell } from './Sheet';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

class Selector {
  isInSelectionMode: boolean;
  selectedCells: Cell[];
  selectionBorderCell: Cell | null;
  selectedFirstCell: Cell | null;
  previousSelectedCellPosition?: IRect;
  private selectionArea: ISelectionArea;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
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
  }

  updateSelectedCells() {
    if (!this.selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(this.selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(this.selectedCells);

    const rows = this.sheet.row.convertFromRangeToRowCols(row);
    const cols = this.sheet.col.convertFromRangeToRowCols(col);

    const cells = this.sheet.cellRenderer.convertFromRowColsToCells(rows, cols);

    this.setCells(cells);

    const cell = cells.find((x) => x.id() === this.selectedFirstCell?.id());

    if (cell) {
      this.setFirstCell(cell);
    }

    this.selectCells(cells);
  }

  startSelection(x: number, y: number) {
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

    this.isInSelectionMode = true;
    this.previousSelectedCellPosition = this.selectedFirstCell?.getClientRect();

    const { rows, cols } = this.sheet.getRowColsBetweenVectors(start, end);

    const cells = this.sheet.cellRenderer.convertFromRowColsToCells(rows, cols);
    const selectedFirstCell = cells[0];

    this.setFirstCell(selectedFirstCell);
    this.selectCells(cells);

    this.sheet.updateViewport();

    this.spreadsheet.emit(
      events.selector.startSelection,
      this.sheet,
      selectedFirstCell
    );
  }

  moveSelection() {
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

      const cells = this.sheet.cellRenderer.convertFromRowColsToCells(
        rows,
        cols
      );

      if (this.selectedCells.length !== cells.length) {
        this.setCells(cells);

        this.removeSelectedCells(false);

        this.selectCells(cells);
        this.spreadsheet.toolbar?.updateActiveStates();

        this.spreadsheet.emit(events.selector.moveSelection, cells);
      }
    }
  }

  endSelection() {
    this.isInSelectionMode = false;

    this.setSelectionBorder();

    this.spreadsheet.emit(events.selector.endSelection);
  }

  setFirstCell(cell: Cell) {
    this.removeSelectedCells();

    const firstCellRect = getCellRectFromCell(cell);

    const rectConfig: RectConfig = this.spreadsheet.styles.selectionFirstCell;

    firstCellRect.setAttrs(rectConfig);

    const offsetAmount = firstCellRect.strokeWidth() / 2;

    cell.x(cell.x() + offsetAmount);
    cell.y(cell.y() + offsetAmount);

    firstCellRect.width(firstCellRect.width() - firstCellRect.strokeWidth());
    firstCellRect.height(firstCellRect.height() - firstCellRect.strokeWidth());

    this.selectedFirstCell = cell;
  }

  setCells(cells: Cell[]) {
    if (cells.length !== 1) {
      cells.forEach((cell) => {
        const rectConfig: RectConfig = this.spreadsheet.styles.selection;
        const rect = getCellRectFromCell(cell);

        rect.setAttrs(rectConfig);
      });
    }
  }

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

      this.sheet.cellRenderer.addCell(cell);
    });
  }

  hasChangedCellSelection() {
    const viewportVector = this.sheet.getViewportVector();
    const previousSelectedCellPosition = this.previousSelectedCellPosition;

    if (!previousSelectedCellPosition) {
      return true;
    }

    const { x, y } = {
      x:
        this.sheet.shapes.sheet.getRelativePointerPosition().x +
        viewportVector.x,
      y:
        this.sheet.shapes.sheet.getRelativePointerPosition().y +
        viewportVector.y,
    };
    const hasCellXPosMoved = !(
      x >= previousSelectedCellPosition.x &&
      x <= previousSelectedCellPosition.x + previousSelectedCellPosition.width
    );

    const hasCellYPosMoved = !(
      y >= previousSelectedCellPosition.y &&
      y <= previousSelectedCellPosition.y + previousSelectedCellPosition.height
    );

    return hasCellXPosMoved || hasCellYPosMoved;
  }

  setSelectionBorder() {
    if (!this.selectedCells.length) return;

    // const row = this.sheet.row.convertFromCellsToRange(this.selectedCells);
    // const col = this.sheet.col.convertFromCellsToRange(this.selectedCells);

    // const rows = this.sheet.row.convertFromRangeToRowCols(row);
    // const cols = this.sheet.col.convertFromRangeToRowCols(col);

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

    // cellRect.setAttrs(this.spreadsheet.styles.selectionBorder);

    // this.sheet.drawCell(cell);

    // this.selectionBorderCell = cell;
  }
}

export default Selector;
