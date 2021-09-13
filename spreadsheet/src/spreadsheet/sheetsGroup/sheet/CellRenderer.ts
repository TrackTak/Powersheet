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
  centerRectTwoInRectOne,
  convertFromCellIdToRowCol,
  getCellGroupFromScrollGroup,
  getCellId,
  getCellRectFromCell,
  getMergedCellGroupFromScrollGroup,
  getOtherCellChildren,
  ICellData,
  ICellStyle,
  makeShapeCrisp,
  setCellChildren,
} from './Sheet';

export type CellId = string;

export type Cell = Group;

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
    this.spreadsheet.hyperformula.setCellContents(cellAddress, newValue.value);
  }

  setCellDataStyle(id: CellId, newStyle: ICellStyle) {
    this.setCellData(id, {
      style: {
        ...this.getCellData(id)?.style,
        ...newStyle,
      },
    });
  }

  updateCells() {
    for (const cell of this.cellsMap.values()) {
      cell.destroy();
    }

    this.cellsMap.clear();

    this.sheet.merger.updateMergedCells();

    const cellsData = this.sheet.getData().cellsData ?? {};

    Object.keys(cellsData).forEach((id) => {
      const cellData = cellsData[id];
      const style = cellData.style;

      this.updateCellRect(id);

      if (style?.backgroundColor) {
        this.setCellBackgroundColor(id, style.backgroundColor);
      }

      if (cellData?.comment) {
        this.setCellCommentMarker(id);
      }

      if (style?.borders) {
        style.borders.forEach((borderType) => {
          switch (borderType) {
            case 'borderLeft':
              this.setLeftBorder(id);
              break;
            case 'borderTop':
              this.setTopBorder(id);
              break;
            case 'borderRight':
              this.setRightBorder(id);
              break;
            case 'borderBottom':
              this.setBottomBorder(id);
              break;
          }
        });
      }

      if (cellData?.value) {
        const hyperformulaValue = this.spreadsheet.hyperformula.getCellValue(
          this.getCellHyperformulaAddress(id)
        );
        this.setCellTextValue(id, hyperformulaValue?.toString()!);
      }
    });
  }

  updateCellRect(id: CellId) {
    const cell = this.convertFromCellIdToCell(id);
    if (this.cellsMap.has(id)) {
      const otherChildren = getOtherCellChildren(this.cellsMap.get(id)!, [
        'cellRect',
      ]);

      setCellChildren(cell, [getCellRectFromCell(cell), ...otherChildren]);

      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);
  }

  private *setBorder(id: CellId, type: BorderStyleOption) {
    const { cell, clientRect } = this.drawNewCell(id, [type]);

    const line = new Line({
      ...performanceProperties,
      type,
      stroke: 'black',
      strokeWidth: this.spreadsheet.styles.gridLine.strokeWidth,
    });

    cell.add(line);

    line.moveToTop();

    yield { cell, clientRect, line };

    makeShapeCrisp(line);
  }

  setBottomBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderBottom');
    const { line, clientRect } = generator.next().value!;

    line.y(clientRect.height);
    line.points([0, 0, clientRect.width, 0]);

    generator.next();
  }

  setRightBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderRight');
    const { line, clientRect } = generator.next().value!;

    line.x(clientRect.width);
    line.points([0, 0, 0, clientRect.height]);

    generator.next();
  }

  setTopBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderTop');
    const { line, clientRect } = generator.next().value!;

    line.points([0, 0, clientRect.width, 0]);

    generator.next();
  }

  setLeftBorder(id: CellId) {
    const generator = this.setBorder(id, 'borderLeft');
    const { line, clientRect } = generator.next().value!;

    line.points([0, 0, 0, clientRect.height]);

    generator.next();
  }

  setCellBackgroundColor(id: CellId, backgroundColor: string) {
    const { cell } = this.drawNewCell(id);
    const cellRect = getCellRectFromCell(cell);

    cellRect.fill(backgroundColor);
  }

  setCellCommentMarker(id: CellId) {
    const { cell, clientRect } = this.drawNewCell(id, ['commentMarker']);

    const commentMarker = new Line({
      ...this.commentMarkerConfig,
      x: clientRect.width,
    });

    cell.add(commentMarker);

    rotateAroundCenter(commentMarker, 180);
  }

  setCellTextValue(id: CellId, value: string) {
    const { cell, clientRect } = this.drawNewCell(id, ['cellText']);

    const text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      type: 'cellText',
      width: clientRect.width,
    });

    const midPoints = centerRectTwoInRectOne(clientRect, text.getClientRect());

    text.x(midPoints.x - clientRect.x);
    text.y(midPoints.y - clientRect.y);

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

    const cellRect = new Rect({
      type: 'cellRect',
      width: rect.width,
      height: rect.height,
    });

    cell.add(cellRect);

    return cell;
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

  drawNewCell(id: CellId, childrenToFilterOut: string[] = []) {
    const cell = this.convertFromCellIdToCell(id);

    const clientRect = cell.getClientRect({
      skipStroke: true,
    });

    if (this.cellsMap.has(id)) {
      const children = getOtherCellChildren(
        this.cellsMap.get(id)!,
        childrenToFilterOut
      );

      setCellChildren(cell, children);

      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);

    this.drawCell(cell);

    return { cell, clientRect };
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
