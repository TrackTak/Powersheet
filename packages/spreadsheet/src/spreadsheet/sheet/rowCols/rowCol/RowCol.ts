import { Group } from 'konva/lib/Group';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { isNil } from 'lodash';
import Spreadsheet from '../../../Spreadsheet';
import SimpleCellAddress, { CellId } from '../../cells/cell/SimpleCellAddress';
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols';
import Sheet from '../../Sheet';
import RowColAddress, { SheetRowColId } from '../../cells/cell/RowColAddress';
import { IMergedCellData } from '../../Data';
import { centerRectTwoInRectOne } from '../../../utils';
import { Util } from 'konva/lib/Util';

class RowCol {
  spreadsheet: Spreadsheet;
  headerRect: Rect;
  headerText: Text;
  resizeLine: Line;
  sheet: Sheet;
  type: RowColType;
  pluralType: RowColsType;
  isCol: boolean;
  oppositeType: RowColType;
  oppositePluralType: RowColsType;
  functions: IRowColFunctions;
  oppositeFunctions: IRowColFunctions;
  rowColAddress: RowColAddress;

  constructor(
    public rowCols: RowCols,
    public index: number,
    public headerGroup: Group,
    public gridLine: Line,
    public xFrozenGridLine: Line,
    public yFrozenGridLine: Line,
    public xyFrozenGridLine: Line
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
    this.oppositePluralType = rowCols.oppositePluralType;
    this.functions = rowCols.functions;
    this.oppositeFunctions = rowCols.oppositeFunctions;
    this.gridLine = gridLine;
    this.xFrozenGridLine = xFrozenGridLine;
    this.yFrozenGridLine = yFrozenGridLine;
    this.xyFrozenGridLine = xyFrozenGridLine;
    this.headerRect = this.headerGroup.findOne('.headerRect');
    this.headerText = this.headerGroup.findOne('.headerText');
    this.resizeLine = this.headerGroup.findOne('.headerResizeLine');

    this.rowColAddress = new RowColAddress(this.sheet.sheetId, this.index);

    this.resizeLine.on('mouseover', this.resizeLineOnMouseOver);
    this.resizeLine.on('mouseout', this.resizeLineOnMouseOut);

    this.update();
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
    this.xFrozenGridLine.destroy();
    this.yFrozenGridLine.destroy();
    this.xyFrozenGridLine.destroy();
  }

  getIsOutsideSheet() {
    const clientRect = this.headerGroup.getClientRect({
      skipStroke: true,
    });
    const sheetRect = this.sheet.sheet.getClientRect();
    const sizeUpToFrozenRowCol = this.rowCols.getSizeUpToFrozenRowCol();

    sheetRect[this.functions.size] -= sizeUpToFrozenRowCol;
    sheetRect[this.functions.axis] += sizeUpToFrozenRowCol;

    const isShapeOutsideSheet =
      !Util.haveIntersection(sheetRect, {
        ...clientRect,
        [this.functions.axis]: clientRect[this.functions.axis] - 0.001,
      }) && !this.rowCols.getIsFrozen(this.index);

    return isShapeOutsideSheet;
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

  update() {
    const gridLineAxis =
      this.rowCols.getAxis(this.index) +
      this.rowCols.getSize(this.index) -
      this.sheet.getViewportVector()[this.functions.axis];

    this.headerGroup[this.functions.axis](this.rowCols.getAxis(this.index));
    this.headerRect[this.functions.size](this.rowCols.getSize(this.index));
    this.headerText.text(this.getHeaderTextContent());

    const headerTextMidPoints = centerRectTwoInRectOne(
      this.headerRect.getClientRect(),
      this.headerText.getClientRect()
    );

    this.headerText.position(headerTextMidPoints);

    this.resizeLine[this.functions.axis](this.rowCols.getSize(this.index));

    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[this.sheet.sheetId];

    const frozenCell = frozenCells?.[this.type];

    const size = this.sheet[this.oppositePluralType].getSizeUpToFrozenRowCol();

    this.gridLine[this.functions.axis](gridLineAxis);
    this.xFrozenGridLine[this.functions.axis](gridLineAxis);
    this.yFrozenGridLine[this.functions.axis](gridLineAxis);
    this.xyFrozenGridLine[this.functions.axis](gridLineAxis);

    this.xFrozenGridLine.hide();
    this.yFrozenGridLine.hide();
    this.xyFrozenGridLine.hide();

    if (!isNil(frozenCell)) {
      if (this.isCol) {
        if (this.index > frozenCell) {
          this.yFrozenGridLine.points(this.rowCols.getLinePoints(size));
          this.yFrozenGridLine.show();
        }

        if (this.index < frozenCell) {
          this.xFrozenGridLine.y(size);
          this.xFrozenGridLine.points(
            this.rowCols.getLinePoints(this.sheet.sheetDimensions.height)
          );
          this.xFrozenGridLine.show();
        }
      } else {
        if (this.index < frozenCell) {
          this.yFrozenGridLine.x(size);
          this.yFrozenGridLine.points(
            this.rowCols.getLinePoints(this.sheet.sheetDimensions.width)
          );
          this.yFrozenGridLine.show();
        }

        if (this.index > frozenCell) {
          this.xFrozenGridLine.points(this.rowCols.getLinePoints(size));
          this.xFrozenGridLine.show();
        }
      }

      if (this.index < frozenCell) {
        this.xyFrozenGridLine.points(this.rowCols.getLinePoints(size));
        this.xyFrozenGridLine.show();
      }
    }
  }
}

export default RowCol;
