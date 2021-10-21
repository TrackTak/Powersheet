import { Group } from '@tracktak/konva/lib/Group';
import { Line } from '@tracktak/konva/lib/shapes/Line';
import { Rect } from '@tracktak/konva/lib/shapes/Rect';
import { Text } from '@tracktak/konva/lib/shapes/Text';
import { head, isNil } from 'lodash';
import Spreadsheet from '../../../Spreadsheet';
import SimpleCellAddress, { CellId } from '../../cells/cell/SimpleCellAddress';
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols';
import Sheet from '../../Sheet';
import RowColAddress, { SheetRowColId } from '../../cells/cell/RowColAddress';
import { IMergedCellData } from '../../Data';
import { centerRectTwoInRectOne } from '../../../utils';

class RowCol {
  spreadsheet: Spreadsheet;
  headerRect: Rect;
  headerText: Text;
  resizeLine: Line;
  gridLine: Line;
  xFrozenLine?: Line;
  yFrozenLine?: Line;
  xyFrozenLine?: Line;
  sheet: Sheet;
  type: RowColType;
  pluralType: RowColsType;
  isCol: boolean;
  oppositeType: RowColType;
  functions: IRowColFunctions;
  oppositeFunctions: IRowColFunctions;
  rowColAddress: RowColAddress;

  constructor(
    public rowCols: RowCols,
    public index: number,
    public headerGroup: Group
  ) {
    this.rowCols = rowCols;
    this.index = index;
    this.headerGroup = headerGroup;
    this.sheet = rowCols.sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.type = rowCols.type;
    this.pluralType = rowCols.pluralType;
    this.isCol = rowCols.isCol;
    this.oppositeType = rowCols.oppositeType;
    this.functions = rowCols.functions;
    this.oppositeFunctions = rowCols.oppositeFunctions;
    this.headerRect = this.headerGroup.findOne('.headerRect');
    this.headerText = this.headerGroup.findOne('.headerText');
    this.resizeLine = this.headerGroup.findOne('.headerResizeLine');
    this.gridLine = this.rowCols.cachedGridLine.clone({
      [this.functions.axis]:
        this.rowCols.getAxis(this.index) +
        this.rowCols.getSize(this.index) -
        this.sheet.getViewportVector()[this.functions.axis],
    });
    this.rowColAddress = new RowColAddress(this.sheet.sheetId, this.index);

    this.headerGroup[this.functions.axis](this.rowCols.getAxis(this.index));
    this.headerRect[this.functions.size](this.rowCols.getSize(this.index));
    this.headerText.text(this.getHeaderTextContent());

    // const headerTextMidPoints = centerRectTwoInRectOne(
    //   this.headerRect.getClientRect(),
    //   this.headerText.getClientRect()
    // );

    // this.headerText.position(headerTextMidPoints);

    this.resizeLine[this.functions.axis](this.rowCols.getSize(this.index));

    // this.drawGridLine();

    // if (this.rowCols.getIsLastFrozen(this.index)) {
    //   this.gridLine.setAttrs(this.spreadsheet.styles[this.type].frozenLine);

    //   this.rowCols.frozenLine = this.gridLine;

    //   this.rowCols.frozenLine[this.functions.axis](
    //     this.rowCols.getAxis(this.index) +
    //       this.rowCols.getSize(this.index) -
    //       this.sheet.getViewportVector()[this.functions.axis]
    //   );

    //   this.sheet.scrollGroups.xySticky.sheetGroup.add(this.rowCols.frozenLine);
    // }

    this.resizeLine.on('mouseover', this.resizeLineOnMouseOver);
    this.resizeLine.on('mouseout', this.resizeLineOnMouseOut);
  }

  resizeLineOnMouseOver = () => {
    this.rowCols.resizer.setCursor();

    this.rowCols.resizer.showResizeMarker(this.index);
  };

  resizeLineOnMouseOut = () => {
    this.rowCols.resizer.resetCursor();

    this.rowCols.resizer.hideResizeMarker();
  };

  destroy() {
    this.resizeLine.off('mouseover', this.resizeLineOnMouseOver);
    this.resizeLine.off('mouseup', this.resizeLineOnMouseOut);

    this.headerGroup.destroy();
    this.gridLine.destroy();
    this.xFrozenLine?.destroy();
    this.yFrozenLine?.destroy();
    this.xyFrozenLine?.destroy();
  }

  private shiftFrozenCells(getValue: (frozenCell: number) => number) {
    if (this.rowCols.getIsFrozen(this.index)) {
      const existingFrozenCells =
        this.spreadsheet.data.spreadsheetData.frozenCells![this.sheet.sheetId];

      this.spreadsheet.data.setFrozenCell(this.sheet.sheetId, {
        [this.type]: getValue(existingFrozenCells![this.type]!),
      });
    }
  }

