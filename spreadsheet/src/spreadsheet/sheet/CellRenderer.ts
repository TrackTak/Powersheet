import { Group } from 'konva/lib/Group';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import Spreadsheet from '../Spreadsheet';
import { performanceProperties } from '../styles';
import { rotateAroundCenter } from '../utils';
import Sheet, {
  BorderStyle,
  getCellRectFromCell,
  getCellTextFromCell,
  HorizontalTextAlign,
  ICellData,
  ICellStyle,
  iterateXToY,
  TextWrap,
  VerticalTextAlign,
} from './Sheet';
import { isNil, merge } from 'lodash';

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

export const convertFromRowColToCellString = (row: number, col: number) => {
  const letter = String.fromCharCode('A'.charCodeAt(0) + col);
  const number = row + 1;

  return `${letter}${number}`;
};

export const convertFromCellsToMinMax = (
  cells: Cell[],
  minCallbackFn: (cell: Cell) => number,
  maxCallbackFn: (cell: Cell) => number
) => {
  const getMin = () => Math.min(...cells.map(minCallbackFn));
  const getMax = () => Math.max(...cells.map(maxCallbackFn));

  const minMax = {
    min: getMin(),
    max: getMax(),
  };

  return minMax;
};

class CellRenderer {
  cellsMap: Map<CellId, Cell>;
  commentMarkerConfig: LineConfig;
  private spreadsheet: Spreadsheet;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
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

  deleteCellData(cellId: CellId) {
    delete this.sheet.getData().cellsData?.[cellId];
  }

  setHyperformulaCellData(id: CellId, value: string | undefined) {
    const cellAddress = this.getCellHyperformulaAddress(id);

    try {
      this.spreadsheet.hyperformula?.setCellContents(cellAddress, value);
    } catch (e) {
      console.error(e);
    }
  }

  setCellData(
    id: CellId,
    newValue: Partial<ICellData>,
    addToHistory: boolean = true
  ) {
    const data = this.sheet.getData();
    const updatedData = merge({}, data, {
      cellsData: {
        [id]: {
          ...newValue,
        },
      },
    });

    this.sheet.setData(updatedData, addToHistory);

    this.setHyperformulaCellData(id, updatedData.cellsData[id].value);
  }

