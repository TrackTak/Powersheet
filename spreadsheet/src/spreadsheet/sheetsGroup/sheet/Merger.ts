import Sheet, { IMergedCells } from './Sheet';
import { iterateSelection } from './Selector';
import { CellId, getCellId } from './CellRenderer';

export type AssociatedMergedCellId = CellId;

class Merger {
  associatedMergedCellIdMap: Map<AssociatedMergedCellId, IMergedCells>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.associatedMergedCellIdMap = new Map();
  }

  addMergedCells(mergedCells: IMergedCells) {
    const data = this.sheet.getData();
    const topLeftCellId = getCellId(mergedCells.row.x, mergedCells.col.x);
    const existingTopLeftCellStyle =
      this.sheet.cellRenderer.getCellData(topLeftCellId)?.style;
    const cellsData = data.cellsData;

    this.sheet.save(
      'mergedCells',
      data.mergedCells ? [...data.mergedCells, mergedCells] : [mergedCells]
    );

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        if (id !== topLeftCellId && cellsData?.[id]) {
          delete cellsData[id];
        }
      }
    }

    if (existingTopLeftCellStyle) {
      this.sheet.cellRenderer.setCellDataStyle(
        topLeftCellId,
        existingTopLeftCellStyle
      );
    }
  }

  removeMergedCells(mergedCells: IMergedCells) {
    const data = this.sheet.getData();
    const mergedCellId = getCellId(mergedCells.row.x, mergedCells.col.x);

    const updatedMergedCells = data.mergedCells?.filter(({ row, col }) => {
      return !this.getAreMergedCellsOverlapping(mergedCells, {
        row,
        col,
      });
    });
    this.sheet.save('mergedCells', updatedMergedCells);

    if (!this.getIsCellMerged(mergedCellId)) return;

    const style = this.sheet.cellRenderer.getCellData(mergedCellId)?.style;

    if (style) {
      for (const ri of iterateSelection(mergedCells.row)) {
        for (const ci of iterateSelection(mergedCells.col)) {
          const id = getCellId(ri, ci);

          this.sheet.cellRenderer.setCellDataStyle(id, style);
        }
      }
    }
  }

  updateMergedCells() {
    this.associatedMergedCellIdMap.clear();

    this.sheet.getData().mergedCells?.forEach(({ row, col }) => {
      const id = getCellId(row.x, col.x);
      const startRow = this.sheet.row.rowColGroupMap.get(row.x);
      const startCol = this.sheet.col.rowColGroupMap.get(col.x);
      const isInViewport = startCol && startRow ? true : false;

      if (isInViewport) {
        for (const ri of iterateSelection(row)) {
          for (const ci of iterateSelection(col)) {
            const id = getCellId(ri, ci);

            this.associatedMergedCellIdMap.set(id, { row, col });
          }
        }

        const cell = this.sheet.cellRenderer.convertFromCellIdToCell(id);

        this.sheet.cellRenderer.updateCell(cell);
      }
    });
  }

  getAreMergedCellsOverlapping(
    firstMergedCells: IMergedCells,
    secondMergedCells: IMergedCells
  ) {
    const isFirstOverlappingSecond =
      secondMergedCells.row.x >= firstMergedCells.row.x &&
      secondMergedCells.col.x >= firstMergedCells.col.x &&
      secondMergedCells.row.y <= firstMergedCells.row.y &&
      secondMergedCells.col.y <= firstMergedCells.col.y;

    const isSecondOverlappingFirst =
      firstMergedCells.row.x >= secondMergedCells.row.x &&
      firstMergedCells.col.x >= secondMergedCells.col.x &&
      firstMergedCells.row.y <= secondMergedCells.row.y &&
      firstMergedCells.col.y <= secondMergedCells.col.y;

    return isFirstOverlappingSecond || isSecondOverlappingFirst;
  }

  getIsCellMerged(id: CellId) {
    return this.associatedMergedCellIdMap.has(id ?? '');
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
