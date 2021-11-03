import { Group } from 'konva/lib/Group';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { isNil } from 'lodash';
import Spreadsheet from '../../../Spreadsheet';
import SimpleCellAddress, { CellId } from '../../cells/cell/SimpleCellAddress';
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols';
import Sheets from '../../Sheets';
import RowColAddress, { SheetRowColId } from '../../cells/cell/RowColAddress';
import { IMergedCellData } from '../../Data';
import {
  centerRectTwoInRectOne,
  dataKeysComparer,
  getColumnHeader,
} from '../../../utils';
import { Util } from 'konva/lib/Util';

class RowCol {
  spreadsheet: Spreadsheet;
  headerRect: Rect;
  headerText: Text;
  resizeLine: Line;
  sheets: Sheets;
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
    this.sheets = rowCols.sheets;
    this.spreadsheet = this.sheets.spreadsheet;
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
    this.resizeLine = this.headerGroup.findOne('.resizeLine');

    this.rowColAddress = new RowColAddress(
      this.sheets.activeSheetId,
      this.index
    );

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
    const sheetRect = this.sheets.sheet.getClientRect();
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
        this.spreadsheet.data.spreadsheetData.frozenCells![
          this.sheets.activeSheetId
        ];

      this.spreadsheet.data.setFrozenCell(this.sheets.activeSheetId, {
        [this.type]: getValue(existingFrozenCells![this.type]!),
      });
    }
  }

  delete(amount: number) {
    this.spreadsheet.pushToHistory(() => {
      const { cells, mergedCells, ...rest } =
        this.spreadsheet.data.spreadsheetData.sheets![
          this.sheets.activeSheetId
        ];
      const rowCols = rest[this.pluralType];

      if (this.isCol) {
        this.spreadsheet.hyperformula.removeColumns(this.sheets.activeSheetId, [
          this.index,
          amount,
        ]);
      } else {
        this.spreadsheet.hyperformula.removeRows(this.sheets.activeSheetId, [
          this.index,
          amount,
        ]);
      }

      this.shiftFrozenCells((frozenCell) => frozenCell - amount);

      Object.keys(mergedCells ?? {})
        .sort(dataKeysComparer)
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
            this.sheets.activeSheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          );

          this.spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          );
          this.spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell);
        });

      Object.keys(rowCols ?? {})
        .sort(dataKeysComparer)
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
        .sort(dataKeysComparer)
        .forEach((key) => {
          const cellId = key as CellId;
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
          const newSimpleCellAddress = new SimpleCellAddress(
            this.sheets.activeSheetId,
            this.isCol ? simpleCellAddress.row : simpleCellAddress.row - amount,
            this.isCol ? simpleCellAddress.col - amount : simpleCellAddress.col
          );

          if (simpleCellAddress[this.type] < this.index) return;

          if (simpleCellAddress[this.type] > this.index) {
            const cellId = simpleCellAddress.toCellId();
            const cell = this.spreadsheet.data.spreadsheetData.cells![cellId];
            const newValue = this.spreadsheet.hyperformula
              .getCellSerialized(newSimpleCellAddress)
              ?.toString();

            this.spreadsheet.data.setCell(
              newSimpleCellAddress,
              {
                ...cell,
                value: newValue,
              },
              false
            );
          }

          this.spreadsheet.data.deleteCell(simpleCellAddress, false, false);
        });
    });

    this.spreadsheet.updateViewport();
  }

  insert(amount: number) {
    this.spreadsheet.pushToHistory(() => {
      const { cells, mergedCells, ...rest } =
        this.spreadsheet.data.spreadsheetData.sheets![
          this.sheets.activeSheetId
        ];
      const rowCols = rest[this.pluralType];

      if (this.isCol) {
        this.spreadsheet.hyperformula.addColumns(this.sheets.activeSheetId, [
          this.index,
          amount,
        ]);
      } else {
        this.spreadsheet.hyperformula.addRows(this.sheets.activeSheetId, [
          this.index,
          amount,
        ]);
      }

      this.shiftFrozenCells((frozenCell) => frozenCell + amount);

      Object.keys(mergedCells ?? {})
        .sort((a, b) => dataKeysComparer(b, a))
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
            this.sheets.activeSheetId,
            newMergedCell.row.x,
            newMergedCell.col.x
          );

          this.spreadsheet.data.deleteMergedCell(
            SimpleCellAddress.cellIdToAddress(topLeftCellId)
          );
          this.spreadsheet.data.setMergedCell(simpleCellAddress, newMergedCell);
        });

      Object.keys(rowCols ?? {})
        .sort((a, b) => dataKeysComparer(b, a))
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
        .sort((a, b) => dataKeysComparer(b, a))
        .forEach((key) => {
          const cellId = key as CellId;
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId);
          const newSimpleCellAddress = new SimpleCellAddress(
            this.sheets.activeSheetId,
            this.isCol ? simpleCellAddress.row : simpleCellAddress.row + amount,
            this.isCol ? simpleCellAddress.col + amount : simpleCellAddress.col
          );

          if (simpleCellAddress[this.type] < this.index) return;

          const cell = this.spreadsheet.data.spreadsheetData.cells![cellId];
          const newValue = this.spreadsheet.hyperformula
            .getCellSerialized(newSimpleCellAddress)
            ?.toString();

          this.spreadsheet.data.setCell(
            newSimpleCellAddress,
            {
              ...cell,
              value: newValue,
            },
            false
          );
          this.spreadsheet.data.deleteCell(simpleCellAddress, false, false);
        });
    });

    this.spreadsheet.updateViewport();
  }

  getHeaderTextContent() {
    if (this.isCol) {
      return getColumnHeader(this.index + 1);
    } else {
      return (this.index + 1).toString();
    }
  }

  update() {
    const gridLineAxis =
      this.rowCols.getAxis(this.index) +
      this.rowCols.getSize(this.index) -
      this.sheets.getViewportVector()[this.functions.axis];

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
      this.spreadsheet.data.spreadsheetData.frozenCells?.[
        this.sheets.activeSheetId
      ];

    const frozenCell = frozenCells?.[this.type];

    const size = this.sheets[this.oppositePluralType].getSizeUpToFrozenRowCol();

    this.gridLine[this.functions.axis](gridLineAxis);
    this.xFrozenGridLine[this.functions.axis](gridLineAxis);
    this.yFrozenGridLine[this.functions.axis](gridLineAxis);
    this.xyFrozenGridLine[this.functions.axis](gridLineAxis);

    this.xFrozenGridLine.hide();
    this.yFrozenGridLine.hide();
    this.xyFrozenGridLine.hide();

    this.sheets.scrollGroups.main.rowColGroup.add(this.gridLine);
    this.sheets.scrollGroups.xSticky.rowColGroup.add(this.xFrozenGridLine);
    this.sheets.scrollGroups.ySticky.rowColGroup.add(this.yFrozenGridLine);
    this.sheets.scrollGroups.xySticky.rowColGroup.add(this.xyFrozenGridLine);

    if (this.isCol) {
      this.sheets.scrollGroups.ySticky.headerGroup.add(this.headerGroup);
    } else {
      this.sheets.scrollGroups.xSticky.headerGroup.add(this.headerGroup);
    }

    if (!isNil(frozenCell)) {
      if (this.isCol) {
        if (this.index > frozenCell) {
          this.yFrozenGridLine.points(this.rowCols.getLinePoints(size));
          this.yFrozenGridLine.show();
        }

        if (this.index < frozenCell) {
          this.xFrozenGridLine.y(size);
          this.xFrozenGridLine.points(
            this.rowCols.getLinePoints(this.sheets.sheetDimensions.height)
          );
          this.xFrozenGridLine.show();
        }
      } else {
        if (this.index < frozenCell) {
          this.yFrozenGridLine.x(size);
          this.yFrozenGridLine.points(
            this.rowCols.getLinePoints(this.sheets.sheetDimensions.width)
          );
          this.yFrozenGridLine.show();
        }

        if (this.index > frozenCell) {
          this.xFrozenGridLine.points(this.rowCols.getLinePoints(size));
          this.xFrozenGridLine.show();
        }
      }

      if (this.index <= frozenCell) {
        this.sheets.scrollGroups.xySticky.headerGroup.add(this.headerGroup);
      }

      if (this.index < frozenCell) {
        this.xyFrozenGridLine.points(this.rowCols.getLinePoints(size));
        this.xyFrozenGridLine.show();
      }
    }
  }
}

export default RowCol;
