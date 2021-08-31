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
      const { mergedCellId } = this.mergeCells(mergedCells);

      this.sheet.cellsMap.get(mergedCellId)!.moveToTop();
    });
  }

  addMergeCells(mergedCells: IMergedCells) {
    this.unMergeCells(mergedCells);

    const { shouldMerge } = this.mergeCells(mergedCells);

    if (shouldMerge) {
      this.sheet.options.mergedCells.push(mergedCells);

      this.sheet.selector.removeSelectedCells();
    }

    this.sheet.emit(events.merge.add, mergedCells);
  }

  private mergeCells(mergedCells: IMergedCells) {
    const { row, col } = mergedCells;
    const mergedCellId = getCellId(row.x, col.x);
    const startRow = this.sheet.row.rowColGroupMap.get(row.x);
    const startCol = this.sheet.col.rowColGroupMap.get(col.x);
    const shouldMerge = startCol && startRow ? true : false;

    if (shouldMerge) {
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

      const cell = this.sheet.getNewCell(mergedCellId, rect, row, col, {
        groupConfig: {
          isMerged: true,
        },
        rectConfig: {
          fill: 'white',
        },
      });

      if (this.sheet.cellsMap.has(mergedCellId)) {
        this.sheet.cellsMap.get(mergedCellId)!.destroy();
      }

      this.sheet.cellsMap.set(mergedCellId, cell);

      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.set(id, cell);
        }
      }

      this.sheet.drawCell(cell);
    }

    return { mergedCellId, shouldMerge };
  }

  private destroyMergedCell(mergedCells: IMergedCells) {
    const mergedCellId = getCellId(mergedCells.row.x, mergedCells.col.x);

    if (this.sheet.cellsMap.has(mergedCellId)) {
      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.delete(id);
        }
      }
    }

    this.sheet.destroyCell(mergedCellId);
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
