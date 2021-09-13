import Sheet, {
  getCellId,
  getCellRectFromCell,
  IMergedCells,
  makeShapeCrisp,
} from './Sheet';
import { iterateSelection } from './Selector';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { IRect } from 'konva/lib/types';
import { Cell, CellId } from './CellRenderer';

export type AssociatedMergedCellId = CellId;

const defaultCellFill = 'white';

class Merger {
  associatedMergedCellIdMap: Map<AssociatedMergedCellId, CellId>;

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

    data.mergedCells = data.mergedCells
      ? [...data.mergedCells, mergedCells]
      : [mergedCells];

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        if (cellsData?.[id]?.style) {
          delete cellsData[id].style;
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

    data.mergedCells = data.mergedCells?.filter(({ row, col }) => {
      return !this.getAreMergedCellsOverlapping(mergedCells, {
        row,
        col,
      });
    });

    if (!this.getIsCellMerged(mergedCellId)) return;

    const mergedCellStyle =
      this.sheet.cellRenderer.getCellData(mergedCellId)!.style!;

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.sheet.cellRenderer.setCellDataStyle(id, mergedCellStyle);
      }
    }
  }

  updateMergedCells() {
    this.associatedMergedCellIdMap.clear();

    this.sheet.getData().mergedCells?.forEach(({ row, col }) => {
      const startRow = this.sheet.row.rowColGroupMap.get(row.x);
      const startCol = this.sheet.col.rowColGroupMap.get(col.x);
      const shouldMerge = startCol && startRow ? true : false;

      if (shouldMerge) {
        this.mergeCells({ row, col });
      }
    });
  }

  mergeCells(mergedCells: IMergedCells) {
    const { row, col } = mergedCells;
    const mergedCellId = getCellId(row.x, col.x);
    const startRow = this.sheet.row.rowColGroupMap.get(row.x);
    const startCol = this.sheet.col.rowColGroupMap.get(col.x);
    const rows = this.sheet.row.convertFromRangeToGroups(mergedCells.row);
    const cols = this.sheet.col.convertFromRangeToGroups(mergedCells.col);

    const width = cols.reduce((prev, curr) => {
      return (prev += curr.width());
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += curr.height());
    }, 0);

    const rect: IRect = {
      x: startCol!.x(),
      y: startRow!.y(),
      width: width,
      height: height,
    };

    const mergedCell = this.sheet.cellRenderer.getNewCell(
      mergedCellId,
      rect,
      row,
      col
    );
    const cellRect = getCellRectFromCell(mergedCell);

    cellRect.fill(defaultCellFill);

    for (const ri of iterateSelection(mergedCells.row)) {
      for (const ci of iterateSelection(mergedCells.col)) {
        const id = getCellId(ri, ci);

        this.associatedMergedCellIdMap.set(id, mergedCellId);
        this.sheet.cellRenderer.destroyCell(id);
      }
    }

    const colLineConfig: LineConfig = {
      x: width,
      points: [0, 0, 0, height],
    };
    const rowLineConfig: LineConfig = {
      y: height,
      points: [0, 0, width, 0],
    };

    const colLine = this.sheet.col.shapes.gridLine.clone(colLineConfig) as Line;
    const rowLine = this.sheet.row.shapes.gridLine.clone(rowLineConfig) as Line;

    makeShapeCrisp(colLine);
    makeShapeCrisp(rowLine);

    mergedCell.add(colLine, rowLine);

    this.sheet.cellRenderer.cellsMap.set(mergedCellId, mergedCell);

    this.sheet.cellRenderer.drawCell(mergedCell);
  }

  getConvertedMergedCell(mergedCell: Cell) {
    const rect = getCellRectFromCell(mergedCell);
    // We don't use getClientRect as we don't want the
    // mergedCells gridLines taken into account
    const cell = this.sheet.cellRenderer.getNewCell(
      mergedCell.id(),
      {
        x: mergedCell.x(),
        y: mergedCell.y(),
        width: rect.width(),
        height: rect.height(),
      },
      mergedCell.attrs.row,
      mergedCell.attrs.col
    );

    return cell;
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
