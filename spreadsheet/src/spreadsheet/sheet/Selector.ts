import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../events';
import Spreadsheet from '../Spreadsheet';
import { Cell, CellId } from './CellRenderer';
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
  isInSelectionMode = false;
  selectedCell?: Cell;
  selectedCells: Cell[] = [];
  selectedCellId: CellId = '0_0';
  previousSelectedCellId?: CellId;
  selectionRect?: Rect;
  selectionArea?: ISelectionArea | null;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
  }

  private renderSelectedCell() {
    if (this.selectedCellId) {
      this.selectedCell = this.sheet.cellRenderer.convertFromCellIdToCell(
        this.selectedCellId
      );

      const rect = this.selectedCell.getClientRect({
        skipStroke: true,
      });
      const cellRect = getCellRectFromCell(this.selectedCell);

      const rectConfig: RectConfig = {
        ...this.spreadsheet.styles.selectionFirstCell,
        width: rect.width,
        height: rect.height,
      };

      this.selectedCell.position({
        x: rect.x,
        y: rect.y,
      });

      cellRect.setAttrs(rectConfig);

      this.sheet.cellRenderer.addCell(this.selectedCell);
    }
  }

  private renderSelectionArea() {
    if (this.selectionArea) {
      const { rows, cols } = this.sheet.getRowColsBetweenVectors(
        this.selectionArea.start,
        this.selectionArea.end
      );

      this.selectedCells = this.sheet.cellRenderer.convertFromRowColsToCells(
        rows,
        cols
      );

      const topLeftCellClientRect = this.selectedCells[0].getClientRect({
        skipStroke: true,
      });

      const width = cols.reduce((prev, curr) => {
        return (prev += curr.width());
      }, 0);

      const height = rows.reduce((prev, curr) => {
        return (prev += curr.height());
      }, 0);

      const sheetGroup = this.sheet.scrollGroups.main.sheetGroup;

      this.selectionRect = new Rect({
        ...this.spreadsheet.styles.selection,
        ...topLeftCellClientRect,
        width,
        height,
      });

      sheetGroup.add(this.selectionRect);
    }
  }

  destroySelection() {
    this.selectedCell?.destroy();
    this.selectionRect?.destroy();
  }

  updateSelectedCells() {
    this.destroySelection();
    this.renderSelectedCell();
    this.renderSelectionArea();
  }

  startSelection(x: number, y: number) {
    this.previousSelectedCellId = this.selectedCell?.id();
    this.selectionArea = null;

    const { rows, cols } = this.sheet.getRowColsBetweenVectors(
      {
        x,
        y,
      },
      {
        x,
        y,
      }
    );

    const cell = this.sheet.cellRenderer.convertFromRowColsToCells(
      rows,
      cols
    )[0];

    const cellClientRect = cell.getClientRect({ skipStroke: true });

    this.selectionArea = {
      start: {
        x: cellClientRect.x + 0.1,
        y: cellClientRect.y + 0.1,
      },
      end: {
        x: cellClientRect.x + cellClientRect.width,
        y: cellClientRect.y + cellClientRect.height,
      },
    };

    this.isInSelectionMode = true;

    this.selectedCellId = cell.id();

    this.sheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      events.selector.startSelection,
      this.sheet,
      this.selectionArea
    );
  }

  moveSelection() {
    if (this.isInSelectionMode) {
      const { x, y } = this.sheet.shapes.sheet.getRelativePointerPosition();
      const selectedCellRect = this.selectedCell!.getClientRect({
        skipStroke: true,
      });

      this.selectionArea = {
        start: {
          x: selectedCellRect.x,
          y: selectedCellRect.y,
        },
        end: {
          x,
          y,
        },
      };

      // We don't update sheet viewport for performance reasons
      this.updateSelectedCells();
      this.spreadsheet.toolbar?.updateActiveStates();

      this.spreadsheet.eventEmitter.emit(
        events.selector.moveSelection,
        this.selectionArea
      );
    }
  }

  endSelection() {
    this.isInSelectionMode = false;

    this.setSelectionBorder();

    this.spreadsheet.eventEmitter.emit(events.selector.endSelection);
  }

  hasChangedCellSelection() {
    return this.selectedCell?.id() !== this.previousSelectedCellId;
  }

  setSelectionBorder() {
    // if (!this.selectedCells.length) return;
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