  setCellDataBatch(cellData: Record<CellId, Partial<ICellData>>) {
    this.spreadsheet.addToHistory();
    Object.keys(cellData).forEach((id) => {
      this.deleteCellData(id);
      this.setCellData(id, cellData[id], false);
    });
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

  private clearAll() {
    this.cellsMap.forEach((cell) => {
      cell.destroy();
    });
    this.cellsMap.clear();
    this.sheet.merger.associatedMergedCellIdMap.clear();
  }

  // forceDraw is turned off for scrolling for performance
  drawViewport(forceDraw = false) {
    const getShouldDraw = (ri: number, ci: number) => {
      const cellId = getCellId(ri, ci);
      const cellAlreadyExists = this.cellsMap.get(cellId);

      return forceDraw || !cellAlreadyExists;
    };

    const data = this.sheet.getData();

    if (data.frozenCells) {
      const frozenRow = data.frozenCells.row;
      const frozenCol = data.frozenCells.col;

      if (!isNil(frozenRow)) {
        for (let ri = 0; ri <= frozenRow; ri++) {
          for (const ci of this.sheet.col.headerGroupMap.keys()) {
            if (getShouldDraw(ri, ci)) {
              this.sheet.cellRenderer.drawCell(getCellId(ri, ci));
            }
          }
        }
      }

      if (!isNil(frozenCol)) {
        for (let ci = 0; ci <= frozenCol; ci++) {
          for (const ri of this.sheet.row.headerGroupMap.keys()) {
            if (getShouldDraw(ri, ci)) {
              this.sheet.cellRenderer.drawCell(getCellId(ri, ci));
            }
          }
        }
      }
    }

    for (const ri of iterateXToY(
      this.sheet.row.scrollBar.sheetViewportPosition
    )) {
      for (const ci of iterateXToY(
        this.sheet.col.scrollBar.sheetViewportPosition
      )) {
        if (getShouldDraw(ri, ci)) {
          this.sheet.cellRenderer.drawCell(getCellId(ri, ci));
        }
      }
    }
  }

  updateViewport() {
    this.clearAll();
    this.drawViewport(true);
  }

  drawCell(cellId: CellId) {
    const cellData = this.getCellData(cellId);
    const shouldDrawCell =
      cellData || this.sheet.merger.getIsCellTopLeftMergedCell(cellId);

    if (!shouldDrawCell) return;

    this.sheet.merger.setAssociatedMergedCellIds(cellId);

    const cell = this.convertFromCellIdToCell(cellId);
    const style = cellData?.style;
    const address = this.getCellHyperformulaAddress(cellId);
    let value =
      this.spreadsheet.hyperformula?.getCellValue(address) ?? cellData?.value;

    if (this.spreadsheet.options.showFormulas) {
      value = cellData?.value;
    }

    if (value) {
      this.setCellTextValue(cell, value?.toString());
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

    const type = this.getStickyGroupTypeFromCell(cell);

    this.sheet.scrollGroups[type].cellGroup.add(cell);

    cell.moveToTop();

    if (!this.sheet.merger.getIsCellPartOfMerge(cellId)) {
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
    this.setCellTextHeight(cell);
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

    return line;
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

  async setTextFormat(cell: Cell, textFormatPattern: string) {
    const cellText = getCellTextFromCell(cell);

    if (cellText && !this.spreadsheet.options.showFormulas) {
      const { format } = await import('numfmt');
      let text = cellText.text();

      try {
        text = format(textFormatPattern, Number(text));
      } catch (e) {
        text = e as string;
      }

      try {
        text = format(textFormatPattern, text);
      } catch (e) {
        text = e as string;
      }

      cellText.text(text);
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

  setCellTextHeight(cell: Cell) {
    const { height } = cell.getClientRect({ skipStroke: true });
    const text = getCellTextFromCell(cell);

    if (text && text.wrap() !== 'wrap') {
      text.height(height);
    }
  }

  setCellTextValue(cell: Cell, value: string) {
    const { width } = cell.getClientRect({ skipStroke: true });

    const text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      // Only set the width for text wrapping to work
      width,
    });

    cell.add(text);
  }

  getNewCell(id: string | null, row: number, col: number) {
    const rowGroup = this.sheet.row.rowColMap.get(row)!;
    const colGroup = this.sheet.col.rowColMap.get(col)!;

    const rowRange = {
      x: rowGroup.attrs.index,
      y: rowGroup.attrs.index,
    };

    const colRange = {
      x: colGroup.attrs.index,
      y: colGroup.attrs.index,
    };

    const cell = new Group({
      ...performanceProperties,
      row: rowRange,
      col: colRange,
    });

    if (id) {
      cell.id(id);
    }

    const cellRect = new Rect(this.spreadsheet.styles.cell.rect);

    cell.add(cellRect);

    this.setCellRect(cell, row, col);

    const isMergedCell = this.sheet.merger.getIsCellPartOfMerge(cell.id());

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
    const rows = this.sheet.row.convertFromRangeToRowCols(row);
    const cols = this.sheet.col.convertFromRangeToRowCols(col);
    const cellRect = getCellRectFromCell(cell);

    const width = cols.reduce((prev, curr) => {
      return (prev += curr.width());
    }, 0);

    const height = rows.reduce((prev, curr) => {
      return (prev += curr.height());
    }, 0);

    cellRect.width(width);
    cellRect.height(height);

    cell.attrs.row = row;
    cell.attrs.col = col;
  }

  convertFromRowColsToCells(rows: Group[], cols: Group[]) {
    const mergedCellsAddedMap = new Map();
    const cells: Cell[] = [];

    rows.forEach((rowGroup) => {
      cols.forEach((colGroup) => {
        const row = rowGroup.attrs.index;
        const col = colGroup.attrs.index;
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

  isOnFrozenRow(cell: Cell) {
    return this.sheet.row.getIsFrozen(cell.attrs.row.x);
  }

  isOnFrozenCol(cell: Cell) {
    return this.sheet.col.getIsFrozen(cell.attrs.col.x);
  }

  getStickyGroupTypeFromCell(cell: Cell) {
    const isOnFrozenRow = this.isOnFrozenRow(cell);
    const isOnFrozenCol = this.isOnFrozenCol(cell);

    if (isOnFrozenRow && isOnFrozenCol) {
      return 'xySticky';
    } else if (isOnFrozenRow) {
      return 'ySticky';
    } else if (isOnFrozenCol) {
      return 'xSticky';
    } else {
      return 'main';
    }
  }

  getCellHyperformulaAddress(id: CellId) {
    return {
      ...convertFromCellIdToRowColId(id),
      sheet: this.sheet.sheetId,
    };
  }
}

export default CellRenderer;
