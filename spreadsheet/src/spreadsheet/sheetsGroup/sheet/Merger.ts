import events from '../../events';
import { IMergedCells } from '../../options';
import Sheet, {
  Cell,
  CellId,
  getCellId,
  getCellRectFromCell,
  getNewCell,
} from './Sheet';
import { iterateSelection } from './Selector';
import { IRect } from 'konva/lib/types';
import { parseColor } from 'a-color-picker';

export type AssociatedMergedCellId = CellId;

class Merger {
  associatedMergedCellMap: Map<AssociatedMergedCellId, Cell>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.associatedMergedCellMap = new Map();
  }

  updateMergedCells() {
    this.sheet.options.mergedCells.forEach((mergedCells) => {
      const startRow = this.sheet.row.rowColGroupMap.get(mergedCells.row.x);
      const startCol = this.sheet.col.rowColGroupMap.get(mergedCells.col.x);
      const shouldMerge = startCol && startRow ? true : false;

      if (shouldMerge) {
        const id = getCellId(mergedCells.row.x, mergedCells.col.x);
        const existingTopLeftCell = this.sheet.cellsMap.get(id)?.clone();

        this.mergeCells(mergedCells, existingTopLeftCell);

        this.sheet.cellsMap.get(id)!.moveToTop();
      }
    });
  }

  addMergeCells(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);
    const existingTopLeftCell = this.sheet.cellsMap.get(id)?.clone();

    this.destroyExistingMergedCells(mergedCells);
    this.mergeCells(mergedCells, existingTopLeftCell);

    this.sheet.options.mergedCells.push(mergedCells);

    this.sheet.updateViewport();

    this.sheet.emit(events.merge.add, mergedCells);
  }

  private mergeCells(mergedCells: IMergedCells, existingTopLeftCell?: Cell) {
    const { row, col } = mergedCells;
    const id = getCellId(row.x, col.x);
    const startRow = this.sheet.row.rowColGroupMap.get(row.x);
    const startCol = this.sheet.col.rowColGroupMap.get(col.x);

    const rows = this.sheet.row.convertFromRangeToGroups(mergedCells.row);
    const cols = this.sheet.col.convertFromRangeToGroups(mergedCells.col);

    const width = cols.reduce((prev, curr) => {
      return (prev += curr.width());
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += curr.height());
    }, 0);

    const gridLineStrokeWidth = this.sheet.styles.gridLine.strokeWidth!;
    const offset = gridLineStrokeWidth;
    const rect: IRect = {
      x: startCol!.x() + offset,
      y: startRow!.y() + offset,
      width: width - offset * 2,
      height: height - offset * 2,
    };

    let existingTopLeftCellRect;

    if (existingTopLeftCell) {
      existingTopLeftCellRect = getCellRectFromCell(existingTopLeftCell);
    }

    const cell = getNewCell(rect, row, col, {
      groupConfig: {
        id,
        isMerged: true,
      },
    });

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.associatedMergedCellMap.set(id, cell);
        this.sheet.destroyCell(id);
      }
    }

    this.setCellProperties(cell, {
      fill: existingTopLeftCellRect?.fill() ?? this.sheet.options.cell.fill,
    });
  }

  private setCellProperties(
    cell: Cell,
    properties: {
      fill?: string;
    }
  ) {
    const { fill } = properties;

    if (fill) {
      this.sheet.setCellFill(cell, fill);
    }
  }

  private setMergedCellPropertiesToCells(mergedCell: Cell) {
    const outFormat = 'rgbacss';
    const cellRect = getCellRectFromCell(mergedCell);
    const fill = parseColor(cellRect.fill(), outFormat);
    const parsedOptionsFill = parseColor(
      this.sheet.options.cell.fill,
      outFormat
    );
    const rows = this.sheet.row.getItemsBetweenIndexes(mergedCell.attrs.row);
    const cols = this.sheet.col.getItemsBetweenIndexes(mergedCell.attrs.col);
    const cells = this.sheet.convertFromRowColsToCells(rows, cols);

    cells.forEach((cell) => {
      this.setCellProperties(cell, {
        fill: fill !== parsedOptionsFill ? fill : undefined,
      });
    });
  }

  private destroyMergedCell(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);

    if (this.sheet.cellsMap.has(id)) {
      this.sheet.destroyCell(id);

      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.delete(id);
        }
      }
    }
  }

  private getAreMergedCellsOverlapping(
    firstMergedCells: IMergedCells,
    secondMergedCells: IMergedCells
  ) {
    const areMergedCellsOverlapping =
      firstMergedCells.row.x >= secondMergedCells.row.x &&
      firstMergedCells.col.x >= secondMergedCells.col.x &&
      firstMergedCells.row.y <= secondMergedCells.row.y &&
      firstMergedCells.col.y <= secondMergedCells.col.y;

    return areMergedCellsOverlapping;
  }

  private destroyExistingMergedCells(mergedCells: IMergedCells) {
    this.sheet.options.mergedCells = this.sheet.options.mergedCells.filter(
      ({ row, col }) => {
        const shouldDestroy = this.getAreMergedCellsOverlapping(
          { row, col },
          mergedCells
        );

        if (shouldDestroy) {
          this.destroyMergedCell({ row, col });
        }

        return !shouldDestroy;
      }
    );

    this.sheet.updateViewport();
  }

  unMergeCells(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);
    const mergedCell = this.sheet.cellsMap.get(id)?.clone();
    const allMergedCells = [...this.sheet.options.mergedCells];

    this.destroyExistingMergedCells(mergedCells);

    allMergedCells.forEach(({ row, col }) => {
      const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
        { row, col },
        mergedCells
      );

      if (areMergedCellsOverlapping && mergedCell) {
        this.setMergedCellPropertiesToCells(mergedCell);
      }
    });

    this.sheet.emit(events.merge.unMerge, mergedCells);
  }

  mergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(selectedCells);

    this.addMergeCells({ row, col });
  }

  unMergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(selectedCells);

    this.unMergeCells({ row, col });
  }
}

export default Merger;
