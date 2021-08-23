import { IMergedCells } from '../../options';
import Canvas from './Canvas';

export interface IMergedCellsMap {
  row: Record<string, number[]>;
  col: Record<string, number[]>;
}

class Merger {
  mergedCellsMap: IMergedCellsMap;

  constructor(private canvas: Canvas) {
    this.canvas = canvas;
    this.mergedCellsMap = {
      row: {},
      col: {},
    };

    this.setMergedCells(this.canvas.options.mergedCells);
  }

  setMergedCells(mergedCells: IMergedCells[]) {
    const mergedCellsMap: IMergedCellsMap = {
      row: {},
      col: {},
    };
    const comparer = (a: number, b: number) => a - b;

    mergedCells.forEach(({ start, end }) => {
      const rowsArr: number[] = [];
      const colsArr: number[] = [];

      for (let index = start.row; index <= end.row; index++) {
        rowsArr.push(index);
      }

      for (let index = start.col; index <= end.col; index++) {
        colsArr.push(index);
      }

      rowsArr.forEach((value, i) => {
        if (i !== 0) {
          mergedCellsMap.row[value] = [
            ...(mergedCellsMap.row[value] ?? []),
            ...colsArr,
          ];

          mergedCellsMap.row[value].sort(comparer);
        }
      });

      colsArr.forEach((value, i) => {
        if (i !== 0) {
          mergedCellsMap.col[value] = [
            ...(mergedCellsMap.col[value] ?? []),
            ...rowsArr,
          ];
          mergedCellsMap.col[value].sort(comparer);
        }
      });
    });

    this.canvas.options.mergedCells = mergedCells;
    this.mergedCellsMap = mergedCellsMap;
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

    if (mergedSelectedRow && mergedSelectedRow.attrs.index >= end.row) {
      let totalRowHeight = this.canvas.row.groups[start.row].height();

      while (totalRowHeight < mergedSelectedRow.height()) {
        end.row += 1;
        totalRowHeight += this.canvas.row.groups[end.row].height();
      }
    }

    const mergedSelectedCol = selectedRowCols.cols.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedCol && mergedSelectedCol.attrs.index >= end.col) {
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
