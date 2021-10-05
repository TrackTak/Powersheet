import { Group } from 'konva/lib/Group';
import { Line } from 'konva/lib/shapes/Line';
import { Rect } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { isNil, merge } from 'lodash';
import Spreadsheet from '../../../Spreadsheet';
import { centerRectTwoInRectOne } from '../../../utils';
import SimpleCellAddress from '../../cells/cell/SimpleCellAddress';
import Resizer from './Resizer';
import RowCols, { IRowColFunctions, RowColType } from '../RowCols';
import Sheet from '../../Sheet';

class RowCol {
  spreadsheet: Spreadsheet;
  headerGroup: Group;
  headerRect: Rect;
  headerText: Text;
  gridLine: Line;
  xFrozenLine?: Line;
  yFrozenLine?: Line;
  xyFrozenLine?: Line;
  resizer: Resizer;
  sheet: Sheet;
  type: RowColType;
  isCol: boolean;
  oppositeType: RowColType;
  functions: IRowColFunctions;
  oppositeFunctions: IRowColFunctions;

  constructor(public rowCols: RowCols, public index: number) {
    this.rowCols = rowCols;
    this.index = index;
    this.sheet = rowCols.sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    this.type = rowCols.type;
    this.isCol = rowCols.isCol;
    this.oppositeType = rowCols.oppositeType;
    this.functions = rowCols.functions;
    this.oppositeFunctions = rowCols.oppositeFunctions;

    this.resizer = new Resizer(this);

    this.headerGroup = new Group({
      [this.functions.size]: this.rowCols.getSize(this.index),
      [this.functions.axis]: this.getAxis(),
    });
    this.headerRect = new Rect({
      ...this.spreadsheet.styles[this.type].headerRect,
      [this.functions.size]: this.rowCols.getSize(this.index),
    });
    this.headerText = new Text({
      ...this.spreadsheet.styles[this.type].headerText,
      text: this.getHeaderTextContent(),
    });
    const headerTextMidPoints = centerRectTwoInRectOne(
      this.headerRect.getClientRect(),
      this.headerText.getClientRect()
    );

    this.headerText.x(headerTextMidPoints.x);
    this.headerText.y(headerTextMidPoints.y);

    this.gridLine = new Line({
      ...this.spreadsheet.styles[this.type].gridLine,
      [this.functions.axis]:
        this.headerGroup[this.functions.axis]() +
        this.headerGroup[this.functions.size]() -
        this.sheet.getViewportVector()[this.functions.axis],
      points: this.getLinePoints(this.getSheetSize()),
    });

    this.headerGroup.add(
      this.headerRect,
      this.headerText,
      this.resizer.resizeLine
    );

    this.draw();
  }

  getIsLastFrozen() {
    return (
      this.index ===
      this.spreadsheet.data.getSheetData().frozenCells?.[this.type]
    );
  }

  getIsFrozen() {
    const data = this.spreadsheet.data.getSheetData();
    const frozenCell = data.frozenCells?.[this.type];

    return isNil(frozenCell) ? false : this.index <= frozenCell;
  }

  getLinePoints = (size: number) => {
    return this.isCol ? [0, 0, 0, size] : [0, 0, size, 0];
  };

  getAxis() {
    const data = this.spreadsheet.data.getSheetData();
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;

    let totalPreviousCustomSizeDifferences =
      this.rowCols.scrollBar.totalPreviousCustomSizeDifferences;

    for (
      let i = this.rowCols.scrollBar.sheetViewportPosition.x;
      i < this.index;
      i++
    ) {
      const size = data[this.type]?.sizes?.[i];

      if (size) {
        totalPreviousCustomSizeDifferences += size - defaultSize;
      }
    }

    const axis =
      this.spreadsheet.options[this.type].defaultSize * this.index +
      totalPreviousCustomSizeDifferences +
      this.sheet.getViewportVector()[this.functions.axis];

    return axis;
  }

