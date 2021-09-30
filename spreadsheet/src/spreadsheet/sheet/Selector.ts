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

interface IGroupedCell {
  cells: Cell[];
  rect?: Rect;
}

interface IGroupedCells {
  main: IGroupedCell;
  xSticky: IGroupedCell;
  ySticky: IGroupedCell;
  xySticky: IGroupedCell;
}

class Selector {
  isInSelectionMode = false;
  selectedCell?: Cell;
  selectedCells: Cell[] = [];
  selectedCellId: CellId = '0_0';
  previousSelectedCellId?: CellId;
  groupedCells?: IGroupedCells | null;
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

      const { strokeWidth, stroke } =
        this.spreadsheet.styles.selectionFirstCell;

      const rectConfig: RectConfig = {
        ...this.spreadsheet.styles.selectionFirstCell,
        width: rect.width,
        height: rect.height,
        stroke: undefined,
      };

      // We mut have another Rect for the inside borders
      // as konva does not allow stroke positioning
      const innerSelectedCellRect = new Rect({
        x: strokeWidth! / 2,
        y: strokeWidth! / 2,
        width: rect.width - strokeWidth!,
        height: rect.height - strokeWidth!,
        stroke,
        strokeWidth,
      });

      this.selectedCell.add(innerSelectedCellRect);

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

      this.groupedCells = {
        main: {
          cells: [],
        },
        xSticky: {
          cells: [],
        },
        ySticky: {
          cells: [],
        },
        xySticky: {
          cells: [],
        },
      };

      this.selectedCells.forEach((cell) => {
        const stickyType =
          this.sheet.cellRenderer.getStickyGroupTypeFromCell(cell);

        this.groupedCells![stickyType].cells.push(cell);
      });

      Object.keys(this.groupedCells).forEach((key) => {
        const type = key as keyof IGroupedCells;
        const cells = this.groupedCells![type].cells;

        if (cells.length) {
          const topLeftCellClientRect = cells[0].getClientRect({
            skipStroke: true,
          });

          let minCol = -Infinity;
          let minRow = -Infinity;
          let width = 0;
          let height = 0;

          cells.forEach((cell) => {
            const clientRect = cell.getClientRect({ skipStroke: true });
            const { col, row } = cell.attrs;

            if (col.x > minCol) {
              minCol = col.x;
              width += clientRect.width;
            }

            if (row.y > minRow) {
              minRow = row.y;
              height += clientRect.height;
            }
          });

          const sheetGroup = this.sheet.scrollGroups[type].sheetGroup;

          this.groupedCells![type].rect = new Rect({
            ...this.spreadsheet.styles.selection,
            ...topLeftCellClientRect,
            stroke: undefined,
            width,
            height,
          });

          sheetGroup.add(this.groupedCells![type].rect!);
        }
      });
    }
  }

  destroySelection() {
    this.selectedCell?.destroy();
    Object.keys(this.groupedCells ?? {}).forEach((key) => {
      const type = key as keyof IGroupedCells;

      this.groupedCells?.[type].rect?.destroy();
    });
  }

  updateSelectedCells() {
    this.destroySelection();
    this.renderSelectionArea();
    this.renderSelectedCell();
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

    cellClientRect.x -= Math.abs(this.sheet.col.scrollBar.scroll);
    cellClientRect.y -= Math.abs(this.sheet.row.scrollBar.scroll);

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

    Object.keys(this.groupedCells ?? {}).forEach((key) => {
      const type = key as keyof IGroupedCells;
      const value = this.groupedCells![type];

      if (value.cells.length > 1) {
        value.rect?.stroke(this.spreadsheet.styles.selection.stroke as string);
      }
    });

    this.spreadsheet.eventEmitter.emit(events.selector.endSelection);
  }

  hasChangedCellSelection() {
    return this.selectedCell?.id() !== this.previousSelectedCellId;
  }
}

export default Selector;
