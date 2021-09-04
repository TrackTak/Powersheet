import { Group } from 'konva/lib/Group';
import { Node } from 'konva/lib/Node';
import { ShapeConfig } from 'konva/lib/Shape';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Text } from 'konva/lib/shapes/Text';
import { Vector2d } from 'konva/lib/types';
import { isNil } from 'lodash';
import Sheet, {
  Cell,
  centerRectTwoInRectOne,
  getGridLineGroupFromScrollGroup,
  getHeaderGroupFromScrollGroup,
  hasOverlap,
  ICustomSizes,
  ISheetViewportPosition,
  iteratePreviousDownToCurrent,
  iteratePreviousUpToCurrent,
  iterateXToY,
  makeLineCrisp,
} from './Sheet';
import Resizer from './Resizer';
import ScrollBar from './scrollBars/ScrollBar';
import { iterateSelection } from './Selector';

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

class RowCol {
  resizer: Resizer;
  scrollBar: ScrollBar;
  headerGroupMap: Map<HeaderGroupId, Group>;
  rowColGroupMap: Map<RowColGroupId, Group>;
  totalSize: number;
  shapes: IShapes;
  sheetViewportPosition: ISheetViewportPosition;
  getHeaderText: (index: number) => string;
  private previousSheetViewportPosition: ISheetViewportPosition;
  private getAvailableSize: () => number;
  private getLineConfig: (sheetSize: number) => LineConfig;
  private functions: IRowColFunctions;
  private oppositeFunctions: IRowColFunctions;
  private isCol: boolean;

  constructor(private type: RowColType, private sheet: Sheet) {
    this.type = type;
    this.isCol = this.type === 'col';
    this.sheet = sheet;
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
        ...this.sheet.styles.gridLine,
      }),
    };
    if (this.isCol) {
      this.functions = {
        axis: 'x',
        size: 'width',
      };
      this.oppositeFunctions = {
        axis: 'y',
        size: 'height',
      };
      this.shapes.headerText.setAttrs(this.sheet.styles.colHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.sheet.styles.colHeader.rect,
        width: this.sheet.options[this.type].defaultSize,
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
      this.getAvailableSize = () =>
        this.sheet.options.width -
        this.sheet.getViewportVector().x -
        this.sheet.row.scrollBar.getBoundingClientRect().width;
    } else {
      this.functions = {
        axis: 'y',
        size: 'height',
      };
      this.oppositeFunctions = {
        axis: 'x',
        size: 'width',
      };
      this.shapes.headerText.setAttrs(this.sheet.styles.rowHeader.text);
      this.shapes.headerRect.setAttrs({
        ...this.sheet.styles.rowHeader.rect,
        height: this.sheet.options[this.type].defaultSize,
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
      this.getAvailableSize = () =>
        this.sheet.options.height -
        (this.sheet.toolbar?.toolbarEl?.getBoundingClientRect().height ?? 0) -
        this.sheet.getViewportVector().y -
        this.sheet.col.scrollBar.getBoundingClientRect().height;
    }

    this.scrollBar = new ScrollBar(
      this.sheet,
      this.type,
      this.isCol,
      this.functions
    );

    this.resizer = new Resizer(sheet, this.type, this.isCol, this.functions);

    this.shapes.group.cache({
      ...this.sheet.getViewportVector(),
      ...this.sheet.sheetViewportDimensions,
    });
    this.shapes.headerRect.cache();
    this.shapes.gridLine.cache();

    window.addEventListener('DOMContentLoaded', this.onLoad);
  }

  calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number,
    customSizeChanges?: ICustomSizes[]
  ) => {
    let sumOfSizes = 0;
    let i = sheetViewportStartYIndex;
    const defaultSize = this.sheet.options[this.type].defaultSize;
    const sizes = this.sheet.options[this.type].sizes;

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

  onLoad = () => {
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
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onLoad);

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

  isNodeOutsideSheet = (node: Node) => {
    const isOverlapping = hasOverlap(node.getClientRect(), {
      ...this.sheet.getViewportVector(),
      ...this.sheet.sheetViewportDimensions,
    });

    return !isOverlapping;
  };

  destroyOutOfViewportItems() {
    this.headerGroupMap.forEach((headerGroup, index) => {
      if (this.isNodeOutsideSheet(headerGroup)) {
        headerGroup.destroy();

        this.headerGroupMap.delete(index);
      }
    });

    this.rowColGroupMap.forEach((group, index) => {
      if (this.isNodeOutsideSheet(group)) {
        group.destroy();

        this.rowColGroupMap.delete(index);
      }
    });
  }

  getTotalSize() {
    const sizes = Object.values(this.sheet.options[this.type].sizes);

    const totalSizeDifference = sizes.reduce((currentSize, size) => {
      return size - this.sheet.options[this.type].defaultSize + currentSize;
    }, 0);

    return (
      this.sheet.options[this.type].amount *
        this.sheet.options[this.type].defaultSize +
      totalSizeDifference
    );
  }

  getSize(index: number) {
    const size =
      this.sheet.options[this.type].sizes[index] ??
      this.sheet.options[this.type].defaultSize;

    return size;
  }

  drawViewport() {
    for (const index of iterateXToY(
      this.sheet[this.type].sheetViewportPosition
    )) {
      this.sheet[this.type].draw(index);
    }
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
    return isNil(this.sheet.options.frozenCells[this.type])
      ? false
      : index <= this.sheet.options.frozenCells[this.type]!;
  }

  getIsLastFrozen(index: number) {
    return index === this.sheet.options.frozenCells[this.type];
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
      [this.functions.axis]: headerGroup[this.functions.axis](),
    };

    const group = this.shapes.group.clone(groupConfig) as Group;

    const isFrozen = this.getIsLastFrozen(index);
    const line = isFrozen
      ? this.sheet.shapes.frozenGridLine
      : this.shapes.gridLine;

    const sheetSize =
      this.sheet.sheetDimensions[this.oppositeFunctions.size] +
      this.sheet.getViewportVector()[this.oppositeFunctions.axis];

    const lineConfig = this.getLineConfig(sheetSize);
    const gridLine = line.clone({
      ...lineConfig,
      [this.functions.axis]: size,
    }) as Line;

    makeLineCrisp(gridLine);

    group.add(gridLine);

    this.rowColGroupMap.set(index, group);

    if (isFrozen) {
      const xyStickyGridLineGroup = getGridLineGroupFromScrollGroup(
        this.sheet.scrollGroups.xySticky
      );

      xyStickyGridLineGroup.add(group);

      group.moveToBottom();
    } else {
      const mainGridLineGroup = getGridLineGroupFromScrollGroup(
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

    return clone;
  }
}

export default RowCol;
