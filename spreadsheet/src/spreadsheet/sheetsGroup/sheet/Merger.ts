import events from '../../events';
import { IMergedCells } from '../../options';
import Sheet, {
  Cell,
  CellId,
  convertFromCellsToCellsRange,
  getCellId,
} from './Sheet';
import { iterateSelection } from './Selector';
import { IRect } from 'konva/lib/types';

export type AssociatedMergedCellId = CellId;

class Merger {
  associatedMergedCellMap: Map<AssociatedMergedCellId, Cell>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.associatedMergedCellMap = new Map();
  }

  updateMergedCells() {
    this.sheet.options.mergedCells.forEach((mergedCells) => {
      const id = this.mergeCells(mergedCells);
      const startRow = this.sheet.row.rowColGroupMap.get(mergedCells.row.x);
      const startCol = this.sheet.col.rowColGroupMap.get(mergedCells.col.x);
      const shouldMerge = startCol && startRow ? true : false;

      if (shouldMerge) {
        this.sheet.cellsMap.get(id)!.moveToTop();
      }
    });
  }

  addMergeCells(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);
    const existingTopLeftCell = this.sheet.cellsMap.get(id);

    this.unMergeCells(mergedCells);
    this.mergeCells(mergedCells, existingTopLeftCell);

    this.sheet.options.mergedCells.push(mergedCells);

    this.sheet.selector.removeSelectedCells();

    this.sheet.emit(events.merge.add, mergedCells);
  }

  private mergeCells(mergedCells: IMergedCells, existingTopLeftCell?: Cell) {
    const { row, col } = mergedCells;
    const id = getCellId(row.x, col.x);
    const startRow = this.sheet.row.rowColGroupMap.get(row.x);
    const startCol = this.sheet.col.rowColGroupMap.get(col.x);
    let height = 0;
    let width = 0;

    for (const index of iterateSelection(mergedCells.row)) {
      const group = this.sheet.row.rowColGroupMap.get(index)!;

      height += group.height();
    }

    for (const index of iterateSelection(mergedCells.col)) {
      const group = this.sheet.col.rowColGroupMap.get(index)!;

      width += group.width();
    }

    const gridLineStrokeWidth = this.sheet.styles.gridLine.strokeWidth!;
    const offset = gridLineStrokeWidth;
    const rect: IRect = {
      x: startCol!.x() + offset,
      y: startRow!.y() + offset,
      height: height - offset * 2,
      width: width - offset * 2,
    };

    let existingTopLeftCellRect;

    if (existingTopLeftCell) {
      existingTopLeftCellRect = this.sheet.getCellRectFromCell(id);
    }

    const cell = this.sheet.getNewCell(rect, row, col, {
      groupConfig: {
        id,
        isMerged: true,
      },
      rectConfig: {
        fill: existingTopLeftCellRect?.fill() ?? 'white',
      },
    });

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.associatedMergedCellMap.set(id, cell);
        this.sheet.destroyCell(id);
      }
    }

    this.sheet.cellsMap.set(id, cell);

    this.sheet.drawCell(cell);

    return id;
  }

  private destroyMergedCell(mergedCells: IMergedCells) {
    const id = getCellId(mergedCells.row.x, mergedCells.col.x);

    if (this.sheet.cellsMap.has(id)) {
      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.delete(id);
        }
      }
    }

    this.sheet.destroyCell(id);
  }

  unMergeCells(mergedCells: IMergedCells) {
    this.sheet.options.mergedCells = this.sheet.options.mergedCells.filter(
      ({ row, col }) => {
        const shouldUnMerge =
          row.x >= mergedCells.row.x &&
          col.x >= mergedCells.col.x &&
          row.y <= mergedCells.row.y &&
          col.y <= mergedCells.col.y;

        if (shouldUnMerge) {
          this.destroyMergedCell({ row, col });
        }

        return !shouldUnMerge;
      }
    );

    this.sheet.selector.removeSelectedCells();

    this.sheet.emit(events.merge.unMerge, mergedCells);
  }

  mergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const mergedCells = convertFromCellsToCellsRange(selectedCells);

    this.addMergeCells(mergedCells);
  }

  unMergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const mergedCells = convertFromCellsToCellsRange(selectedCells);

    this.unMergeCells(mergedCells);
  }
}

export default Merger;
