import { Group } from 'konva/lib/Group';
import { ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import Sheet, {
  Cell,
  centerRectTwoInRectOne,
  getHeaderGroupFromScrollGroup,
  ICustomSizes,
  ISheetViewportPosition,
  getRowColGroupFromScrollGroup,
  iteratePreviousDownToCurrent,
  iteratePreviousUpToCurrent,
  iterateXToY,
  makeShapeCrisp,
  offsetShapeValue,
  CellId,
} from './Sheet';
import Resizer from './Resizer';
import ScrollBar from './scrollBars/ScrollBar';
import { iterateSelection } from './Selector';
import Spreadsheet from '../../Spreadsheet';

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
  totalSize: number;
  shapes: IShapes;
  sheetViewportPosition: ISheetViewportPosition;
  getHeaderText: (index: number) => string;
  getAvailableSize!: () => number;
  private previousSheetViewportPosition: ISheetViewportPosition;
  private getLineConfig: (sheetSize: number) => LineConfig;
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
    this.sheetViewportPosition = {
      x: 0,
      y: 0,
    };
    this.previousSheetViewportPosition = {
      x: 0,
      y: 0,
    };
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
      this.getLineConfig = (sheetHeight: number) => {
        const lineConfig: LineConfig = {
          points: [0, 0, 0, sheetHeight],
        };
        return lineConfig;
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
      this.getLineConfig = (sheetWidth: number) => {
        const lineConfig: LineConfig = {
          points: [0, 0, sheetWidth, 0],
        };
        return lineConfig;
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

    this.sheetViewportPosition.y = yIndex;
  }

  calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number,
    customSizeChanges?: ICustomSizes[]
  ) => {
    let sumOfSizes = 0;
    let i = sheetViewportStartYIndex;
    const defaultSize = this.spreadsheet.options[this.type].defaultSize;
    const sizes = this.sheet.getData()[this.type]?.sizes;

    const getSize = () => {
      // TODO: Remove when we have snapping to row/col for scroll
      let offset = 0;

      if (customSizeChanges?.[i]?.size) {
        offset = customSizeChanges[i].size;
      }

      return (sizes?.[i] ?? defaultSize) - offset;
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

  *drawNextItems() {
    const generator = {
      x: iteratePreviousDownToCurrent(
        this.previousSheetViewportPosition.x,
        this.sheetViewportPosition.x
      ),
      y: iteratePreviousUpToCurrent(
        this.previousSheetViewportPosition.y,
        this.sheetViewportPosition.y
      ),
    };

    let index = -Infinity;

    do {
      const generatorX = generator.x.next();
      const generatorY = generator.y.next();

      index = Math.max(
        generatorX.value ?? -Infinity,
        generatorY.value ?? -Infinity
      );

      if (isFinite(index)) {
        const params: [number, boolean?] = !generatorX.done
          ? [index - 1, true]
          : [index];

        this.draw(...params);
      }

      yield index;
    } while (isFinite(index));

    this.destroyOutOfViewportItems();

    this.sheet.shapes.topLeftRect.moveToTop();

    this.previousSheetViewportPosition = { ...this.sheetViewportPosition };
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

  destroyOutOfViewportItems() {
    // this.headerGroupMap.forEach((headerGroup) => {
    //   if (
    //     !headerGroup.isClientRectOnScreen({
    //       x: -this.sheet.getViewportVector().x,
    //       y: -this.sheet.getViewportVector().y,
    //     })
    //   ) {
    //     headerGroup.destroy();
    //     this.headerGroupMap.delete(headerGroup.attrs.index);
    //   }
    // });
    // this.rowColGroupMap.forEach((group) => {
    //   if (
    //     !group.isClientRectOnScreen({
    //       x: -this.sheet.getViewportVector().x,
    //       y: -this.sheet.getViewportVector().y,
    //     })
    //   ) {
    //     group.destroy();
    //     this.rowColGroupMap.delete(group.attrs.index);
    //   }
    // });
  }

  getTotalSize() {
    const sizes = Object.values(this.sheet.getData()[this.type]?.sizes ?? {});

    const totalSizeDifference = sizes.reduce((currentSize, size) => {
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

  getSize(index: number) {
    const size =
      this.sheet.getData()[this.type]?.sizes[index] ??
      this.spreadsheet.options[this.type].defaultSize;

    return size;
  }

  updateViewport() {
    for (const index of iterateXToY(
      this.sheet[this.type].sheetViewportPosition
    )) {
      this.sheet[this.type].draw(index);
    }
    this.scrollBar.updateCustomSizePositions();
  }

  getIndexesBetweenVectors(position: Vector2d) {
    const customSizes: ICustomSizes[] = [];

    customSizes[this.scrollBar.scrollOffset.index] = {
      size: this.scrollBar.scrollOffset.size,
    };

    const params: [number, ICustomSizes[]] = [
      this.sheetViewportPosition.x,
      customSizes,
    ];

    const indexes = {
      x: this.calculateSheetViewportEndPosition(position.x, ...params),
      y: this.calculateSheetViewportEndPosition(position.y, ...params),
    };

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
    this.drawGridLines(index);
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
      const xyStickyHeaderGroup = getHeaderGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyHeaderGroup.add(headerGroup);
    } else {
      if (this.isCol) {
        const yStickyHeaderGroup = getHeaderGroupFromScrollGroup(
          this.sheet.scrollGroups.ySticky
        );

        yStickyHeaderGroup.add(headerGroup);
      } else {
        const xStickyHeaderGroup = getHeaderGroupFromScrollGroup(
          this.sheet.scrollGroups.xSticky
        );

        xStickyHeaderGroup.add(headerGroup);
      }
    }
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

  private drawGridLines(index: number) {
    if (this.rowColGroupMap.has(index)) {
      this.rowColGroupMap.get(index)!.destroy();
    }
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

    const isFrozen = this.getIsLastFrozen(index);
    const line = isFrozen
      ? this.sheet.shapes.frozenGridLine
      : this.shapes.gridLine;

    const sheetSize =
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis];

    const lineConfig: LineConfig = {
      ...this.getLineConfig(sheetSize),
      [this.functions.axis]: size,
    };
    const gridLine = line.clone(lineConfig) as Line;

    makeShapeCrisp(gridLine);

    group.add(gridLine);

    this.rowColGroupMap.set(index, group);

    if (isFrozen) {
      const xyStickyGridLineGroup = getRowColGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyGridLineGroup.add(group);

      group.moveToBottom();
    } else {
      const mainGridLineGroup = getRowColGroupFromScrollGroup(
        this.sheet.scrollGroups.main
      );

      mainGridLineGroup.add(group);
    }
  }

  private getResizeLine(index: number) {
    const size = this.getSize(index);
    const lineConfig: LineConfig = {
      [this.functions.axis]: size,
    };
    const clone = this.resizer.shapes.resizeLine.clone(lineConfig) as Line;

    clone[this.functions.axis](offsetShapeValue(clone[this.functions.axis]()));

    return clone;
  }
}

export default RowCol;
