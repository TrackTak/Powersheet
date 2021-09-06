import events from '../../events';
import Sheet, {
  Cell,
  CellId,
  getCellId,
  getCellRectFromCell,
  IMergedCells,
  makeShapeCrisp,
} from './Sheet';
import { iterateSelection } from './Selector';
import { IRect } from 'konva/lib/types';
import { parseColor } from 'a-color-picker';
import { Line, LineConfig } from 'konva/lib/shapes/Line';

export type AssociatedMergedCellId = CellId;

const defaultCellFill = 'white';

class Merger {
  associatedMergedCellIdMap: Map<AssociatedMergedCellId, CellId>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.associatedMergedCellIdMap = new Map();
  }

  updateMergedCells() {
    this.sheet.data.mergedCells.forEach((mergedCells) => {
      const startRow = this.sheet.row.rowColGroupMap.get(mergedCells.row.x);
      const startCol = this.sheet.col.rowColGroupMap.get(mergedCells.col.x);
      const shouldMerge = startCol && startRow ? true : false;

      if (shouldMerge) {
        const id = getCellId(mergedCells.row.x, mergedCells.col.x);
        const existingTopLeftCell = this.sheet.cellsMap.get(id)?.clone();

        this.mergeCells(mergedCells, existingTopLeftCell);
      }
    });

    // this.removeGridLinesForMergedCells();
  }

  addMergeCells(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);
    const existingTopLeftCell = this.sheet.cellsMap.get(id)?.clone();

    this.destroyExistingMergedCells(mergedCells);
    this.mergeCells(mergedCells, existingTopLeftCell);

    this.sheet.data.mergedCells.push(mergedCells);

    this.sheet.updateViewport();

    this.sheet.emit(events.merge.add, mergedCells);
  }

  private mergeCells(mergedCells: IMergedCells, existingTopLeftCell?: Cell) {
    const { row, col } = mergedCells;
    const mergedCellId = getCellId(row.x, col.x);
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

    const rect: IRect = {
      x: startCol!.x(),
      y: startRow!.y(),
      width: width,
      height: height,
    };

    let existingTopLeftCellRect;

    if (existingTopLeftCell) {
      existingTopLeftCellRect = getCellRectFromCell(existingTopLeftCell);
    }

    const mergedCell = this.sheet.getNewCell(mergedCellId, rect, row, col);

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.associatedMergedCellIdMap.set(id, mergedCellId);
        this.sheet.destroyCell(id);
      }
    }

    const colLineConfig: LineConfig = {
      x: width,
      points: [0, 0, 0, height],
    };
    const rowLineConfig: LineConfig = {
      y: height,
      points: [0, 0, width, 0],
    };

    const colLine = this.sheet.col.shapes.gridLine.clone(colLineConfig) as Line;
    const rowLine = this.sheet.row.shapes.gridLine.clone(rowLineConfig) as Line;

    makeShapeCrisp(colLine);
    makeShapeCrisp(rowLine);

    mergedCell.add(colLine, rowLine);

    this.sheet.cellsMap.set(mergedCellId, mergedCell);

    this.resetCellStylesForAssociatedCells(mergedCell);

    this.sheet.setCellStyle(mergedCellId, {
      backgroundColor: existingTopLeftCellRect?.fill() ?? defaultCellFill,
    });
  }

  private resetCellStylesForAssociatedCells(mergedCell: Cell) {
    for (const ri of iterateSelection(mergedCell.attrs.row)) {
      for (const ci of iterateSelection(mergedCell.attrs.col)) {
        const id = getCellId(ri, ci);

        if (id !== mergedCell.id()) {
          delete this.sheet.data.cellStyles[id];
        }
      }
    }
  }

  private setMergedCellStylesToCells(mergedCell: Cell) {
    const id = mergedCell.id();
    const outFormat = 'rgbacss';
    const cellStyle = this.sheet.data.cellStyles[id];
    const fill = parseColor(
      cellStyle.backgroundColor ?? defaultCellFill,
      outFormat
    );
    const borders = cellStyle.borders;
    const rows = this.sheet.row.getItemsBetweenIndexes(mergedCell.attrs.row);
    const cols = this.sheet.col.getItemsBetweenIndexes(mergedCell.attrs.col);
    const cells = this.sheet.convertFromRowColsToCells(rows, cols);

    cells.forEach((cell) => {
      this.sheet.setCellStyle(cell.id(), {
        backgroundColor: fill,
        borders,
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

          this.associatedMergedCellIdMap.delete(id);
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
    this.sheet.data.mergedCells = this.sheet.data.mergedCells.filter(
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
  }

  getIsCellMerged(id: CellId) {
    return this.associatedMergedCellIdMap.has(id ?? '');
  }

  unMergeCells(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);
    const allMergedCells = [...this.sheet.data.mergedCells];
    const mergedCell = this.sheet.cellsMap.get(id)?.clone();

    this.destroyExistingMergedCells(mergedCells);

    allMergedCells.forEach(({ row, col }) => {
      const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
        { row, col },
        mergedCells
      );

      if (areMergedCellsOverlapping && mergedCell) {
        this.setMergedCellStylesToCells(mergedCell);
      }
    });

    this.sheet.updateViewport();

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