  delete(amount: number) {
    const comparer = (x: string, y: string) =>
      new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      }).compare(x, y);

    this.spreadsheet.pushToHistory(() => {
      const { cells, mergedCells, ...rest } =
        this.spreadsheet.data.spreadsheetData.sheets![this.sheet.sheetId];
      const rowCols = rest[this.pluralType];

      this.shiftFrozenCells((frozenCell) => frozenCell - amount);

      Object.keys(mergedCells ?? {})
        .sort(comparer)
        .forEach((key) => {
          const topLeftCellId = key as CellId;
          const mergedCell =
            this.spreadsheet.data.spreadsheetData.mergedCells![topLeftCellId];

          const newMergedCell: IMergedCellData = {
            id: mergedCell.id,
            row: { ...mergedCell.row },
            col: { ...mergedCell.col },
          };

          if (
            mergedCell[this.type].x === this.index &&
            mergedCell[this.type].x === mergedCell[this.type].y
          ) {
            this.spreadsheet.data.deleteMergedCell(
              SimpleCellAddress.cellIdToAddress(topLeftCellId)
            );
            return;
          }

          if (mergedCell[this.type].x > this.index) {
            newMergedCell[this.type].x = mergedCell[this.type].x - amount;
          }

          if (mergedCell[this.type].y >= this.index) {
            newMergedCell[this.type].y = mergedCell[this.type].y - amount;
          }

          const simpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          );

          this.spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          );
          this.spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell);
        });

      Object.keys(rowCols ?? {})
        .sort(comparer)
        .forEach((key) => {
          const sheetRowColId = key as SheetRowColId;
          const sheetRowColAddress =
            RowColAddress.sheetRowColIdToAddress(sheetRowColId);
          const rowColIndex = sheetRowColAddress.rowCol;

          if (rowColIndex < this.index) return;

          if (rowColIndex > this.index) {
            const rowCol =
              this.spreadsheet.data.spreadsheetData[this.pluralType]![
                sheetRowColId
              ];
            const newRowColIndex = rowColIndex - amount;

            this.spreadsheet.data.setRowCol(
              this.pluralType,
              new RowColAddress(sheetRowColAddress.sheet, newRowColIndex),
              rowCol
            );
          }
          this.spreadsheet.data.deleteRowCol(
            this.pluralType,
            sheetRowColAddress
          );
        });

      Object.keys(cells ?? {})
        .sort(comparer)
        .forEach((key) => {
          const cellId = key as CellId;
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
          const newSimpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            this.isCol ? simpleCellAddress.row : simpleCellAddress.row - amount,
            this.isCol ? simpleCellAddress.col - amount : simpleCellAddress.col
          );

          if (simpleCellAddress[this.type] < this.index) return;

          if (simpleCellAddress[this.type] > this.index) {
            const cellId = simpleCellAddress.toCellId();
            const cell = this.spreadsheet.data.spreadsheetData.cells![cellId];

            this.spreadsheet.data.setCell(newSimpleCellAddress, cell, false);
          }

          this.spreadsheet.data.deleteCell(simpleCellAddress, false, false);
        });

      if (this.isCol) {
        this.spreadsheet.hyperformula.removeColumns(this.sheet.sheetId, [
          this.index,
          amount,
        ]);
      } else {
        this.spreadsheet.hyperformula.removeRows(this.sheet.sheetId, [
          this.index,
          amount,
        ]);
      }
    });

    this.spreadsheet.updateViewport();
  }

  insert(amount: number) {
    const comparer = (x: string, y: string) =>
      new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      }).compare(y, x);

    this.spreadsheet.pushToHistory(() => {
      const { cells, mergedCells, ...rest } =
        this.spreadsheet.data.spreadsheetData.sheets![this.sheet.sheetId];
      const rowCols = rest[this.pluralType];

      this.shiftFrozenCells((frozenCell) => frozenCell + amount);

      Object.keys(mergedCells ?? {})
        .sort(comparer)
        .forEach((key) => {
          const topLeftCellId = key as CellId;
          const mergedCell =
            this.spreadsheet.data.spreadsheetData.mergedCells![topLeftCellId];

          const newMergedCell: IMergedCellData = {
            id: mergedCell.id,
            row: { ...mergedCell.row },
            col: { ...mergedCell.col },
          };

          if (mergedCell[this.type].x >= this.index) {
            newMergedCell[this.type].x = mergedCell[this.type].x + amount;
          }

          if (mergedCell[this.type].y >= this.index) {
            newMergedCell[this.type].y = mergedCell[this.type].y + amount;
          }

          const simpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          );

          this.spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          );
          this.spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell);
        });

      Object.keys(rowCols ?? {})
        .sort(comparer)
        .forEach((key) => {
          const sheetRowColId = key as SheetRowColId;
          const sheetRowColAddress =
            RowColAddress.sheetRowColIdToAddress(sheetRowColId);
          const rowColIndex = sheetRowColAddress.rowCol;

          if (rowColIndex < this.index) return;

          const rowCol =
            this.spreadsheet.data.spreadsheetData[this.pluralType]![
              sheetRowColId
            ];
          const newRowColIndex = rowColIndex + amount;

          this.spreadsheet.data.setRowCol(
            this.pluralType,
            new RowColAddress(sheetRowColAddress.sheet, newRowColIndex),
            rowCol
          );
          this.spreadsheet.data.deleteRowCol(
            this.pluralType,
            sheetRowColAddress
          );
        });

      Object.keys(cells ?? {})
        .sort(comparer)
        .forEach((key) => {
          const cellId = key as CellId;
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
          const newSimpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            this.isCol ? simpleCellAddress.row : simpleCellAddress.row + amount,
            this.isCol ? simpleCellAddress.col + amount : simpleCellAddress.col
          );

          if (simpleCellAddress[this.type] < this.index) return;

          const cell = this.spreadsheet.data.spreadsheetData.cells![cellId];

          this.spreadsheet.data.setCell(newSimpleCellAddress, cell, false);
          this.spreadsheet.data.deleteCell(simpleCellAddress, false, false);
        });

      if (this.isCol) {
        this.spreadsheet.hyperformula.addColumns(this.sheet.sheetId, [
          this.index,
          amount,
        ]);
      } else {
        this.spreadsheet.hyperformula.addRows(this.sheet.sheetId, [
          this.index,
          amount,
        ]);
      }
    });

    this.spreadsheet.updateViewport();
  }

  getHeaderTextContent() {
    if (this.isCol) {
      const startCharCode = 'A'.charCodeAt(0);
      const letter = String.fromCharCode(startCharCode + this.index);

      return letter;
    } else {
      return (this.index + 1).toString();
    }
  }

  private getSizeUpToFrozenRowCol() {
    let size = 0;

    for (const value of this.sheet[
      this.isCol ? 'rows' : 'cols'
    ].getSizeForFrozenCell()) {
      size = value.size;
    }

    return size;
  }

  private setXFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (!this.isCol && this.index > frozenCell) {
      this.xFrozenLine = this.gridLine.clone({
        points: this.rowCols.getLinePoints(size),
      });
    }

    if (this.isCol && this.index < frozenCell) {
      this.xFrozenLine = this.gridLine.clone({
        y: size,
        points: this.rowCols.getLinePoints(this.sheet.sheetDimensions.height),
      });
    }
  }

  private setYFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (!this.isCol && this.index < frozenCell) {
      this.yFrozenLine = this.gridLine.clone({
        x: size,
        points: this.rowCols.getLinePoints(this.sheet.sheetDimensions.width),
      });
    }

    if (this.isCol && this.index > frozenCell) {
      this.yFrozenLine = this.gridLine.clone({
        points: this.rowCols.getLinePoints(size),
      });
    }
  }

  private setXYFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (this.index < frozenCell) {
      this.xyFrozenLine = this.gridLine.clone({
        points: this.rowCols.getLinePoints(size),
      });
    }
  }

  private drawGridLine() {
    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[this.sheet.sheetId];
    const frozenRow = frozenCells?.row;
    const frozenCol = frozenCells?.col;
    const frozenCell = frozenCells?.[this.type];

    if (!isNil(frozenCell)) {
      this.setXFrozenGridLine(frozenCell);
      this.setYFrozenGridLine(frozenCell);
    } else {
      this.sheet.scrollGroups.xSticky.frozenBackground.destroy();
      this.sheet.scrollGroups.ySticky.frozenBackground.destroy();
      this.sheet.scrollGroups.xySticky.frozenBackground.destroy();
    }

    if (!isNil(frozenRow) && !isNil(frozenCol)) {
      this.setXYFrozenGridLine(frozenCell!);
    }

    if (this.xyFrozenLine) {
      this.sheet.scrollGroups.xySticky.rowColGroup.add(this.xyFrozenLine!);
    }

    if (this.yFrozenLine) {
      this.sheet.scrollGroups.ySticky.rowColGroup.add(this.yFrozenLine!);
    }

    if (this.xFrozenLine) {
      this.sheet.scrollGroups.xSticky.rowColGroup.add(this.xFrozenLine!);
    }
    this.sheet.scrollGroups.main.rowColGroup.add(this.gridLine);
  }
}

export default RowCol;
