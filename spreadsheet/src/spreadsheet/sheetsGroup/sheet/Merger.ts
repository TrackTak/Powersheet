import { Group } from 'konva/lib/Group';
import { KonvaEventObject, Node } from 'konva/lib/Node';
import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import events from '../../events';
import { IMergedCells } from '../../options';
import Canvas, { CellId } from './Canvas';
import { performanceProperties } from './canvasStyles';

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

interface IShapes {
  mergedCells: Rect;
}

class Merger {
  mergedCellsMap: Map<CellId, Shape>;
  mergedCellsGroup: Group;
  private shapes: IShapes;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
    this.mergedCellsMap = new Map();
    this.shapes = {
      mergedCells: new Rect({
        ...performanceProperties,
        listening: true,
        fill: 'white',
      }),
    };
    this.mergedCellsGroup = new Group();

    this.canvas.layers.mainLayer.add(this.mergedCellsGroup);

    this.canvas.eventEmitter.on(events.resize.row.end, this.onResizeEnd);
    this.canvas.eventEmitter.on(events.resize.col.end, this.onResizeEnd);

    this.shapes.mergedCells.on('mousedown', this.onMergedCellsMousedown);
    this.shapes.mergedCells.on('mousemove', this.onMergedCellsMousemove);
    this.shapes.mergedCells.on('mouseup', this.onMergedCellsMouseup);
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

  onMergedCellsMousedown = (e: KonvaEventObject<MouseEvent>) => {
    const mergedShape = e.target as Shape;
    const cell = this.canvas.selector.convertShapeToCell(mergedShape);

    this.canvas.selector.startSelection([cell]);
  };

  onMergedCellsMousemove = (e: KonvaEventObject<MouseEvent>) => {
    const mergedCell = e.target as Shape;

    if (this.canvas.selector.isInSelectionMode) {
      const cells = this.canvas.selector.selectedCells;
      const cell = this.canvas.selector.convertShapeToCell(mergedCell, {
        strokeWidth: 0,
      });
      const cellAlreadyExists = cells.find((x) => x.id === cell.id);

      if (!cellAlreadyExists) {
        this.canvas.selector.selectCells([...cells, cell]);

        const firstSelectedCell = this.canvas.selector.selectedCells.find(
          (x) => x.attrs.strokeWidth
        )!;

        firstSelectedCell.moveToTop();
      }
    }
    //this.canvas.selector.moveSelection();
  };

  onMergedCellsMouseup = () => {
    this.canvas.selector.setSelectionBorder();
  };

  updateMergedCells() {
    const generator = this.mergeCells(this.canvas.options.mergedCells);

    for (const { id } of generator) {
      this.mergedCellsMap.get(id)!.moveToTop();
    }
  }

  addMergeCells(cells: IMergedCells[]) {
    const generator = this.mergeCells(cells);

    for (const { start, end, shouldMerge } of generator) {
      if (shouldMerge) {
        this.canvas.options.mergedCells.push({ start, end });
      }
    }
  }

  private *mergeCells(cells: IMergedCells[]) {
    for (let index = 0; index < cells.length; index++) {
      const { start, end } = cells[index];
      const id = getCellId(start.row, start.col);
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
          id,
          start,
          end,
        };

        const rect = this.shapes.mergedCells.clone(rectConfig) as Rect;

        if (this.mergedCellsMap.has(id)) {
          this.mergedCellsMap.get(id)!.destroy();
        }

        this.mergedCellsMap.set(id, rect);

        this.mergedCellsGroup.add(rect);
      }
      yield { start, end, id, shouldMerge };
    }
  }

  private destroyMergedCell(start: IMergedCells['start']) {
    const id = getCellId(start.row, start.col);

    if (this.mergedCellsMap.has(id)) {
      this.mergedCellsMap.get(id)!.destroy();

      this.mergedCellsMap.delete(id);
    }
  }

  unMergeCells(mergedCells: IMergedCells[]) {
    this.canvas.options.mergedCells = this.canvas.options.mergedCells.filter(
      ({ start, end }) => {
        const shouldUnMerge = mergedCells.some(
          (z) =>
            z.start.row === start.row &&
            z.start.col === start.col &&
            z.end.row === end.row &&
            z.end.col === end.col
        );

        if (shouldUnMerge) {
          this.destroyMergedCell(start);
        }

        return !shouldUnMerge;
      }
    );
  }

  mergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCellsGroup.children!;

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
    const selectedCells = this.canvas.selector.selectedCellsGroup.children!;

    if (!selectedCells.length) {
      return;
    }

    const mergedCells = selectedCells.map((x) => {
      return {
        start: x.attrs.start,
        end: x.attrs.end,
      };
    });

    this.unMergeCells(mergedCells);
  }
}

export default Merger;
