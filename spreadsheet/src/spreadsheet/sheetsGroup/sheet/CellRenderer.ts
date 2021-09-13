import { Group } from 'konva/lib/Group';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { IRect, Vector2d } from 'konva/lib/types';
import Spreadsheet from '../../Spreadsheet';
import { performanceProperties } from '../../styles';
import { rotateAroundCenter } from '../../utils';
import Sheet, {
  BorderStyleOption,
  getCellGroupFromScrollGroup,
  getCellRectFromCell,
  getCellTextFromCell,
  getMergedCellGroupFromScrollGroup,
  ICellData,
  ICellStyle,
  removeChild,
  TextWrap,
} from './Sheet';

export type CellId = string;

export type Cell = Group;

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export const convertFromCellIdToRowCol = (id: CellId) => {
  const sections = id.split('_');

  return {
    row: parseInt(sections[0], 10),
    col: parseInt(sections[1], 10),
  };
};

class CellRenderer {
  cellsMap: Map<CellId, Cell>;
  commentMarkerConfig: LineConfig;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.sheetsGroup.spreadsheet;
    this.commentMarkerConfig = this.spreadsheet.styles.commentMarker;
    this.cellsMap = new Map();
  }

  getCellData(id: CellId) {
    return this.sheet.getData().cellsData?.[id];
  }

  deleteCellStyle(id: CellId, name: keyof ICellStyle) {
    const cellData = this.getCellData(id);

    if (cellData?.style?.[name]) {
      delete cellData.style[name];
    }
  }

  setBorderStyle(id: CellId, borderType: BorderStyleOption) {
    const borders = this.getCellData(id)?.style?.borders ?? [];

    if (borders.indexOf(borderType) === -1) {
      this.setCellDataStyle(id, {
        borders: [...borders, borderType],
      });
    }
  }

  // TODO: Call this function later on every data change
  cleanCellData(id: CellId) {
    const cellData = this.getCellData(id);

    if (cellData) {
      if (cellData.style) {
        const cellDataStyleArray = Object.keys(cellData.style);

        if (cellDataStyleArray.length === 0) {
          delete cellData.style;
        }
      }

      const cellDataArray = Object.keys(cellData);

      if (cellDataArray.length === 0) {
        delete this.sheet.getData().cellsData?.[id];
      }
    }
  }

  setCellData(id: CellId, newValue: ICellData) {
    const data = this.sheet.getData();

    data.cellsData = {
      ...data.cellsData,
      [id]: {
        ...data.cellsData?.[id],
        ...newValue,
      },
    };

    const cellAddress = this.getCellHyperformulaAddress(id);
    try {
      this.spreadsheet.hyperformula.setCellContents(
        cellAddress,
        newValue.value
      );
    } catch (e) {
      console.error(e);
    }
  }

  setCellDataStyle(id: CellId, newStyle: ICellStyle) {
    this.setCellData(id, {
      style: {
        ...this.getCellData(id)?.style,
        ...newStyle,
      },
    });
  }

  updateCellsClientRect() {
    for (const [cellId, cell] of this.cellsMap) {
      const { row, col } = convertFromCellIdToRowCol(cellId);
      const rowGroup = this.sheet.row.rowColGroupMap.get(row)!;
      const colGroup = this.sheet.col.rowColGroupMap.get(col)!;
      const cellRect = getCellRectFromCell(cell);

      cellRect.width(colGroup.width());
      cellRect.height(rowGroup.height());
      cell.x(colGroup.x());
      cell.y(rowGroup.y());
    }
  }

  getUpdatedCell(id: CellId) {
    const cellData = this.sheet.getData().cellsData?.[id];
    const style = cellData?.style;
    let cell = this.convertFromCellIdToCell(id);

    if (this.cellsMap.has(id)) {
      const existingCell = this.cellsMap.get(id)!;

      cell = existingCell.clone();
    }

    this.setCellRect(cell);

    if (cellData?.comment) {
      this.setCellCommentMarker(cell);
    }

    if (cellData?.value) {
      const hyperformulaValue = this.spreadsheet.hyperformula.getCellValue(
        this.getCellHyperformulaAddress(id)
      );
      this.setCellTextValue(cell, hyperformulaValue?.toString()!);
    }

    if (style) {
      const { backgroundColor, borders, textWrap } = style;

      if (backgroundColor) {
        this.setCellBackgroundColor(cell, backgroundColor);
      }

      if (textWrap) {
        this.setTextWrap(cell, textWrap);
      }

      if (borders) {
        borders.forEach((borderType) => {
          switch (borderType) {
            case 'borderLeft':
              this.setLeftBorder(cell);
              break;
            case 'borderTop':
              this.setTopBorder(cell);
              break;
            case 'borderRight':
              this.setRightBorder(cell);
              break;
            case 'borderBottom':
              this.setBottomBorder(cell);
              break;
          }
        });
      }
    }

    return cell;
  }

  updateCell(id: CellId) {
    const cell = this.getUpdatedCell(id);

    if (this.cellsMap.has(id)) {
      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);

    this.drawCell(cell);
  }

  updateCells() {
    for (const cell of this.cellsMap.values()) {
      cell.destroy();
    }

    this.cellsMap.clear();

    //  this.sheet.merger.updateMergedCells();

    const cellsData = this.sheet.getData().cellsData ?? {};

    Object.keys(cellsData).forEach((id) => {
      this.updateCell(id);
    });
  }

  setCellRect(cell: Cell) {
    const rect = getCellRectFromCell(cell);

    const newCellRect = this.getNewCellRect(rect.width(), rect.height());

    removeChild(cell, 'cellRect');

    cell.add(newCellRect);
  }

  private setBorder(cell: Cell, type: BorderStyleOption) {
    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

    removeChild(cell, type);

    const line = new Line({
      ...performanceProperties,
      type,
      stroke: 'black',
      strokeWidth: this.spreadsheet.styles.gridLine.strokeWidth,
    });

    cell.add(line);

    line.moveToTop();

    return { cell, clientRect, line };
  }

  setBottomBorder(cell: Cell) {
    const { line, clientRect } = this.setBorder(cell, 'borderBottom');

    line.y(clientRect.height);
    line.points([0, 0, clientRect.width, 0]);
  }

  setRightBorder(cell: Cell) {
    const { line, clientRect } = this.setBorder(cell, 'borderRight');

    line.x(clientRect.width);
    line.points([0, 0, 0, clientRect.height]);
  }

  setTopBorder(cell: Cell) {
    const { line, clientRect } = this.setBorder(cell, 'borderTop');

    line.points([0, 0, clientRect.width, 0]);
  }

  setLeftBorder(cell: Cell) {
    const { line, clientRect } = this.setBorder(cell, 'borderLeft');

    line.points([0, 0, 0, clientRect.height]);
  }

  setTextWrap(cell: Cell, textWrap: TextWrap) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      cellText.wrap(textWrap);
    }
  }

  setCellBackgroundColor(cell: Cell, backgroundColor: string) {
    const cellRect = getCellRectFromCell(cell);

    cellRect.fill(backgroundColor);
  }

  setCellCommentMarker(cell: Cell) {
    removeChild(cell, 'commentMarker');

    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

    const commentMarker = new Line({
      ...this.commentMarkerConfig,
      x: clientRect.width,
    });

    cell.add(commentMarker);

    rotateAroundCenter(commentMarker, 180);
  }

  setCellTextValue(cell: Cell, value: string) {
    removeChild(cell, 'cellText');

    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

    const text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      width: clientRect.width,
    });

    cell.add(text);
  }

  getNewCell(id: string | null, rect: IRect, row: Vector2d, col: Vector2d) {
    const cell = new Group({
      ...performanceProperties,
      x: rect.x,
      y: rect.y,
      row,
      col,
    });

    if (id) {
      cell.id(id);
    }

    const cellRect = this.getNewCellRect(rect.width, rect.height);

    cell.add(cellRect);

    return cell;
  }

  getNewCellRect(width: number, height: number) {
    return new Rect({
      type: 'cellRect',
      width,
      height,
    });
  }

  convertFromCellIdToCell(id: CellId) {
    const { row, col } = convertFromCellIdToRowCol(id);
    const rowGroup = this.sheet.row.rowColGroupMap.get(row);
    const colGroup = this.sheet.col.rowColGroupMap.get(col);

    if (!rowGroup) {
      throw new Error(`id ${id} is out of range`);
    }

    if (!colGroup) {
      throw new Error(`id ${id} is out of range`);
    }

    const cell = this.convertFromRowColToCell(rowGroup, colGroup);

    return cell;
  }

  private getConvertedMergedCell(mergedCell: Cell) {
    const rect = getCellRectFromCell(mergedCell);
    // We don't use getClientRect as we don't want the
    // mergedCells gridLines taken into account
    const cell = this.getNewCell(
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

  convertFromRowColToCell(rowGroup: Group, colGroup: Group) {
    const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
    const mergedCellId = this.sheet.merger.associatedMergedCellIdMap.get(id);

    if (mergedCellId) {
      const mergedCell = this.cellsMap.get(mergedCellId)!;

      return this.sheet.merger.getConvertedMergedCell(mergedCell);
    }

    const rect: IRect = {
      x: colGroup.x(),
      y: rowGroup.y(),
      width: colGroup.width(),
      height: rowGroup.height(),
    };
    const row = {
      x: rowGroup.attrs.index,
      y: rowGroup.attrs.index,
    };

    const col = {
      x: colGroup.attrs.index,
      y: colGroup.attrs.index,
    };

    const cell = this.getNewCell(id, rect, row, col);

    return cell;
  }

  convertFromRowColsToCells(rows: Group[], cols: Group[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const mergedCellId =
          this.sheet.merger.associatedMergedCellIdMap.get(id);
        let cell;

        if (mergedCellId) {
          const mergedCell = this.cellsMap.get(mergedCellId)!;

          if (!mergedCellsAddedMap?.get(mergedCellId)) {
            cell = this.getConvertedMergedCell(mergedCell);

            mergedCellsAddedMap?.set(mergedCellId, cell);
          }
        } else {
          cell = this.convertFromRowColToCell(rowGroup, colGroup);
        }

        if (cell) {
          cells.push(cell);
        }
      });
    });

    return cells;
  }

  destroyCell(cellId: string) {
    if (this.cellsMap.has(cellId)) {
      const cell = this.cellsMap.get(cellId)!;

      cell.destroy();

      this.cellsMap.delete(cellId);
    }
  }

  drawCell(cell: Cell) {
    const id = cell.id();

    const isFrozenRow = this.sheet.row.getIsFrozen(cell.attrs.row.x);
    const isFrozenCol = this.sheet.col.getIsFrozen(cell.attrs.col.x);
    const getCellGroupMethod = (scrollGroup: Group) =>
      this.sheet.merger.getIsCellMerged(id)
        ? getMergedCellGroupFromScrollGroup(scrollGroup)
        : getCellGroupFromScrollGroup(scrollGroup);

    if (isFrozenRow && isFrozenCol) {
      const xyStickyCellGroup = getCellGroupMethod(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyCellGroup.add(cell);
    } else if (isFrozenRow) {
      const yStickyCellGroup = getCellGroupMethod(
        this.sheet.scrollGroups.ySticky
      );

      yStickyCellGroup.add(cell);
    } else if (isFrozenCol) {
      const xStickyCellGroup = getCellGroupMethod(
        this.sheet.scrollGroups.xSticky
      );

      xStickyCellGroup.add(cell);
    } else {
      const mainCellGroup = getCellGroupMethod(this.sheet.scrollGroups.main);

      mainCellGroup.add(cell);
    }

    cell.moveToTop();
  }

  getCellHyperformulaAddress(id: CellId) {
    return {
      ...convertFromCellIdToRowCol(id),
      sheet: this.sheet.getHyperformulaSheetId(),
    };
  }
}

export default CellRenderer;
