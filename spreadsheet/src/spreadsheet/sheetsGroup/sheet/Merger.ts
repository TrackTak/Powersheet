import { Group } from 'konva/lib/Group';
import { KonvaEventObject, Node } from 'konva/lib/Node';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { IRect } from 'konva/lib/types';
import { IMergedCells } from '../../options';
import Canvas from './Canvas';
import { performanceProperties } from './canvasStyles';
import { RowColType } from './RowCol';

type MergedCellId = string;

export interface IMergedCellIndexesMap {
  row: Record<string, MergedCellId>;
  col: Record<string, MergedCellId>;
}

export type MergedCellsMap = Record<MergedCellId, Shape>;

export const getMergedCellId = (ri: number, ci: number) => `${ri}_${ci}`;

interface IShapes {
  mergedCells: Rect;
}

class Merger {
  mergedCellIndexesMap: IMergedCellIndexesMap;
  mergedCellsMap: MergedCellsMap;
  mergedCells: Group[];
  private shapes: IShapes;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
    this.mergedCellIndexesMap = {
      row: {},
      col: {},
    };
    this.mergedCellsMap = {};
    this.mergedCells = [];
    this.shapes = {
      mergedCells: new Rect({
        ...performanceProperties,
        listening: true,
        fill: 'white',
        stroke: '#c6c6c6',
        strokeWidth: 0.6,
      }),
    };

    this.shapes.mergedCells.on('mousedown', this.onMergedCellsMousedown);
    this.shapes.mergedCells.on('mousemove', this.onMergedCellsMousemove);
    this.shapes.mergedCells.on('mouseup', this.onMergedCellsMouseup);
  }

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

  destroy() {
    Object.values(this.shapes).forEach((shape: Node) => {
      shape.destroy();
    });
  }

  setMergedCells(mergedCells: IMergedCells[]) {
    mergedCells.forEach(({ start, end }) => {
      if (
        this.canvas.col.groups[start.col] &&
        this.canvas.row.groups[start.row]
      ) {
        const startCol = this.canvas.col.groups[start.col];
        const startRow = this.canvas.row.groups[start.row];

        let mergedCellRect: IRect = {
          x: startCol.x(),
          y: startRow.y(),
          height: 0,
          width: 0,
        };

        for (let index = start.row; index <= end.row; index++) {
          const group = this.canvas.row.groups[index];

          mergedCellRect.height += group.height();
        }

        for (let index = start.col; index <= end.col; index++) {
          const group = this.canvas.col.groups[index];

          mergedCellRect.width += group.width();
        }

        const id = `${start.row}_${start.col}`;

        for (let index = start.row; index <= end.row; index++) {
          this.mergedCellIndexesMap.row[index] = id;
        }

        for (let index = start.col; index <= end.col; index++) {
          this.mergedCellIndexesMap.col[index] = id;
        }

        const rectConfig: RectConfig = {
          ...mergedCellRect,
          id: getMergedCellId(start.row, start.col),
          colIndex: start.col,
          rowIndex: start.row,
        };

        const rect = this.shapes.mergedCells.clone(rectConfig) as Rect;

        this.mergedCellsMap[id] = rect;

        this.canvas.layers.mainLayer.add(rect);
      }
    });

    this.canvas.options.mergedCells = mergedCells;
  }

  mergeSelectedCells() {
    const selectedRowCols = this.canvas.selector.selectedRowCols;

    if (!selectedRowCols.rows.length || !selectedRowCols.cols.length) {
      return;
    }

    const start = {
      row: selectedRowCols.rows[0].attrs.index,
      col: selectedRowCols.cols[0].attrs.index,
    };

    const end = {
      row: selectedRowCols.rows[selectedRowCols.rows.length - 1].attrs.index,
      col: selectedRowCols.cols[selectedRowCols.cols.length - 1].attrs.index,
    };

    const mergedSelectedRow = selectedRowCols.rows.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedRow) {
      // && mergedSelectedRow.attrs.index >= end.row) {
      let totalRowHeight = this.canvas.row.groups[start.row].height();

      while (totalRowHeight < mergedSelectedRow.height()) {
        end.row += 1;
        totalRowHeight += this.canvas.row.groups[end.row].height();
      }
    }

    const mergedSelectedCol = selectedRowCols.cols.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedCol) {
      // && mergedSelectedCol.attrs.index >= end.col) {
      let totalColWidth = this.canvas.col.groups[start.col].width();

      while (totalColWidth < mergedSelectedCol.width()) {
        end.col += 1;
        totalColWidth += this.canvas.col.groups[end.col].width();
      }
    }

    this.mergeCells([{ start, end }]);
  }

  unmergeSelectedCells() {
    const selectedRowCols = this.canvas.selector.selectedRowCols;

    if (!selectedRowCols.rows.length || !selectedRowCols.cols.length) {
      return;
    }

    const areAllRowsMerged = selectedRowCols.rows.every(
      (row) => row.attrs.isMerged
    );
    const areAllColsMerged = selectedRowCols.cols.every(
      (col) => col.attrs.isMerged
    );

    if (areAllRowsMerged && areAllColsMerged) {
      let { index: rowIndex, height } = selectedRowCols.rows[0].attrs;

      const startRowIndex = rowIndex;

      while (height > 0) {
        height -= this.canvas.row.groups[rowIndex].height();
        rowIndex += 1;
      }

      let { index: colIndex, width } = selectedRowCols.cols[0].attrs;

      const startColIndex = colIndex;

      while (width > 0) {
        width -= this.canvas.col.groups[colIndex].width();
        colIndex += 1;
      }

      const mergedCellToRemove = this.canvas.options.mergedCells.findIndex(
        (x) => x.start.row === startRowIndex && x.start.col === startColIndex
      );

      this.canvas.options.mergedCells.splice(mergedCellToRemove, 1);

      this.setMergedCells(this.canvas.options.mergedCells);

      for (let index = startRowIndex; index < rowIndex; index++) {
        this.canvas.row.drawGridLines(index);
      }

      for (let index = startColIndex; index < colIndex; index++) {
        this.canvas.col.drawGridLines(index);
      }
    }
  }

  mergeCells(cells: IMergedCells[]) {
    const doesOverlapCells = (x: IMergedCells) => {
      return !cells.some((z) => {
        return (
          x.start.row >= z.start.row &&
          x.end.row <= z.end.row &&
          x.start.col >= z.start.col &&
          x.end.col <= z.end.col
        );
      });
    };

    const existingMergedCells =
      this.canvas.options.mergedCells.filter(doesOverlapCells);
    const mergedCells = [...existingMergedCells, ...cells];

    this.setMergedCells(mergedCells);

    for (let index = 0; index < cells.length; index++) {
      const { start, end } = cells[index];

      for (let index = start.row; index <= end.row; index++) {
        this.canvas.row.drawGridLines(index);
      }

      for (let index = start.col; index <= end.col; index++) {
        this.canvas.col.drawGridLines(index);
      }
    }
  }
}

export default Merger;