  destroy() {
    this.headerGroup.destroy();
    this.gridLine.destroy();
    this.xFrozenLine?.destroy();
    this.yFrozenLine?.destroy();
    this.xyFrozenLine?.destroy();
  }

  draw() {
    this.drawHeader();
    this.drawGridLine();
    this.drawFrozenGridLine();
  }

  insert(amount: number) {
    const { cellsData, ...data } = this.spreadsheet.data.getSheetData();
    const modifyCallback = (value: number, amount: number) => {
      return value + amount;
    };

    this.moveData(
      amount,
      'addColumns',
      'addRows',
      modifyCallback,
      (sizeIndex) => {
        const sizes = data[this.type]?.sizes!;
        const size = sizes[sizeIndex];

        if (sizeIndex >= this.index) {
          const newIndex = modifyCallback(sizeIndex, amount);

          sizes[newIndex] = size;

          delete sizes[sizeIndex];
        }
      },
      (simpleCellAddress, newSimpleCellAddress) => {
        if (simpleCellAddress[this.type] >= this.index) {
          this.spreadsheet.data.setCellData(
            newSimpleCellAddress,
            cellsData![simpleCellAddress.addressToCellId()]
          );
          this.spreadsheet.data.deleteCellData(simpleCellAddress);
        }
      },
      (a, b) => {
        return b.localeCompare(a);
      }
    );
  }

  delete(amount: number) {
    const { cellsData, ...data } = this.spreadsheet.data.getSheetData();
    const modifyCallback = (value: number, amount: number) => {
      return value - amount;
    };

    this.moveData(
      amount,
      'removeColumns',
      'removeRows',
      modifyCallback,
      (sizeIndex) => {
        const sizes = data[this.type]?.sizes!;
        const size = sizes[sizeIndex];

        if (sizeIndex < this.index) return;

        if (sizeIndex > this.index) {
          const newIndex = modifyCallback(sizeIndex, amount);

          sizes[newIndex] = size;
        }

        delete sizes[sizeIndex];
      },
      (simpleCellAddress, newSimpleCellAddress) => {
        if (simpleCellAddress[this.type] < this.index) return;

        if (simpleCellAddress[this.type] > this.index) {
          this.spreadsheet.data.setCellData(
            newSimpleCellAddress,
            cellsData![simpleCellAddress.addressToCellId()]
          );
        }

        this.spreadsheet.data.deleteCellData(simpleCellAddress);
      }
    );
  }

