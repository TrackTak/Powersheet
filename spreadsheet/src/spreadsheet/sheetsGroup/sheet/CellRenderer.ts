import { Group } from 'konva/lib/Group';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import Spreadsheet from '../../Spreadsheet';
import { performanceProperties } from '../../styles';
import { rotateAroundCenter } from '../../utils';
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
import numfmt from 'numfmt';
import { merge } from 'lodash';

export type CellId = string;

export type Cell = Group;

export interface IRowColAddress {
  row: number;
  col: number;
}

export const getCellId = (ri: number, ci: number): CellId => `${ri}_${ci}`;

export const convertFromCellIdToRowCol = (id: CellId): IRowColAddress => {
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

  setHyperformulaCellData(id: CellId, value: string | undefined) {
    const cellAddress = this.getCellHyperformulaAddress(id);

    try {
      this.spreadsheet.hyperformula.setCellContents(cellAddress, value);
    } catch (e) {
      console.error(e);
    }
  }

  setCellData(id: CellId, newValue: Partial<ICellData>) {
    const data = this.sheet.getData();
    const updatedData = merge({}, data, {
      cellsData: {
        [id]: {
          ...newValue,
        },
      },
    });

    this.sheet.setData(updatedData);

    this.setHyperformulaCellData(id, updatedData.cellsData[id].value);
  }

  setCellDataStyle(id: CellId, newStyle: ICellStyle) {
    this.setCellData(id, {
      style: {
        ...this.getCellData(id)?.style,
        ...newStyle,
      },
    });
  }

  private setCellRect(cell: Cell, rowGroup: Group, colGroup: Group) {
    const cellRect = getCellRectFromCell(cell);

    cell.x(colGroup.x());
    cell.y(rowGroup.y());

    cellRect.width(colGroup.width());
    cellRect.height(rowGroup.height());
  }

  updateCellClientRect(cell: Cell) {
    const id = cell.id();
    const { row, col } = convertFromCellIdToRowCol(id);
    const rowGroup = this.sheet.row.rowColGroupMap.get(row)!;
    const colGroup = this.sheet.col.rowColGroupMap.get(col)!;
    const cellText = getCellTextFromCell(cell);
    const isMerged = this.sheet.merger.getIsCellMerged(id);

    this.setCellRect(cell, rowGroup, colGroup);

    if (isMerged) {
      this.setMergedCellProperties(cell);
    }

    const clientRect = cell.getClientRect({ skipStroke: true });

    if (cellText) {
      cellText.height(clientRect.height);
      cellText.width(clientRect.width);
    }
  }

  updateViewport() {
    this.cellsMap.forEach((cell) => {
      this.updateCellStyles(cell);
    });
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
        borders,
        backgroundColor,
        fontColor,
        bold,
        italic,
        strikeThrough,
        underline,
        horizontalTextAlign,
        verticalTextAlign,
        textFormatPattern,
      } = style;

      if (backgroundColor) {
        this.setBackgroundColor(cell, backgroundColor);
      }

      if (fontColor) {
        this.setFontColor(cell, fontColor);
      }

      if (bold) {
        this.setBold(cell, bold);
      }

      if (italic) {
        this.setItalic(cell, italic);
      }

      if (strikeThrough) {
        this.setStrikeThrough(cell, strikeThrough);
      }

      if (underline) {
        this.setUnderline(cell, underline);
      }

      if (horizontalTextAlign) {
        this.setHorizontalTextAlign(cell, horizontalTextAlign);
      }

      if (verticalTextAlign) {
        this.setVerticalTextAlign(cell, verticalTextAlign);
      }

      if (textFormatPattern) {
        this.setTextFormat(cell, textFormatPattern);
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
    const address = this.getCellHyperformulaAddress(id);

    const hyperformulaValue = this.spreadsheet.options.showFormulas
      ? this.spreadsheet.hyperformula.getCellSerialized(address)
      : this.spreadsheet.hyperformula.getCellValue(address);

    if (hyperformulaValue) {
      this.setCellTextValue(cell, hyperformulaValue?.toString());
    }

    // We set these styles here because they affect the cell size
    if (style) {
      const { textWrap, fontSize } = style;

      if (textWrap) {
        this.setTextWrap(cell, textWrap);
      }

      if (fontSize) {
        this.setFontSize(cell, fontSize);
      }
    }

    if (this.cellsMap.has(id)) {
      this.cellsMap.get(id)!.destroy();
    }

    this.cellsMap.set(id, cell);

    const existingRowCellMapValue = this.sheet.row.rowColCellMap.get(
      cell.attrs.row
    );
    const existingColCellMapValue = this.sheet.col.rowColCellMap.get(
      cell.attrs.col
    );
    this.sheet.row.rowColCellMap.set(
      cell.attrs.row,
      existingRowCellMapValue ? [...existingRowCellMapValue, id] : [id]
    );
    this.sheet.col.rowColCellMap.set(
      cell.attrs.col,
      existingColCellMapValue ? [...existingColCellMapValue, id] : [id]
    );

    this.drawCell(cell);
  }

  updateCells() {
    for (const cell of this.cellsMap.values()) {
      cell.destroy();
    }

    this.cellsMap.clear();
    this.sheet.row.rowColCellMap.clear();
    this.sheet.col.rowColCellMap.clear();

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

  setBackgroundColor(cell: Cell, backgroundColor: string) {
    const cellRect = getCellRectFromCell(cell);

    cellRect.fill(backgroundColor);
  }

  setFontColor(cell: Cell, fontColor: string) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      cellText.fill(fontColor);
    }
  }

  setFontSize(cell: Cell, fontSize: number) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      cellText.fontSize(fontSize);
    }
  }

  private getFontStyle(bold: boolean | undefined, italic: boolean | undefined) {
    if (bold && italic) return 'italic bold';

    if (bold && !italic) return 'bold';

    if (!bold && italic) return 'italic';

    return 'normal';
  }

  setBold(cell: Cell, bold: boolean) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      const italic = this.getCellData(cell.id())?.style?.italic;
      const fontStyle = this.getFontStyle(bold, italic);

      cellText.fontStyle(fontStyle);
    }
  }

  setItalic(cell: Cell, italic: boolean) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      const bold = this.getCellData(cell.id())?.style?.bold;
      const fontStyle = this.getFontStyle(bold, italic);

      cellText.fontStyle(fontStyle);
    }
  }

  private getTextDecoration(
    strikeThrough: boolean | undefined,
    underline: boolean | undefined
  ) {
    if (strikeThrough && underline) return 'line-through underline';

    if (strikeThrough && !underline) return 'line-through';

    if (!strikeThrough && underline) return 'underline';

    return '';
  }

  setStrikeThrough(cell: Cell, strikeThrough: boolean) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      const underline = this.getCellData(cell.id())?.style?.underline;
      const textDecoration = this.getTextDecoration(strikeThrough, underline);

      cellText.textDecoration(textDecoration);
    }
  }

  setUnderline(cell: Cell, underline: boolean) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      const strikeThrough = this.getCellData(cell.id())?.style?.strikeThrough;
      const textDecoration = this.getTextDecoration(strikeThrough, underline);

      cellText.textDecoration(textDecoration);
    }
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

  setTextFormat(cell: Cell, textFormatPattern: string) {
    const cellText = getCellTextFromCell(cell);

    if (cellText) {
      const text = cellText.text();
      const num = parseFloat(text);

      const formattedText = numfmt.format(
        textFormatPattern,
        isFinite(num) ? num : text
      );

      cellText.text(formattedText);
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
    const { width } = cell.getClientRect({ skipStroke: true });

    const text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      // Only set the width for textWrapping to work
      width,
    });

    cell.add(text);
  }

  getNewCell(id: string | null, row: Vector2d, col: Vector2d) {
    const rowGroup = this.sheet.row.rowColGroupMap.get(row.x)!;
    const colGroup = this.sheet.col.rowColGroupMap.get(col.x)!;

    const cell = new Group({
      ...performanceProperties,
      row,
      col,
    });

    if (id) {
      cell.id(id);
    }

    const cellRect = new Rect({
      type: 'cellRect',
    });

    cell.add(cellRect);

    this.setCellRect(cell, rowGroup, colGroup);

    const isMergedCell = this.sheet.merger.getIsCellMerged(cell.id());

    if (isMergedCell) {
      this.setMergedCellProperties(cell);
    }

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

  private setMergedCellProperties(cell: Cell) {
    const { row, col } = this.sheet.merger.associatedMergedCellIdMap.get(
      cell.id()
    )!;
    const rows = this.sheet.row.convertFromRangeToGroups(cell.attrs.row);
    const cols = this.sheet.col.convertFromRangeToGroups(cell.attrs.col);
    const cellRect = getCellRectFromCell(cell);
    const width = cols.reduce((prev, curr) => {
      return (prev += curr.width());
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += curr.height());
    }, 0);

    cellRect.fill('white');
    cellRect.stroke(this.spreadsheet.styles.gridLine.stroke as string);
    cellRect.strokeWidth(this.spreadsheet.styles.gridLine.strokeWidth!);
    cellRect.width(width);
    cellRect.height(height);

    cell.attrs.row = row;
    cell.attrs.col = col;
  }

  convertFromRowColToCell(rowGroup: Group, colGroup: Group) {
    const id = getCellId(rowGroup.attrs.index, colGroup.attrs.index);

    const row = {
      x: rowGroup.attrs.index,
      y: rowGroup.attrs.index,
    };

    const col = {
      x: colGroup.attrs.index,
      y: colGroup.attrs.index,
    };

    const cell = this.getNewCell(id, row, col);

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
      sheet: this.sheet.sheetId,
    };
  }
}

export default CellRenderer;
