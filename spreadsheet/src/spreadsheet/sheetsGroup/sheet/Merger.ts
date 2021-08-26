import { KonvaEventObject, Node } from 'konva/lib/Node';
import { Shape } from 'konva/lib/Shape';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { IMergedCells } from '../../options';
import Canvas from './Canvas';
import { performanceProperties } from './canvasStyles';

// export interface IMergedCellsMap {
//   row: Record<string, Shape[]>;
//   col: Record<string, Shape[]>;
// }

export type MergedCellsId = string;

export type MergedCellsMap = Record<MergedCellsId, Shape>;

export const getMergedCellId = (ri: number, ci: number): MergedCellsId =>
  `${ri}_${ci}`;

interface IShapes {
  mergedCells: Rect;
}

class Merger {
  mergedCellsMap: MergedCellsMap;
  private shapes: IShapes;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
    this.mergedCellsMap = {};
    this.shapes = {
      mergedCells: new Rect({
        ...performanceProperties,
        listening: true,
        fill: 'white',
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

  updateMergedCells() {
    const generator = this.mergeCells(this.canvas.options.mergedCells);

    for (const { id } of generator) {
      this.mergedCellsMap[id].moveToTop();
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
      const id = getMergedCellId(start.row, start.col);
      const shouldMerge =
        this.canvas.col.groups[start.col] &&
        this.canvas.row.groups[start.row] &&
        !this.mergedCellsMap[id];

      if (shouldMerge) {
        const startCol = this.canvas.col.groups[start.col];
        const startRow = this.canvas.row.groups[start.row];

        let height = 0;
        let width = 0;

        for (let index = start.row; index <= end.row; index++) {
          const group = this.canvas.row.groups[index];

          height += group.height();
        }

        for (let index = start.col; index <= end.col; index++) {
          const group = this.canvas.col.groups[index];

          width += group.width();
        }

        const gridLineStrokWidth = this.canvas.styles.gridLine.strokeWidth!;
        const offset = gridLineStrokWidth;

        const rectConfig: RectConfig = {
          x: startCol.x() + offset,
          y: startRow.y() + offset,
          height: height - offset * 2,
          width: width - offset * 2,
          id,
          start,
          end,
        };

        const rect = this.shapes.mergedCells.clone(rectConfig) as Rect;

        this.mergedCellsMap[id] = rect;

        this.canvas.layers.mainLayer.add(rect);
      }
      yield { start, end, id, shouldMerge };
    }
  }

  unMergeCells(mergedCells: IMergedCells[]) {
    this.canvas.options.mergedCells = this.canvas.options.mergedCells.filter(
      (x) => {
        const shouldUnMerge = mergedCells.some(
          (z) =>
            z.start.row === x.start.row &&
            z.start.col === x.start.col &&
            z.end.row === x.end.row &&
            z.end.col === x.end.col
        );

        if (shouldUnMerge) {
          const id = getMergedCellId(x.start.row, x.start.col);

          this.mergedCellsMap[id].destroy();

          delete this.mergedCellsMap[id];
        }

        return !shouldUnMerge;
      }
    );

    mergedCells.forEach((mergedCell) => {
      // for (
      //   let index = mergedCell.start.row;
      //   index <= mergedCell.end.row;
      //   index++
      // ) {
      //   this.mergedCellsMap.row[index] = this.mergedCellsMap.row[index].filter(
      //     (cell) => {
      //       const isMergedCell =
      //         cell.attrs.id ===
      //         getMergedCellId(mergedCell.start.row, mergedCell.start.col);
      //       if (isMergedCell) {
      //         cell.destroy();
      //       }
      //       return !isMergedCell;
      //     }
      //   );
      //   if (!this.mergedCellsMap.row[index].length) {
      //     delete this.mergedCellsMap.row[index];
      //   }
      // }
      // for (
      //   let index = mergedCell.start.col;
      //   index <= mergedCell.end.col;
      //   index++
      // ) {
      //   this.mergedCellsMap.col[index] = this.mergedCellsMap.col[index].filter(
      //     (cell) => {
      //       const isMergedCell =
      //         cell.attrs.id ===
      //         getMergedCellId(mergedCell.start.row, mergedCell.start.col);
      //       if (isMergedCell) {
      //         cell.destroy();
      //       }
      //       return !isMergedCell;
      //     }
      //   );
      //   if (!this.mergedCellsMap.col[index].length) {
      //     delete this.mergedCellsMap.col[index];
      //   }
      // }
    });
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

    // const mergedSelectedRow = selectedRowCols.rows.find(
    //   (x) => x.attrs.isMerged
    // );

    // if (mergedSelectedRow) {
    //   // && mergedSelectedRow.attrs.index >= end.row) {
    //   let totalRowHeight = this.canvas.row.groups[start.row].height();

    //   while (totalRowHeight < mergedSelectedRow.height()) {
    //     end.row += 1;
    //     totalRowHeight += this.canvas.row.groups[end.row].height();
    //   }
    // }

    // const mergedSelectedCol = selectedRowCols.cols.find(
    //   (x) => x.attrs.isMerged
    // );

    // if (mergedSelectedCol) {
    //   // && mergedSelectedCol.attrs.index >= end.col) {
    //   let totalColWidth = this.canvas.col.groups[start.col].width();

    //   while (totalColWidth < mergedSelectedCol.width()) {
    //     end.col += 1;
    //     totalColWidth += this.canvas.col.groups[end.col].width();
    //   }
    // }
  }

  unMergeSelectedCells() {
    const selectedCells = this.canvas.selector.selectedCells;

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

    // const areAllRowsMerged = selectedRowCols.rows.every(
    //   (row) => row.attrs.isMerged
    // );
    // const areAllColsMerged = selectedRowCols.cols.every(
    //   (col) => col.attrs.isMerged
    // );

    // if (areAllRowsMerged && areAllColsMerged) {
    //   let { index: rowIndex, height } = selectedRowCols.rows[0].attrs;

    //   const startRowIndex = rowIndex;

    //   while (height > 0) {
    //     height -= this.canvas.row.groups[rowIndex].height();
    //     rowIndex += 1;
    //   }

    //   let { index: colIndex, width } = selectedRowCols.cols[0].attrs;

    //   const startColIndex = colIndex;

    //   while (width > 0) {
    //     width -= this.canvas.col.groups[colIndex].width();
    //     colIndex += 1;
    //   }

    //   const mergedCellToRemove = this.canvas.options.mergedCells.findIndex(
    //     (x) => x.start.row === startRowIndex && x.start.col === startColIndex
    //   );

    //   this.canvas.options.mergedCells.splice(mergedCellToRemove, 1);

    //   this.mergeCells(this.canvas.options.mergedCells);

    //   for (let index = startRowIndex; index < rowIndex; index++) {
    //     this.canvas.row.drawGridLines(index);
    //   }

    //   for (let index = startColIndex; index < colIndex; index++) {
    //     this.canvas.col.drawGridLines(index);
    //   }
    // }
  }

  // mergeCells(cells: IMergedCells[]) {
  //   const doesOverlapCells = (x: IMergedCells) => {
  //     return !cells.some((z) => {
  //       return (
  //         x.start.row >= z.start.row &&
  //         x.end.row <= z.end.row &&
  //         x.start.col >= z.start.col &&
  //         x.end.col <= z.end.col
  //       );
  //     });
  //   };

  //   const existingMergedCells =
  //     this.canvas.options.mergedCells.filter(doesOverlapCells);
  //   const mergedCells = [...existingMergedCells, ...cells];

  //   this.setMergedCells(mergedCells);

  //   for (let index = 0; index < cells.length; index++) {
  //     const { start, end } = cells[index];

  //     for (let index = start.row; index <= end.row; index++) {
  //       this.canvas.row.drawGridLines(index);
  //     }

  //     for (let index = start.col; index <= end.col; index++) {
  //       this.canvas.col.drawGridLines(index);
  //     }
  //   }
  // }
}

export default Merger;