  private moveData(
    amount: number,
    hyperformulaColumnFunctionName: 'addColumns' | 'removeColumns',
    hyperformulaRowFunctionName: 'addRows' | 'removeRows',
    modifyCallback: (value: number, amount: number) => number,
    sizesCallback: (sizeIndex: number) => void,
    cellsDataCallback: (
      simpleCellAddress: SimpleCellAddress,
      newSimpleCellAddress: SimpleCellAddress
    ) => void,
    comparer?: (a: string, b: string) => number
  ) {
    const data = this.spreadsheet.data.getSheetData();
    const { frozenCells, mergedCells, cellsData } = data;
    const sizes = data[this.type]?.sizes!;

    if (this.getIsFrozen()) {
      frozenCells![this.type] = modifyCallback(
        frozenCells![this.type]!,
        amount
      );
    }

    if (data[this.type]?.sizes) {
      Object.keys(sizes)
        .sort(comparer)
        .forEach((key) => {
          const sizeIndex = parseInt(key, 10);

          sizesCallback(sizeIndex);
        });
    }

    if (mergedCells) {
      Object.keys(mergedCells)
        .sort(comparer)
        .forEach((topLeftCellId) => {
          const mergedCell = mergedCells[topLeftCellId];

          if (mergedCell[this.type].x > this.index) {
            mergedCell[this.type].x = modifyCallback(
              mergedCell[this.type].x,
              amount
            );
          }

          if (mergedCell[this.type].y >= this.index) {
            mergedCell[this.type].y = modifyCallback(
              mergedCell[this.type].y,
              amount
            );
          }
        });
    }

    if (cellsData) {
      Object.keys(cellsData)
        .sort(comparer)
        .forEach((cellId) => {
          const simpleCellAddress = SimpleCellAddress.cellIdToAddress(
            this.sheet.sheetId,
            cellId
          );
          const newSimpleCellAddress = new SimpleCellAddress(
            this.sheet.sheetId,
            this.isCol
              ? simpleCellAddress.row
              : modifyCallback(simpleCellAddress.row, amount),
            this.isCol
              ? modifyCallback(simpleCellAddress.col, amount)
              : simpleCellAddress.col
          );
          cellsDataCallback(simpleCellAddress, newSimpleCellAddress);
        });
    }

    if (this.isCol) {
      this.spreadsheet.hyperformula?.[hyperformulaColumnFunctionName](
        this.sheet.sheetId,
        [this.index, amount]
      );
    } else {
      this.spreadsheet.hyperformula?.[hyperformulaRowFunctionName](
        this.sheet.sheetId,
        [this.index, amount]
      );
    }
    const newSheetData = merge({}, this.spreadsheet.data.getSheetData(), {
      [this.type]: {
        sizes,
      },
      frozenCells,
      mergedCells,
      cellsData,
    });

    this.spreadsheet.data.setSheetData(newSheetData);

    this.sheet.updateViewport();
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

    for (const value of this.rowCols.getSizeForFrozenCell(this.oppositeType)) {
      size = value.size;
    }

    return size;
  }

  private drawXFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (!this.isCol && this.index > frozenCell) {
      this.xFrozenLine = this.gridLine.clone({
        points: this.getLinePoints(size),
      });
    }

    if (this.isCol && this.index < frozenCell) {
      this.xFrozenLine = this.gridLine.clone({
        y: size,
        points: this.getLinePoints(this.sheet.sheetDimensions.height),
      });
    }
  }

  private drawYFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (!this.isCol && this.index < frozenCell) {
      this.yFrozenLine = this.gridLine.clone({
        x: size,
        points: this.getLinePoints(this.sheet.sheetDimensions.width),
      });
    }

    if (this.isCol && this.index > frozenCell) {
      this.yFrozenLine = this.gridLine.clone({
        points: this.getLinePoints(size),
      });
    }
  }

  private drawXYFrozenGridLine(frozenCell: number) {
    const size = this.getSizeUpToFrozenRowCol();

    if (this.index < frozenCell) {
      this.xyFrozenLine = this.gridLine.clone({
        points: this.getLinePoints(size),
      });
    }
  }

  private drawFrozenGridLine() {
    const { frozenCells } = this.spreadsheet.data.getSheetData();
    const frozenRow = frozenCells?.row;
    const frozenCol = frozenCells?.col;
    const frozenCell = frozenCells?.[this.type];

    if (!isNil(frozenCell)) {
      this.drawXFrozenGridLine(frozenCell);
      this.drawYFrozenGridLine(frozenCell);
    }

    if (!isNil(!frozenRow) && !isNil(!frozenCol)) {
      this.drawXYFrozenGridLine(frozenCell!);
    }
  }

  private getSheetSize() {
    return (
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis]
    );
  }

  private drawGridLine() {
    this.sheet.scrollGroups.main.rowColGroup.add(this.gridLine);
  }

  private drawHeader() {
    const isFrozen = this.getIsFrozen();

    if (isFrozen) {
      this.sheet.scrollGroups.xySticky.headerGroup.add(this.headerGroup);
    } else {
      if (this.isCol) {
        this.sheet.scrollGroups.ySticky.headerGroup.add(this.headerGroup);
      } else {
        this.sheet.scrollGroups.xSticky.headerGroup.add(this.headerGroup);
      }
    }
  }
}

export default RowCol;
