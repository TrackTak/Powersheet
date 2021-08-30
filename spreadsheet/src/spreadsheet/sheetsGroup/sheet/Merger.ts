import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import events from '../../events';
import { IMergedCells } from '../../options';
import Canvas, { CellId, convertFromCellsToCellsRange } from './Canvas';
import { performanceProperties } from './canvasStyles';
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

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
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
    this.canvas.options.mergedCells.forEach((mergedCells) => {
      const { mergedCellId } = this.mergeCells(mergedCells);

      this.mergedCellsMap.get(mergedCellId)!.moveToTop();
    });
  }

  addMergeCells(mergedCells: IMergedCells) {
    this.unMergeCells(mergedCells);

    const { shouldMerge } = this.mergeCells(mergedCells);

    if (shouldMerge) {
      this.canvas.options.mergedCells.push(mergedCells);

      this.canvas.selector.removeSelectedCells();
    }

    this.canvas.eventEmitter.emit(events.merge.add, mergedCells);
  }

  private mergeCells(mergedCells: IMergedCells) {
    const { row, col } = mergedCells;
    const mergedCellId = getCellId(row.x, col.x);
    const startRow = this.canvas.row.rowColGroupMap.get(row.x);
    const startCol = this.canvas.col.rowColGroupMap.get(col.x);
    const shouldMerge = startCol && startRow ? true : false;

    if (shouldMerge) {
      let height = 0;
      let width = 0;

      for (const index of iterateSelection(mergedCells.row)) {
        const group = this.canvas.row.rowColGroupMap.get(index)!;

        height += group.height();
      }

      for (const index of iterateSelection(mergedCells.col)) {
        const group = this.canvas.col.rowColGroupMap.get(index)!;

        width += group.width();
      }

      const gridLineStrokeWidth = this.canvas.styles.gridLine.strokeWidth!;
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

      this.canvas.scrollGroups.main.add(rect);
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
    this.canvas.options.mergedCells = this.canvas.options.mergedCells.filter(
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

    this.canvas.selector.removeSelectedCells();

    this.canvas.eventEmitter.emit(events.merge.unMerge, mergedCells);
  }

  mergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCells;

    if (!selectedCells.length) return;

    const mergedCells = convertFromCellsToCellsRange(selectedCells);

    this.addMergeCells(mergedCells);
  }

  unMergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCells;

    if (!selectedCells.length) return;

    const mergedCells = convertFromCellsToCellsRange(selectedCells);

    this.unMergeCells(mergedCells);
  }
}

export default Merger;
