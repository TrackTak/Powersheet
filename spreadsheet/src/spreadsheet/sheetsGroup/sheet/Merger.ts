import { Group } from 'konva/lib/Group';
import { IMergedCells, IOptions } from '../../options';
import Canvas from './Canvas';
import { ISelectedRowCols } from './Selector';

export interface IMergedCellsMap {
  row: Record<string, number[]>;
  col: Record<string, number[]>;
}

class Merger {
  mergedCellsMap: IMergedCellsMap;

  constructor(
    private options: IOptions,
    private selectedRowCols: ISelectedRowCols,
    private rowGroups: Group[],
    private colGroups: Group[],
    private drawRowLines: Canvas['drawRowLines'],
    private drawColLines: Canvas['drawColLines']
  ) {
    this.options = options;
    this.selectedRowCols = selectedRowCols;
    this.rowGroups = rowGroups;
    this.colGroups = colGroups;
    this.drawRowLines = drawRowLines;
    this.drawColLines = drawColLines;
    this.mergedCellsMap = {
      row: {},
      col: {},
    };

    this.setMergedCells(this.options.mergedCells);
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

    this.options.mergedCells = mergedCells;
    this.mergedCellsMap = mergedCellsMap;
  }

  mergeSelectedCells() {
    const selectedRowCols = this.selectedRowCols;

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
      let totalRowHeight = this.rowGroups[start.row].height();

      while (totalRowHeight < mergedSelectedRow.height()) {
        end.row += 1;
        totalRowHeight += this.rowGroups[end.row].height();
      }
    }

    const mergedSelectedCol = selectedRowCols.cols.find(
      (x) => x.attrs.isMerged
    );

    if (mergedSelectedCol && mergedSelectedCol.attrs.index >= end.col) {
      let totalColWidth = this.colGroups[start.col].width();

      while (totalColWidth < mergedSelectedCol.width()) {
        end.col += 1;
        totalColWidth += this.colGroups[end.col].width();
      }
    }

    this.mergeCells([{ start, end }]);
  }

  unmergeSelectedCells() {
    const selectedRowCols = this.selectedRowCols;

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
        height -= this.rowGroups[rowIndex].height();
        rowIndex += 1;
      }

      let { index: colIndex, width } = selectedRowCols.cols[0].attrs;

      const startColIndex = colIndex;

      while (width > 0) {
        width -= this.colGroups[colIndex].width();
        colIndex += 1;
      }

      const mergedCellToRemove = this.options.mergedCells.findIndex(
        (x) => x.start.row === startRowIndex && x.start.col === startColIndex
      );

      this.options.mergedCells.splice(mergedCellToRemove, 1);

      this.setMergedCells(this.options.mergedCells);

      for (let index = startRowIndex; index < rowIndex; index++) {
        this.drawRowLines(index);
      }

      for (let index = startColIndex; index < colIndex; index++) {
        this.drawColLines(index);
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
      this.options.mergedCells.filter(doesOverlapCells);
    const mergedCells = [...existingMergedCells, ...cells];

    this.setMergedCells(mergedCells);

    for (let index = 0; index < cells.length; index++) {
      const { start, end } = cells[index];

      for (let index = start.row; index <= end.row; index++) {
        this.drawRowLines(index);
      }

      for (let index = start.col; index <= end.col; index++) {
        this.drawColLines(index);
      }
    }
  }
}

export default Merger;
