import { Shape } from 'konva/lib/Shape';
import { Rect } from 'konva/lib/shapes/Rect';
import { Vector2d } from 'konva/lib/types';
import Spreadsheet from '../Spreadsheet';
import SelectedCell from './cells/cell/SelectedCell';
import SimpleCellAddress from './cells/cell/SimpleCellAddress';
import Sheets from './Sheets';

export interface ISelectedRowCols {
  rows: Shape[];
  cols: Shape[];
}

export interface ISelectionArea {
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

  constructor(private sheets: Sheets) {
    this.sheets = sheets;
    this.spreadsheet = this.sheets.spreadsheet;

    this.selectedSimpleCellAddress = new SimpleCellAddress(
      this.sheets.activeSheetId,
      0,
      0
    );
  }

  private renderSelectedCell() {
    if (this.selectedSimpleCellAddress) {
      this.selectedCell?.destroy();

      this.selectedCell = new SelectedCell(
        this.sheets,
        this.selectedSimpleCellAddress
      );

      const stickyGroup = this.selectedCell.getStickyGroupCellBelongsTo();
      const sheetGroup = this.sheets.scrollGroups[stickyGroup].sheetGroup;

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
        this.sheets.convertVectorsToRangeSimpleCellAddress(
          this.selectionArea.start,
          this.selectionArea.end
        );

      this.selectedCells = rangeSimpleCellAddress.getCellsBetweenRange(
        this.sheets,
        (simpleCellAddress) => {
          return new SelectedCell(this.sheets, simpleCellAddress);
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
          const topLeftCellPosition = cells[0].rect.position();

          let width = 0;
          let height = 0;

          const minMaxRangeSimpleCellAddress =
            this.sheets.getMinMaxRangeSimpleCellAddress(cells);

          for (const index of minMaxRangeSimpleCellAddress.iterateFromTopToBottom(
            'row'
          )) {
            height += this.sheets.rows.getSize(index);
          }

          for (const index of minMaxRangeSimpleCellAddress.iterateFromTopToBottom(
            'col'
          )) {
            width += this.sheets.cols.getSize(index);
          }

          const sheetGroup = this.sheets.scrollGroups[type].sheetGroup;

          this.groupedCells![type].rect = new Rect({
            ...this.spreadsheet.styles.selection,
            ...topLeftCellPosition,
            name: 'selectionRect',
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
      this.sheets.convertVectorsToRangeSimpleCellAddress(vector, vector);

    const cell = rangeSimpleCellAddress.getCellsBetweenRange(
      this.sheets,
      (simpleCellAddress) => {
        return new SelectedCell(this.sheets, simpleCellAddress);
      }
    )[0];

    const rect = cell.getClientRectWithoutStroke();

    if (!cell.isCellOnFrozenCol()) {
      rect.x -= Math.abs(this.sheets.cols.scrollBar.scroll);
    }

    if (!cell.isCellOnFrozenRow()) {
      rect.y -= Math.abs(this.sheets.rows.scrollBar.scroll);
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

    this.spreadsheet.updateViewport();

    this.spreadsheet.eventEmitter.emit('startSelection', this.selectionArea);
  }

  moveSelection() {
    if (this.isInSelectionMode) {
      const { x, y } = this.sheets.sheet.getRelativePointerPosition();
      const selectedCellPosition = this.selectedCell!.rect.position();

      this.selectionArea = {
        start: selectedCellPosition,
        end: {
          x,
          y,
        },
      };

      // We don't update sheet viewport for performance reasons
      this.updateSelectedCells();
      this.spreadsheet.toolbar?.updateActiveStates();

      this.spreadsheet.eventEmitter.emit('moveSelection', this.selectionArea);
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

    this.spreadsheet.eventEmitter.emit('endSelection', this.selectionArea!);
  }

  hasChangedCellSelection() {
    return (
      this.selectedCell?.simpleCellAddress.toCellId() !==
      this.previousSelectedSimpleCellAddress?.toCellId()
    );
  }
}

export default Selector;
