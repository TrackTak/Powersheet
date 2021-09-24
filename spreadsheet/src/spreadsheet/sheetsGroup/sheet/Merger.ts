import Sheet, { iterateRowColVector } from './Sheet';
import { CellId, getCellId } from './CellRenderer';
import { Vector2d } from 'konva/lib/types';

export type AssociatedMergedCellId = CellId;
export type TopLeftMergedCellId = CellId;

export interface IMergedCell {
  row: Vector2d;
  col: Vector2d;
}

class Merger {
  associatedMergedCellIdMap: Map<AssociatedMergedCellId, IMergedCell>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.associatedMergedCellIdMap = new Map();
  }

  setAssociatedMergedCellIds(topLeftMergedCellId: CellId) {
    const { mergedCells } = this.sheet.getData();
    const mergedCell = mergedCells?.[topLeftMergedCellId];

    if (mergedCell) {
      const { row, col } = mergedCell;

      for (const ri of iterateRowColVector(row)) {
        for (const ci of iterateRowColVector(col)) {
          const id = getCellId(ri, ci);

          this.associatedMergedCellIdMap.set(id, { row, col });
        }
      }
    }
  }

  addMergedCells(mergedCell: IMergedCell) {
    const topLeftMergedCellId = getCellId(mergedCell.row.x, mergedCell.col.x);
    const existingTopLeftCellStyle =
      this.sheet.cellRenderer.getCellData(topLeftMergedCellId)?.style;

    this.sheet.setData({
      mergedCells: {
        [topLeftMergedCellId]: mergedCell,
      },
    });

    const { cellsData } = this.sheet.getData();

    for (const ri of iterateRowColVector(mergedCell.row)) {
      for (const ci of iterateRowColVector(mergedCell.col)) {
        const cellId = getCellId(ri, ci);

        if (cellId !== topLeftMergedCellId && cellsData?.[cellId]) {
          this.sheet.cellRenderer.deleteCellData(cellId);
        }
      }
    }

    if (existingTopLeftCellStyle) {
      this.sheet.cellRenderer.setCellDataStyle(
        topLeftMergedCellId,
        existingTopLeftCellStyle
      );
    }
  }

  removeMergedCells(mergedCell: IMergedCell) {
    const { mergedCells } = this.sheet.getData();
    const topLeftMergedCellId = getCellId(mergedCell.row.x, mergedCell.col.x);

    this.sheet.cellRenderer.cellsMap.forEach((cell, cellId) => {
      if (this.getIsCellTopLeftMergedCell(cellId) && mergedCells) {
        const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
          mergedCell,
          {
            row: cell.attrs.row,
            col: cell.attrs.col,
          }
        );

        if (areMergedCellsOverlapping) {
          // const rowCol = convertFromCellIdToRowColId(cellId);

          delete mergedCells[cellId];

          // if (row?.mergedCellsIdMap?.[rowCol.row]) {
          //   delete row.mergedCellsIdMap[rowCol.row][cellId];
          // }
        }
      }
    });

    if (!this.getIsCellTopLeftMergedCell(topLeftMergedCellId)) return;

    const style =
      this.sheet.cellRenderer.getCellData(topLeftMergedCellId)?.style;

    if (style) {
      for (const ri of iterateRowColVector(mergedCell.row)) {
        for (const ci of iterateRowColVector(mergedCell.col)) {
          const id = getCellId(ri, ci);

          this.sheet.cellRenderer.setCellDataStyle(id, style);
        }
      }
    }
  }

  getAreMergedCellsOverlapping(
    firstMergedCell: IMergedCell,
    secondMergedCell: IMergedCell
  ) {
    const isFirstOverlappingSecond =
      secondMergedCell.row.x >= firstMergedCell.row.x &&
      secondMergedCell.col.x >= firstMergedCell.col.x &&
      secondMergedCell.row.y <= firstMergedCell.row.y &&
      secondMergedCell.col.y <= firstMergedCell.col.y;

    const isSecondOverlappingFirst =
      firstMergedCell.row.x >= secondMergedCell.row.x &&
      firstMergedCell.col.x >= secondMergedCell.col.x &&
      firstMergedCell.row.y <= secondMergedCell.row.y &&
      firstMergedCell.col.y <= secondMergedCell.col.y;

    return isFirstOverlappingSecond || isSecondOverlappingFirst;
  }

  getIsCellPartOfMerge(id: CellId) {
    return this.associatedMergedCellIdMap.has(id ?? '');
  }

  getIsCellTopLeftMergedCell(topLeftMergedCellId: TopLeftMergedCellId) {
    const data = this.sheet.getData();

    return !!data.mergedCells?.[topLeftMergedCellId];
  }

  mergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(selectedCells);

    this.removeMergedCells({ row, col });
    this.addMergedCells({ row, col });
  }

  unMergeSelectedCells() {
    const selectedCells = this.sheet.selector.selectedCells;

    if (!selectedCells.length) return;

    const row = this.sheet.row.convertFromCellsToRange(selectedCells);
    const col = this.sheet.col.convertFromCellsToRange(selectedCells);

    this.removeMergedCells({ row, col });
  }
}

export default Merger;
