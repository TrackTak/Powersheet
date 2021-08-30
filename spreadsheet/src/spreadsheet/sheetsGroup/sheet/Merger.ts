import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import events from '../../events';
import { IMergedCells } from '../../options';
import Sheet, { CellId, convertFromCellsToCellsRange } from './Sheet';
import { performanceProperties } from './styles';
import { iterateSelection } from './Selector';

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export type AssociatedMergedCellId = CellId;

export type MergedCell = Shape;

interface IShapes {
  mergedCells: Rect;
}

class Merger {
  associatedMergedCellMap: Map<AssociatedMergedCellId, MergedCell>;
  mergedCellsMap: Map<CellId, MergedCell>;
  private shapes: IShapes;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.mergedCellsMap = new Map();
    this.associatedMergedCellMap = new Map();
    this.shapes = {
      mergedCells: new Rect({
        ...performanceProperties,
        fill: 'white',
      }),
    };
  }

  updateMergedCells() {
    this.sheet.options.mergedCells.forEach((mergedCells) => {
      const { mergedCellId } = this.mergeCells(mergedCells);

      this.mergedCellsMap.get(mergedCellId)!.moveToTop();
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

      const rectConfig: RectConfig = {
        x: startCol!.x() + offset,
        y: startRow!.y() + offset,
        height: height - offset * 2,
        width: width - offset * 2,
        id: mergedCellId,
        row,
        col,
      };

      const rect = this.shapes.mergedCells.clone(rectConfig) as Rect;

      if (this.mergedCellsMap.has(mergedCellId)) {
        this.mergedCellsMap.get(mergedCellId)!.destroy();
      }

      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.set(id, rect);
        }
      }

      this.mergedCellsMap.set(mergedCellId, rect);

      this.sheet.scrollGroups.main.add(rect);
    }

    return { mergedCellId, shouldMerge };
  }

  private destroyMergedCell(mergedCells: IMergedCells) {
    const mergedCellId = getCellId(mergedCells.row.x, mergedCells.col.x);

    if (this.mergedCellsMap.has(mergedCellId)) {
      const mergedCell = this.mergedCellsMap.get(mergedCellId)!;

      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.delete(id);
        }
      }

      mergedCell.destroy();

      this.mergedCellsMap.delete(mergedCellId);
    }
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
