import { Group } from 'konva/lib/Group';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
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
  iterateXToY,
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

export const convertFromCellIdToRowColId = (id: CellId): IRowColAddress => {
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

  private setCellRect(cell: Cell, row: number, col: number) {
    const rowHeader = this.sheet.row.headerGroupMap.get(row)!;
    const colHeader = this.sheet.col.headerGroupMap.get(col)!;
    const cellRect = getCellRectFromCell(cell);

    cell.x(colHeader.x() - this.sheet.getViewportVector().x);
    cell.y(rowHeader.y() - this.sheet.getViewportVector().y);

    cellRect.width(colHeader.width());
    cellRect.height(rowHeader.height());
  }

  updateCellClientRect(cell: Cell) {
    const id = cell.id();
    const { row, col } = convertFromCellIdToRowColId(id);
    const cellText = getCellTextFromCell(cell);
    const isMerged = this.sheet.merger.getIsCellMerged(id);

    this.setCellRect(cell, row, col);

    if (isMerged) {
      this.setMergedCellProperties(cell);
    }

    const clientRect = cell.getClientRect({ skipStroke: true });

    if (cellText) {
      cellText.height(clientRect.height);
      cellText.width(clientRect.width);
    }
  }

  private destroyOutOfViewportCells() {
    for (const [key, cell] of this.cellsMap) {
      if (this.sheet.isShapeOutsideOfViewport(cell)) {
        cell.destroy();

        this.sheet.cellRenderer.cellsMap.delete(key);
      }
    }
  }

  drawCells() {
    this.destroyOutOfViewportCells();

    for (const ri of iterateXToY(
      this.sheet.row.scrollBar.sheetViewportPosition
    )) {
      for (const ci of iterateXToY(
        this.sheet.col.scrollBar.sheetViewportPosition
      )) {
        this.sheet.cellRenderer.drawCell(getCellId(ri, ci));
      }
    }
  }

  drawCell(cellId: CellId) {
    const cellData = this.sheet.getData().cellsData?.[cellId];

    if (!cellData) return;

    const cell = this.convertFromCellIdToCell(cellId);
    const style = cellData?.style;
    const address = this.getCellHyperformulaAddress(cellId);
    const hyperformulaValue = this.spreadsheet.options.showFormulas
      ? this.spreadsheet.hyperformula.getCellSerialized(address)
      : this.spreadsheet.hyperformula.getCellValue(address);

    this.updateCellClientRect(cell);

    if (hyperformulaValue) {
      this.setCellTextValue(cell, hyperformulaValue?.toString());
    }

    if (cellData?.comment) {
      this.setCellCommentMarker(cell);
    }

    if (style) {
      const {
        textWrap,
        fontSize,
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

      if (textWrap) {
        this.setTextWrap(cell, textWrap);
      }

      if (fontSize) {
        this.setFontSize(cell, fontSize);
      }

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

    if (this.cellsMap.has(cellId)) {
      this.cellsMap.get(cellId)!.destroy();
    }

    this.cellsMap.set(cellId, cell);

    this.addCell(cell);

    if (!this.sheet.merger.getIsCellMerged(cellId)) {
      const cell = this.sheet.cellRenderer.cellsMap.get(cellId)!;
      const rowIndex = convertFromCellIdToRowColId(cellId).row;
      const size = this.sheet.row.getSize(rowIndex);
      const cellSize = cell.getClientRect({
        skipStroke: true,
      }).height;

      if (cellSize > size) {
        this.sheet.setData({
          row: {
            sizes: {
              [rowIndex]: cellSize,
            },
          },
        });
        this.sheet.updateViewport();
      }
    }
  }

  updateViewport() {
    this.sheet.merger.updateMergedCells();

    this.cellsMap.forEach((_, id) => {
      this.cleanCellData(id);

      this.drawCell(id);
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

  getNewCell(id: string | null, row: number, col: number) {
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

    this.setCellRect(cell, row, col);

    const isMergedCell = this.sheet.merger.getIsCellMerged(cell.id());

    if (isMergedCell) {
      this.setMergedCellProperties(cell);
    }

    return cell;
  }

  convertFromRowColIdToCell(row: number, col: number) {
    const id = getCellId(row, col);
    const cell = this.getNewCell(id, row, col);

    return cell;
  }

  convertFromCellIdToCell(id: CellId) {
    const { row, col } = convertFromCellIdToRowColId(id);
    const cell = this.getNewCell(id, row, col);

    return cell;
  }

  private setMergedCellProperties(cell: Cell) {
    const { row, col } = this.sheet.merger.associatedMergedCellIdMap.get(
      cell.id()
    )!;
    const rows = this.sheet.row.convertFromRangeToRowCols(cell.attrs.row);
    const cols = this.sheet.col.convertFromRangeToRowCols(cell.attrs.col);
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

  convertFromRowColsToCells(rows: Line[], cols: Line[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowLine) => {
      cols.forEach((colLine) => {
        const row = rowLine.attrs.index;
        const col = colLine.attrs.index;
        const id = getCellId(row, col);
        const mergedCells = this.sheet.merger.associatedMergedCellIdMap.get(id);

        const cell = this.convertFromRowColIdToCell(row, col);

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

  addCell(cell: Cell) {
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
      ...convertFromCellIdToRowColId(id),
      sheet: this.sheet.sheetId,
    };
  }
}

export default CellRenderer;
