import { Node } from 'konva/lib/Node';
import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import events from '../../events';
import { IMergedCells } from '../../options';
import Canvas, { CellId } from './Canvas';
import { performanceProperties } from './canvasStyles';

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

    this.canvas.eventEmitter.on(events.resize.row.end, this.onResizeEnd);
    this.canvas.eventEmitter.on(events.resize.col.end, this.onResizeEnd);
  }

  destroy() {
    this.canvas.eventEmitter.off(events.resize.row.end, this.onResizeEnd);
    this.canvas.eventEmitter.off(events.resize.col.end, this.onResizeEnd);

    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  onResizeEnd = () => {
    this.updateMergedCells();
  };

  updateMergedCells() {
    const generator = this.mergeCells(this.canvas.options.mergedCells);

    for (const { mergedCellId } of generator) {
      this.mergedCellsMap.get(mergedCellId)!.moveToTop();
    }
  }

  addMergeCells(cells: IMergedCells[]) {
    const generator = this.mergeCells(cells);

    for (const { start, end, shouldMerge } of generator) {
      if (shouldMerge) {
        this.canvas.options.mergedCells.push({ start, end });

        this.canvas.selector.removeSelectedCells();
      }
    }
  }

  private *mergeCells(cells: IMergedCells[]) {
    for (let index = 0; index < cells.length; index++) {
      const { start, end } = cells[index];
      const mergedCellId = getCellId(start.row, start.col);
      const startCol = this.canvas.col.rowColGroupMap.get(start.col);
      const startRow = this.canvas.row.rowColGroupMap.get(start.row);
      const shouldMerge = startCol && startRow ? true : false;

      if (shouldMerge) {
        let height = 0;
        let width = 0;

        for (let index = start.row; index <= end.row; index++) {
          const group = this.canvas.row.rowColGroupMap.get(index)!;

          height += group.height();
        }

        for (let index = start.col; index <= end.col; index++) {
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
          start,
          end,
        };

        const rect = this.shapes.mergedCells.clone(rectConfig) as Rect;

        if (this.mergedCellsMap.has(mergedCellId)) {
          this.mergedCellsMap.get(mergedCellId)!.destroy();
        }

        for (let ri = start.row; ri <= end.row; ri++) {
          for (let ci = start.col; ci <= end.col; ci++) {
            const id = getCellId(ri, ci);

            this.associatedMergedCellMap.set(id, rect);
          }
        }

        this.mergedCellsMap.set(mergedCellId, rect);

        this.canvas.scrollGroups.main.add(rect);
      }
      yield { start, end, mergedCellId, shouldMerge };
    }
  }

  private destroyMergedCell(start: IMergedCells['start']) {
    const mergedCellId = getCellId(start.row, start.col);

    if (this.mergedCellsMap.has(mergedCellId)) {
      const mergedCell = this.mergedCellsMap.get(mergedCellId)!;

      const start = mergedCell.attrs.start;
      const end = mergedCell.attrs.end;

      for (let ri = start.row; ri <= end.row; ri++) {
        for (let ci = start.col; ci <= end.col; ci++) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellMap.delete(id);
        }
      }

      mergedCell.destroy();

      this.mergedCellsMap.delete(mergedCellId);
    }
  }

  unMergeCells(mergedCells: MergedCell[]) {
    if (mergedCells.length && this.canvas.options.mergedCells.length) {
      this.canvas.selector.removeSelectedCells();
    }

    this.canvas.options.mergedCells = this.canvas.options.mergedCells.filter(
      ({ start, end }) => {
        const shouldUnMerge = mergedCells.some(
          (z) =>
            z.attrs.start.row === start.row &&
            z.attrs.start.col === start.col &&
            z.attrs.end.row === end.row &&
            z.attrs.end.col === end.col
        );

        if (shouldUnMerge) {
          this.destroyMergedCell(start);
        }

        return !shouldUnMerge;
      }
    );
  }

  mergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCells;

    if (!selectedCells.length) {
      return;
    }

    const getMin = (property: string) =>
      Math.min(...selectedCells.map((o) => o.attrs.start[property]));
    const getMax = (property: string) =>
      Math.max(...selectedCells.map((o) => o.attrs.end[property]));

    const start = {
      row: getMin('row'),
      col: getMin('col'),
    };

    const end = {
      row: getMax('row'),
      col: getMax('col'),
    };

    this.addMergeCells([{ start, end }]);
  }

  unMergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCells;

    if (!selectedCells.length) {
      return;
    }

    const mergedCells = selectedCells.map((selectedCell) => {
      return this.mergedCellsMap.get(selectedCell.attrs.id)!;
    });

    this.unMergeCells(mergedCells);
  }
}

export default Merger;
