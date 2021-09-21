import { Group } from 'konva/lib/Group';
import { ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import Sheet, {
  centerRectTwoInRectOne,
  getHeaderGroupFromScrollGroup,
  getRowColGroupFromScrollGroup,
  IFrozenCells,
  iterateXToY,
} from './Sheet';
import Resizer from './Resizer';
import ScrollBar from './scrollBars/ScrollBar';
import { iterateSelection } from './Selector';
import Spreadsheet from '../../Spreadsheet';
import { Cell, CellId, convertFromCellIdToRowCol } from './CellRenderer';

interface IShapes {
  group: Group;
  headerGroup: Group;
  headerRect: Rect;
  headerText: Text;
  gridLine: Line;
}

export type RowColType = 'row' | 'col';

export interface IRowColFunctions {
  axis: 'y' | 'x';
  size: 'height' | 'width';
}

export type HeaderGroupId = number;

export type RowColGroupId = number;

export const getGridLineFromRowColGroup = (group: Group) => {
  const gridLine = group.children?.find(
    (x) => x.attrs.type === 'gridLine'
  ) as Line;

  return gridLine;
};

class RowCol {
  resizer: Resizer;
  scrollBar: ScrollBar;
  headerGroupMap: Map<HeaderGroupId, Group>;
  rowColGroupMap: Map<RowColGroupId, Group>;
  rowColCellMap: Map<number, CellId[]>;
  xFrozenRowColGroupsMap = new Map<RowColGroupId, Group>();
  yFrozenRowColGroupsMap = new Map<RowColGroupId, Group>();
  xyFrozenRowColGroupsMap = new Map<RowColGroupId, Group>();
  totalSize: number;
  shapes: IShapes;
  getHeaderText: (index: number) => string;
  getAvailableSize!: () => number;
  frozenLine?: Group;
  private getLinePoints: (size: number) => number[];
  private functions: IRowColFunctions;
  private oppositeType: RowColType;
  private oppositeFunctions: IRowColFunctions;
  private isCol: boolean;
  private spreadsheet: Spreadsheet;

  constructor(private type: RowColType, private sheet: Sheet) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.sheet = sheet;
    this.spreadsheet = this.sheet.sheetsGroup.spreadsheet;
    this.headerGroupMap = new Map();
    this.rowColGroupMap = new Map();
    this.rowColCellMap = new Map();

    this.totalSize = 0;
    this.shapes = {
      headerRect: new Rect(),
      headerGroup: new Group(),
      headerText: new Text(),
      group: new Group(),
      gridLine: new Line({
        ...this.spreadsheet.styles.gridLine,
        type: 'gridLine',
      }),
    };
    if (this.isCol) {
      this.oppositeType = 'row';
      this.functions = {
        axis: 'x',
        size: 'width',
      };
      this.oppositeFunctions = {
        axis: 'y',
        size: 'height',
      };
      this.shapes.headerText.setAttrs(this.spreadsheet.styles.colHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.spreadsheet.styles.colHeader.rect,
        width: this.spreadsheet.options[this.type].defaultSize,
      });
      this.getHeaderText = (index) => {
        const startCharCode = 'A'.charCodeAt(0);
        const letter = String.fromCharCode(startCharCode + index);
        return letter;
      };
      this.getLinePoints = (height: number) => {
        return [0, 0, 0, height];
      };
      this.getAvailableSize = () => {
        return (
          this.spreadsheet.options.width -
          this.sheet.getViewportVector().x -
          this.sheet.row.scrollBar.scrollEl.getBoundingClientRect().width
        );
      };
    } else {
      this.oppositeType = 'col';
      this.functions = {
        axis: 'y',
        size: 'height',
      };
      this.oppositeFunctions = {
        axis: 'x',
        size: 'width',
      };
      this.shapes.headerText.setAttrs(this.spreadsheet.styles.rowHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.spreadsheet.styles.rowHeader.rect,
        height: this.spreadsheet.options[this.type].defaultSize,
      });
      this.getHeaderText = (index) => {
        return (index + 1).toString();
      };
      this.getLinePoints = (width: number) => {
        return [0, 0, width, 0];
      };
      this.getAvailableSize = () => {
        const bottomBarHeight =
          this.sheet.sheetsGroup.bottomBar?.bottomBar.getBoundingClientRect()
            .height ?? 0;

        const toolbarHeight =
          this.spreadsheet.toolbar?.toolbarEl.getBoundingClientRect().height ??
          0;

        const formulaBarHeight =
          this.spreadsheet.formulaBar?.formulaBarEl.getBoundingClientRect()
            .height ?? 0;

        return (
          this.spreadsheet.options.height -
          bottomBarHeight -
          toolbarHeight -
          formulaBarHeight -
          this.sheet.getViewportVector().y -
          this.sheet.col.scrollBar.scrollEl.getBoundingClientRect().height
        );
      };
    }

    this.scrollBar = new ScrollBar(
      this.sheet,
      this.type,
      this.isCol,
      this.functions
    );

    this.resizer = new Resizer(sheet, this.type, this.isCol, this.functions);

    this.shapes.headerRect.cache();
    this.shapes.gridLine.cache();
  }

  drawAll() {
    for (
      let index = 0;
      index < this.spreadsheet.options[this.type].amount;
      index++
    ) {
      this.draw(index);
    }
  }

  setup() {
    const yIndex = this.calculateSheetViewportEndPosition(
      this.getAvailableSize(),
      0
    );

    let sumOfSizes = 0;

    for (let index = 0; index < yIndex; index++) {
      sumOfSizes += this.getSize(index);
    }

    this.totalSize = sumOfSizes;
  }

  calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number
  ) => {
    let sumOfSizes = 0;
    let i = sheetViewportStartYIndex;

    const getSize = () => {
      return this.getSize(i);
    };

    while (sumOfSizes + getSize() < sheetViewportDimensionSize) {
      sumOfSizes += getSize();
      i += 1;
    }

    return i;
  };

  destroy() {
    this.scrollBar.destroy();
  }

  convertFromCellsToRange(cells: Cell[]) {
    const getMin = () => Math.min(...cells.map((o) => o.attrs[this.type].x));
    const getMax = () => Math.max(...cells.map((o) => o.attrs[this.type].y));

    const vector = {
      x: getMin(),
      y: getMax(),
    };

    return vector;
  }

  convertFromRangeToGroups(vector: Vector2d) {
    const groups: Group[] = [];

    for (const index of iterateSelection(vector)) {
      const group = this.sheet[this.type].rowColGroupMap.get(index);

      if (group) {
        groups.push(group);
      }
    }

    return groups;
  }

  getTotalSize() {
    const sizes = Object.keys(this.sheet.getData()[this.type]?.sizes ?? {});

    const totalSizeDifference = sizes.reduce((currentSize, key) => {
      const index = parseInt(key, 10);
      const size = this.getSize(index);

      return (
        size - this.spreadsheet.options[this.type].defaultSize + currentSize
      );
    }, 0);

    return (
      this.spreadsheet.options[this.type].amount *
        this.spreadsheet.options[this.type].defaultSize +
      totalSizeDifference
    );
  }

  setSizeData(index: number, size: number) {
    this.sheet.setData({
      [this.type]: {
        sizes: {
          [index]: size,
        },
      },
    });
  }

  getSize(index: number) {
    let size =
      this.sheet.getData()[this.type]?.sizes[index] ??
      this.spreadsheet.options[this.type].defaultSize;

    for (const [cellId, cell] of this.sheet.cellRenderer.cellsMap) {
      if (this.sheet.merger.getIsCellMerged(cellId)) {
        continue;
      }

      const itemIndex = convertFromCellIdToRowCol(cellId)[this.type];

      if (index === itemIndex) {
        const cellSize = cell.getClientRect({
          skipStroke: true,
        })[this.functions.size];

        if (cellSize > size) {
          size = cellSize;

          this.sheet.setData({
            [this.type]: {
              sizes: {
                [index]: size,
              },
            },
          });
        }
      }
    }

    return size;
  }

  updateViewport() {
    for (const index of iterateXToY(
      this.sheet[this.type].scrollBar.sheetViewportPosition
    )) {
      this.sheet[this.type].draw(index);
    }
    this.scrollBar.updateCustomSizePositions();
  }

  *getSizeForFrozenCell(type: RowColType) {
    const { frozenCells } = this.sheet.getData();

    if (!frozenCells) return null;

    let size = 0;

    for (let index = 0; index <= frozenCells[type]; index++) {
      size += this.getSize(index);

      yield { size, index };
    }

    return size;
  }

  getIndexesBetweenVectors(position: Vector2d) {
    let sheetViewportStartYIndex = this.scrollBar.sheetViewportPosition.x;

    const indexes = {
      x: this.calculateSheetViewportEndPosition(
        position.x,
        sheetViewportStartYIndex
      ),
      y: this.calculateSheetViewportEndPosition(
        position.y,
        sheetViewportStartYIndex
      ),
    };

    let xIndex = null;
    let yIndex = null;

    for (const { size, index } of this.getSizeForFrozenCell(this.type)) {
      if (xIndex === null && position.x <= size) {
        xIndex = index;
      }

      if (yIndex === null && position.y <= size) {
        yIndex = index;
      }
    }

    if (xIndex !== null) {
      indexes.x = xIndex;
    }

    if (yIndex !== null) {
      indexes.y = yIndex;
    }

    return indexes;
  }

  getItemsBetweenIndexes(indexes: Vector2d) {
    let groups: Group[] = [];

    for (let index = indexes.x; index <= indexes.y; index++) {
      const existingRowColGroup = this.rowColGroupMap.get(index)!;

      groups.push(existingRowColGroup);
    }

    const comparer = (a: Group, b: Group) => a.attrs.index - b.attrs.index;

    return groups.sort(comparer);
  }

  getIsFrozen(index: number) {
    const data = this.sheet.getData();

    return data.frozenCells ? index <= data.frozenCells[this.type] : false;
  }

  getIsLastFrozen(index: number) {
    return index === this.sheet.getData().frozenCells?.[this.type];
  }

  draw(index: number, drawingAtX = false) {
    this.drawHeader(index, drawingAtX);
    this.drawGridLine(index);
    this.drawFrozenGridLine(index);
  }

  private drawHeader(index: number, drawingAtX = false) {
    const prevIndex = drawingAtX ? index + 1 : index - 1;

    if (this.headerGroupMap.has(index)) {
      this.headerGroupMap.get(index)!.destroy();
    }

    const size = this.getSize(index);
    const prevHeader = this.headerGroupMap.get(prevIndex);

    const axis = prevHeader
      ? drawingAtX
        ? prevHeader[this.functions.axis]() - size
        : prevHeader[this.functions.axis]() + prevHeader[this.functions.size]()
      : this.sheet.getViewportVector()[this.functions.axis];

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: size,
      [this.functions.axis]: axis,
    };
    const headerGroup = this.shapes.headerGroup.clone(groupConfig) as Group;
    const header = this.getHeader(index);
    const resizeLine = this.getResizeLine(index);
    const isFrozen = this.getIsFrozen(index);

    headerGroup.add(header.rect, header.text, resizeLine);
    headerGroup.setAttr('isFrozen', isFrozen);

    this.headerGroupMap.set(index, headerGroup);

    if (isFrozen) {
      const xyStickyGroup = getHeaderGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyGroup.add(headerGroup);
    } else {
      if (this.isCol) {
        const yStickyGroup = getHeaderGroupFromScrollGroup(
          this.sheet.scrollGroups.ySticky
        );

        yStickyGroup.add(headerGroup);
      } else {
        const xStickyGroup = getHeaderGroupFromScrollGroup(
          this.sheet.scrollGroups.xSticky
        );

        xStickyGroup.add(headerGroup);
      }
    }

    this.sheet.hideGroupIfOutOfScreen(headerGroup);
  }

  private getHeader(index: number) {
    const size = this.getSize(index);
    const rectConfig: RectConfig = {
      [this.functions.size]: size,
    };
    const rect = this.shapes.headerRect.clone(rectConfig) as Rect;
    const text = new Text({
      text: this.getHeaderText(index),
    });
    const midPoints = centerRectTwoInRectOne(
      rect.getClientRect(),
      text.getClientRect()
    );

    text.x(midPoints.x);
    text.y(midPoints.y);

    return {
      rect,
      text,
    };
  }

  private getGridLine(
    index: number,
    lineConfig: LineConfig,
    line = this.shapes.gridLine
  ) {
    const headerGroup = this.headerGroupMap.get(index)!;

    const size = headerGroup![this.functions.size]();

    const groupConfig: ShapeConfig = {
      index,
      [this.functions.size]: size,
      [this.functions.axis]:
        headerGroup[this.functions.axis]() -
        this.sheet.getViewportVector()[this.functions.axis],
    };

    const group = this.shapes.group.clone(groupConfig) as Group;

    const mergedLineConfig: LineConfig = {
      [this.functions.axis]: size,
      ...lineConfig,
    };
    const gridLine = line.clone(mergedLineConfig) as Line;

    group.add(gridLine);

    return group;
  }

  private getFrozenGridLine(
    index: number,
    scrollGroup: Group,
    map: Map<number, Group>,
    getGroup: (size: number) => Group
  ) {
    if (this.xFrozenRowColGroupsMap.has(index)) {
      this.xFrozenRowColGroupsMap.get(index)!.destroy();
    }

    let size = 0;

    for (const value of this.sheet[this.oppositeType].getSizeForFrozenCell(
      this.oppositeType
    )) {
      size = value.size;
    }

    const stickyGroup = getRowColGroupFromScrollGroup(scrollGroup);
    const group = getGroup(size);

    stickyGroup.add(group);

    map.set(index, group);
  }

  private drawXRowFrozenGridLine(index: number, frozenCells: IFrozenCells) {
    if (!this.isCol && index > frozenCells[this.type]) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xSticky,
        this.xFrozenRowColGroupsMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawXColFrozenGridLine(index: number, frozenCells: IFrozenCells) {
    if (this.isCol && index < frozenCells[this.type]) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xSticky,
        this.xFrozenRowColGroupsMap,
        (size) =>
          this.getGridLine(index, {
            y: size,
            points: this.getLinePoints(this.sheet.stage.height()),
          })
      );
    }
  }

  private drawYRowFrozenGridLine(index: number, frozenCells: IFrozenCells) {
    if (!this.isCol && index < frozenCells[this.type]) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.ySticky,
        this.yFrozenRowColGroupsMap,
        (size) =>
          this.getGridLine(index, {
            x: size,
            points: this.getLinePoints(this.sheet.stage.width()),
          })
      );
    }
  }

  private drawYColFrozenGridLine(index: number, frozenCells: IFrozenCells) {
    if (this.isCol && index > frozenCells[this.type]) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.ySticky,
        this.yFrozenRowColGroupsMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawXYFrozenGridLine(index: number, frozenCells: IFrozenCells) {
    if (index < frozenCells[this.type]) {
      this.getFrozenGridLine(
        index,
        this.sheet.scrollGroups.xySticky,
        this.xyFrozenRowColGroupsMap,
        (size) =>
          this.getGridLine(index, {
            points: this.getLinePoints(size),
          })
      );
    }
  }

  private drawFrozenGridLine(index: number) {
    const { frozenCells } = this.sheet.getData();

    if (frozenCells) {
      this.drawXYFrozenGridLine(index, frozenCells);
      this.drawXRowFrozenGridLine(index, frozenCells);
      this.drawXColFrozenGridLine(index, frozenCells);
      this.drawYRowFrozenGridLine(index, frozenCells);
      this.drawYColFrozenGridLine(index, frozenCells);
    } else {
      const frozenRowColGroupMaps = [
        this.xFrozenRowColGroupsMap,
        this.yFrozenRowColGroupsMap,
        this.xyFrozenRowColGroupsMap,
      ];

      frozenRowColGroupMaps.forEach((frozenRowColGroupMap) => {
        frozenRowColGroupMap.forEach((group) => {
          group.destroy();
        });
        frozenRowColGroupMap.clear();
      });
    }
  }

  private drawGridLine(index: number) {
    if (this.rowColGroupMap.has(index)) {
      this.rowColGroupMap.get(index)!.destroy();
    }

    const isLastFrozen = this.getIsLastFrozen(index);

    const sheetSize =
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis];

    const group = this.getGridLine(
      index,
      {
        points: this.getLinePoints(sheetSize),
      },
      isLastFrozen ? this.sheet.shapes.frozenLine : undefined
    );

    this.rowColGroupMap.set(index, group);

    if (isLastFrozen) {
      this.frozenLine = group;

      const xyStickyGridLineGroup = getRowColGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyGridLineGroup.add(group);
    } else {
      const mainGridLineGroup = getRowColGroupFromScrollGroup(
        this.sheet.scrollGroups.main
      );

      mainGridLineGroup.add(group);
    }

    this.sheet.hideGroupIfOutOfScreen(group);
  }

  private getResizeLine(index: number) {
    const size = this.getSize(index);
    const lineConfig: LineConfig = {
      [this.functions.axis]: size,
    };
    const clone = this.resizer.shapes.resizeLine.clone(lineConfig) as Line;

    return clone;
  }
}

export default RowCol;
