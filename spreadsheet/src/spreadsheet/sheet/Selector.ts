import { Shape } from 'konva/lib/Shape';
import { Rect } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import events from '../events';
import Spreadsheet from '../Spreadsheet';
import SelectedCell from './cell/SelectedCell';
import SimpleCellAddress from './cell/SimpleCellAddress';
import Sheet from './Sheet';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

interface ISelectionArea {
  start: Vector2d;
  end: Vector2d;
}

interface IGroupedCell {
  cells: SelectedCell[];
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
  selectedCell?: SelectedCell;
  selectedCells: SelectedCell[] = [];
  selectedSimpleCellAddress: SimpleCellAddress;
  previousSelectedSimpleCellAddress?: SimpleCellAddress;
  groupedCells?: IGroupedCells | null;
  selectionArea?: ISelectionArea | null;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;

    this.selectedSimpleCellAddress = new SimpleCellAddress(sheet.sheetId, 0, 0);
  }

  private renderSelectedCell() {
    if (this.selectedSimpleCellAddress) {
      this.selectedCell?.destroy();

      this.selectedCell = new SelectedCell(
        this.sheet,
        this.selectedSimpleCellAddress
      );

      const stickyGroup = this.selectedCell.getStickyGroupCellBelongsTo();
      const sheetGroup = this.sheet.scrollGroups[stickyGroup].sheetGroup;

      sheetGroup.add(this.selectedCell.group);
    }
  }

  private renderSelectionArea() {
    if (this.selectionArea) {
      Object.keys(this.groupedCells ?? {}).forEach((key) => {
        const type = key as keyof IGroupedCells;

        this.groupedCells?.[type].rect?.destroy();
      });

      const rangeSimpleCellAddress =
        this.sheet.convertVectorsToRangeSimpleCellAddress(
          this.selectionArea.start,
          this.selectionArea.end
        );

      this.selectedCells = rangeSimpleCellAddress.getCellsBetweenRange(
        this.sheet,
        (simpleCellAddress) => {
          return new SelectedCell(this.sheet, simpleCellAddress);
        }
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
        const stickyGroup = cell.getStickyGroupCellBelongsTo();

        this.groupedCells![stickyGroup].cells.push(cell);
      });

      Object.keys(this.groupedCells).forEach((key) => {
        const type = key as keyof IGroupedCells;
        const cells = this.groupedCells![type].cells;

        this.groupedCells?.[type].rect?.destroy();

        if (cells.length) {
          const topLeftCellClientRect = cells[0].getClientRectWithoutStroke();

          let minCol = -Infinity;
          let minRow = -Infinity;
          let width = 0;
          let height = 0;

          cells.forEach((cell) => {
            const clientRect = cell.getClientRectWithoutStroke();
            const { topLeftSimpleCellAddress, bottomRightSimpleCellAddress } =
              cell.rangeSimpleCellAddress;

            if (topLeftSimpleCellAddress.col > minCol) {
              minCol = topLeftSimpleCellAddress.col;
              width += clientRect.width;
            }

            if (bottomRightSimpleCellAddress.row > minRow) {
              minRow = bottomRightSimpleCellAddress.row;
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

  updateSelectedCells() {
    this.renderSelectionArea();
    this.renderSelectedCell();
  }

  startSelection(vector: Vector2d) {
    this.previousSelectedSimpleCellAddress =
      this.selectedCell?.simpleCellAddress;
    this.selectionArea = null;

    const rangeSimpleCellAddress =
      this.sheet.convertVectorsToRangeSimpleCellAddress(vector, vector);

    const cell = rangeSimpleCellAddress.getCellsBetweenRange(
      this.sheet,
      (simpleCellAddress) => {
        return new SelectedCell(this.sheet, simpleCellAddress);
      }
    )[0];

    const rect = cell.getClientRectWithoutStroke();

    if (!cell.isOnFrozenCol()) {
      rect.x -= Math.abs(this.sheet.col.scrollBar.scroll);
    }

    if (!cell.isOnFrozenRow()) {
      rect.y -= Math.abs(this.sheet.row.scrollBar.scroll);
    }

    this.selectionArea = {
      start: {
        x: rect.x + 0.1,
        y: rect.y + 0.1,
      },
      end: {
        x: rect.x + rect.width,
        y: rect.y + rect.height,
      },
    };

    this.isInSelectionMode = true;

    this.selectedSimpleCellAddress = cell.simpleCellAddress;

    this.sheet.updateViewport();

    this.spreadsheet.eventEmitter.emit(
      events.selector.startSelection,
      this.sheet,
      this.selectionArea
    );
  }

  moveSelection() {
    if (this.isInSelectionMode) {
      const { x, y } = this.sheet.sheet.getRelativePointerPosition();
      const selectedCellRect = this.selectedCell!.getClientRectWithoutStroke();

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
    return (
      this.selectedCell?.simpleCellAddress !==
      this.previousSelectedSimpleCellAddress
    );
  }
}

export default Selector;
