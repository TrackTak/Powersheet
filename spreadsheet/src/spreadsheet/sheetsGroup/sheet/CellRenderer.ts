import { Group } from 'konva/lib/Group';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import { merge } from 'lodash';
import Spreadsheet from '../../Spreadsheet';
import { performanceProperties } from '../../styles';
import { rotateAroundCenter } from '../../utils';
import { defaultCellFill } from './Merger';
import Sheet, {
  BorderStyle,
  getCellGroupFromScrollGroup,
  getCellRectFromCell,
  getCellTextFromCell,
  HorizontalTextAlign,
  ICellData,
  ICellStyle,
  TextWrap,
  VerticalTextAlign,
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

  setBorderStyle(id: CellId, borderType: BorderStyle) {
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

  setCellData(id: CellId, newValue: Partial<ICellData>) {
    const data = this.sheet.getData();

    data.cellsData = merge(data.cellsData, {
      [id]: {
        ...newValue,
      },
    });

    const cellAddress = this.getCellHyperformulaAddress(id);
    try {
      this.spreadsheet.hyperformula.setCellContents(
        cellAddress,
        data.cellsData[id].value
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

  updateCellClientRect(cell: Cell) {
    const id = cell.id();
    const { row, col } = convertFromCellIdToRowCol(id);
    const rowGroup = this.sheet.row.rowColGroupMap.get(row)!;
    const colGroup = this.sheet.col.rowColGroupMap.get(col)!;
    const cellRect = getCellRectFromCell(cell);
    const isMerged = this.sheet.merger.getIsCellMerged(id);

    cell.x(colGroup.x());
    cell.y(rowGroup.y());

    if (isMerged) {
      const rows = this.sheet.row.convertFromRangeToGroups(cell.attrs.row);
      const cols = this.sheet.col.convertFromRangeToGroups(cell.attrs.col);

      const width = cols.reduce((prev, curr) => {
        return (prev += curr.width());
      }, 0);

      const height = rows.reduce((prev, curr) => {
        return (prev += curr.height());
      }, 0);

      cellRect.width(width);
      cellRect.height(height);
    } else {
      cellRect.width(colGroup.width());
      cellRect.height(rowGroup.height());
    }
  }

  updateCellsStyles() {
    for (const cell of this.cellsMap.values()) {
      this.updateCellStyles(cell);
    }
  }

  updateCellStyles(cell: Cell) {
    const id = cell.id();
    const cellData = this.sheet.getData().cellsData?.[id];
    const style = cellData?.style;

    this.updateCellClientRect(cell);

    if (cellData?.comment) {
      this.setCellCommentMarker(cell);
    }

    if (style) {
      const {
        backgroundColor,
        borders,
        horizontalTextAlign,
        verticalTextAlign,
      } = style;

      if (backgroundColor) {
        this.setCellBackgroundColor(cell, backgroundColor);
      }

      if (horizontalTextAlign) {
        this.setHorizontalTextAlign(cell, horizontalTextAlign);
      }

      if (verticalTextAlign) {
        this.setVerticalTextAlign(cell, verticalTextAlign);
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

  updateCell(cell: Cell) {
    const id = cell.id();
    const cellData = this.sheet.getData().cellsData?.[id];
    const style = cellData?.style;

    this.updateCellClientRect(cell);

    if (cellData?.value) {
      const hyperformulaValue = this.spreadsheet.hyperformula.getCellValue(
        this.getCellHyperformulaAddress(id)
      );

      this.setCellTextValue(cell, hyperformulaValue?.toString()!);
    }

    if (style) {
      const { textWrap } = style;

      if (textWrap) {
        this.setTextWrap(cell, textWrap);
      }
    }

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

    this.sheet.merger.updateMergedCells();

    const cellsData = this.sheet.getData().cellsData ?? {};

    Object.keys(cellsData).forEach((id) => {
      this.cleanCellData(id);

      const cell = this.convertFromCellIdToCell(id);

      this.updateCell(cell);
    });
  }

  private setBorder(cell: Cell, type: BorderStyle) {
    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

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

  setHorizontalTextAlign(cell: Cell, horizontalTextAlign: HorizontalTextAlign) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      cellText.align(horizontalTextAlign);
    }
  }

  setVerticalTextAlign(cell: Cell, verticalTextAlign: VerticalTextAlign) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      cellText.verticalAlign(verticalTextAlign);
    }
  }

  setCellCommentMarker(cell: Cell) {
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
    const { width, height } = cell.getClientRect({
      skipStroke: true,
    });
    const text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      width,
      height,
    });

    cell.add(text);
  }

  getNewCell(id: string | null, row: Vector2d, col: Vector2d) {
    const cell = new Group({
      ...performanceProperties,
      row,
      col,
    });

    if (id) {
      cell.id(id);
    }

    cell.add(this.getNewCellRect());

    return cell;
  }

  getNewCellRect() {
    return new Rect({
      type: 'cellRect',
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

  private setMergedCellProperties(cell: Cell) {
    const { row, col } = this.sheet.merger.associatedMergedCellIdMap.get(
      cell.id()
    )!;
    const cellRect = getCellRectFromCell(cell);

    cellRect.fill(defaultCellFill);
    cellRect.stroke(this.spreadsheet.styles.gridLine.stroke as string);
    cellRect.strokeWidth(this.spreadsheet.styles.gridLine.strokeWidth!);

    cell.attrs.row = row;
    cell.attrs.col = col;
  }

  convertFromRowColToCell(rowGroup: Group, colGroup: Group) {
    const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
    const isMergedCell = this.sheet.merger.getIsCellMerged(id);

    const row = {
      x: rowGroup.attrs.index,
      y: rowGroup.attrs.index,
    };

    const col = {
      x: colGroup.attrs.index,
      y: colGroup.attrs.index,
    };

    const cell = this.getNewCell(id, row, col);

    if (isMergedCell) {
      this.setMergedCellProperties(cell);
    }

    return cell;
  }

  convertFromRowColsToCells(rows: Group[], cols: Group[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);
        const mergedCells = this.sheet.merger.associatedMergedCellIdMap.get(id);
        const cell = this.convertFromRowColToCell(rowGroup, colGroup);

        if (mergedCells) {
          const mergedCellId = getCellId(mergedCells.row.x, mergedCells.col.x);

          if (!mergedCellsAddedMap?.get(mergedCellId)) {
            this.setMergedCellProperties(cell);

            mergedCellsAddedMap?.set(mergedCellId, cell);

            cells.push(cell);
          }
        } else {
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
    const isFrozenRow = this.sheet.row.getIsFrozen(cell.attrs.row.x);
    const isFrozenCol = this.sheet.col.getIsFrozen(cell.attrs.col.x);

    if (isFrozenRow && isFrozenCol) {
      const xyStickyCellGroup = getCellGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyCellGroup.add(cell);
    } else if (isFrozenRow) {
      const yStickyCellGroup = getCellGroupFromScrollGroup(
        this.sheet.scrollGroups.ySticky
      );

      yStickyCellGroup.add(cell);
    } else if (isFrozenCol) {
      const xStickyCellGroup = getCellGroupFromScrollGroup(
        this.sheet.scrollGroups.xSticky
      );

      xStickyCellGroup.add(cell);
    } else {
      const mainCellGroup = getCellGroupFromScrollGroup(
        this.sheet.scrollGroups.main
      );

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
