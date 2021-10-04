import { Layer } from 'konva/lib/Layer';
import { Rect, RectConfig } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Vector2d } from 'konva/lib/types';
import Selector from './Selector';
import Merger from './Merger';
import RowCols, { RowColType } from './RowCol';
import CellEditor from './cellEditor/CellEditor';
import RightClickMenu from './rightClickMenu/RightClickMenu';
import { Stage } from 'konva/lib/Stage';
import Spreadsheet from '../Spreadsheet';
import { prefix, reverseVectorsIfStartBiggerThanEnd } from '../utils';
import styles from './Sheet.module.scss';
import { KonvaEventObject } from 'konva/lib/Node';
import Comment from './comment/Comment';
import CellRenderer from './CellRenderer';
import { DebouncedFunc, throttle } from 'lodash';
import { Shape } from 'konva/lib/Shape';
import events from '../events';
import SimpleCellAddress from './cell/SimpleCellAddress';
import RangeSimpleCellAddress from './cell/RangeSimpleCellAddress';
import RowCol from './RowCol';
import Cell from './cell/Cell';

export interface IDimensions {
  width: number;
  height: number;
}

export type SheetId = number;

interface IScrollGroup {
  group: Group;
  sheetGroup: Group;
  cellGroup: Group;
  rowColGroup: Group;
  headerGroup: Group;
  frozenBackground: Rect;
}

export const scrollGroups = ['main', 'xSticky', 'ySticky', 'xySticky'];

export interface IScrollGroups {
  main: IScrollGroup;
  xSticky: IScrollGroup;
  ySticky: IScrollGroup;
  xySticky: IScrollGroup;
}

export interface ICustomSizes {
  size: number;
}

class Sheet {
  scrollGroups!: IScrollGroups;
  sheetEl: HTMLDivElement;
  stage: Stage;
  layer: Layer;
  sheet: Rect;
  col: RowCol;
  row: RowCol;
  selector: Selector;
  merger: Merger;
  cellRenderer: CellRenderer;
  sheetDimensions: IDimensions;
  previousSheetClickTime = 0;
  sheetClickTime = 0;
  cellEditor: CellEditor;
  rightClickMenu: RightClickMenu;
  comment: Comment;
  private throttledResize: DebouncedFunc<(e: Event) => void>;
  private throttledSheetMove: DebouncedFunc<
    (e: KonvaEventObject<MouseEvent>) => void
  >;

  constructor(public spreadsheet: Spreadsheet, public sheetId: SheetId) {
    this.spreadsheet = spreadsheet;
    this.sheetId = sheetId;

    this.sheetDimensions = {
      width: 0,
      height: 0,
    };

    this.sheetEl = document.createElement('div');
    this.sheetEl.classList.add(`${prefix}-sheet`, styles.sheet);

    this.spreadsheet.sheetsEl.appendChild(this.sheetEl);

    this.throttledResize = throttle(this.onResize, 50);
    this.throttledSheetMove = throttle(this.onSheetMouseMove, 35);

    this.sheet = new Rect({
      type: 'sheet',
      listening: true,
      opacity: 0,
    });

    this.stage = new Stage({
      container: this.sheetEl,
    });

    this.layer = new Layer();

    this.layer.add(this.sheet);

    this.stage.add(this.layer);

    this.cellRenderer = new CellRenderer(this);
    this.col = new RowCols('col', this);
    this.row = new RowCols('row', this);

    this.row.updateViewportSize();
    this.col.updateViewportSize();

    this.merger = new Merger(this);
    this.selector = new Selector(this);
    this.rightClickMenu = new RightClickMenu(this);
    this.comment = new Comment(this);

    this.stage.on('contextmenu', this.onContextMenu);
    this.stage.on('mousedown', this.stageOnMousedown);
    this.stage.on('click', this.stageOnClick);
    this.stage.on('wheel', this.onWheel);
    this.sheet.on('click', this.sheetOnClick);
    this.sheet.on('mousedown', this.onSheetMouseDown);
    this.sheet.on('mousemove', this.throttledSheetMove);
    this.sheet.on('mouseup', this.onSheetMouseUp);

    this.sheet.on('touchstart', this.sheetOnTouchStart);
    this.sheet.on('touchmove', this.sheetOnTouchMove);
    this.sheet.on('tap', this.sheetOnTap);

    this.sheetEl.tabIndex = 1;
    this.sheetEl.addEventListener('keydown', this.keyHandler);

    window.addEventListener('resize', this.throttledResize);

    this.updateSheetDimensions();

    const sheetConfig: RectConfig = {
      width: this.col.totalSize,
      height: this.row.totalSize,
      x: this.getViewportVector().x,
      y: this.getViewportVector().y,
    };

    this.sheet.setAttrs(sheetConfig);

    this.col.scrollBar.setYIndex();
    this.row.scrollBar.setYIndex();

    this.updateViewport();

    // TODO: use scrollBar size instead of hardcoded value
    this.row.scrollBar.scrollBarEl.style.bottom = `${18}px`;

    this.cellEditor = new CellEditor(this);

    // once is StoryBook ug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded, {
      once: true,
    });
  }

  onDOMContentLoaded = () => {
    this.updateSize();
  };

  private updateSize() {
    this.stage.width(this.sheetEl.offsetWidth);
    this.stage.height(this.sheetEl.offsetHeight);

    this.sheet.width(this.stage.width() - this.getViewportVector().x);
    this.sheet.height(this.stage.height() - this.getViewportVector().y);

    this.row.updateViewportSize();
    this.col.updateViewportSize();

    this.col.resizer.setResizeGuideLinePoints();
    this.row.resizer.setResizeGuideLinePoints();

    const context = this.layer.canvas.getContext();

    // We reset the translate each time and then
    // translate 0.5 for crisp lines.
    context.reset();
    context.translate(0.5, 0.5);

    this.updateViewport();
  }

  onResize = () => {
    this.updateSize();
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    this.col.scrollBar.scrollBarEl.scrollBy(e.evt.deltaX, 0);
    this.row.scrollBar.scrollBarEl.scrollBy(0, e.evt.deltaY);

    this.spreadsheet.eventEmitter.emit(events.scrollWheel.scroll, e);
  };

  sheetOnTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) return;

    const { clientX, clientY } = touch1;

    this.cellEditor.hideAndSave();

    this.col.scrollBar.previousTouchMovePosition = clientX;
    this.row.scrollBar.previousTouchMovePosition = clientY;
  };

  sheetOnTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) return;

    const { clientX, clientY } = touch1;

    const deltaX =
      (this.col.scrollBar.previousTouchMovePosition - clientX) *
      this.spreadsheet.options.touchScrollSpeed;

    const deltaY =
      (this.row.scrollBar.previousTouchMovePosition - clientY) *
      this.spreadsheet.options.touchScrollSpeed;

    this.col.scrollBar.scrollBarEl.scrollBy(deltaX, 0);
    this.row.scrollBar.scrollBarEl.scrollBy(0, deltaY);

    this.col.scrollBar.previousTouchMovePosition = clientX;
    this.row.scrollBar.previousTouchMovePosition = clientY;
  };

  onContextMenu = (e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
  };

  onSheetMouseDown = () => {
    const vector = this.sheet.getRelativePointerPosition();

    this.selector.startSelection(vector);
  };

  onSheetMouseMove = () => {
    this.selector.moveSelection();
  };

  onSheetMouseUp = () => {
    this.selector.endSelection();
  };

  stageOnClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      this.rightClickMenu.hide();
    }

    if (e.evt.button === 2) {
      if (this.rightClickMenu.dropdown.state.isShown) {
        this.rightClickMenu.hide();
      } else {
        this.rightClickMenu.show();
      }
    }
  };

  stageOnMousedown = () => {
    this.cellEditor.hideAndSave();
  };

  private setCellOnAction() {
    const selectedFirstcell = this.selector.selectedCell!;
    const simpleCellAddress = selectedFirstcell.simpleCellAddress;

    if (this.hasDoubleClickedOnCell()) {
      this.cellEditor.show(selectedFirstcell);
    }

    if (this.spreadsheet.data.getCellData(simpleCellAddress)?.comment) {
      this.comment.show(simpleCellAddress);
    }
  }

  sheetOnTap = () => {
    const vector = this.sheet.getRelativePointerPosition();

    this.selector.startSelection(vector);
    this.selector.endSelection();

    this.setCellOnAction();
  };

  sheetOnClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      this.setCellOnAction();
    }
  };

  hasDoubleClickedOnCell() {
    this.previousSheetClickTime = this.sheetClickTime;

    this.sheetClickTime = new Date().getTime();
    const delayTimeMilliseconds = 300;

    return (
      !this.selector.hasChangedCellSelection() &&
      this.sheetClickTime <= this.previousSheetClickTime + delayTimeMilliseconds
    );
  }

  getMinMaxRangeSimpleCellAddress(cells: Cell[]) {
    const getMin = (type: RowColType) =>
      Math.min(
        ...cells.map(
          (cell) => cell.rangeSimpleCellAddress.topLeftSimpleCellAddress[type]
        )
      );
    const getMax = (type: RowColType) =>
      Math.max(
        ...cells.map(
          (cell) =>
            cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress[type]
        )
      );

    return new RangeSimpleCellAddress(
      new SimpleCellAddress(this.sheetId, getMin('row'), getMin('col')),
      new SimpleCellAddress(this.sheetId, getMax('row'), getMax('col'))
    );
  }

  keyHandler = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        break;
      }
      case 'Delete': {
        this.selector.selectedCells.forEach((cell) => {
          const simpleCellAddress = cell.simpleCellAddress;
          const cellData = this.spreadsheet.data.getCellData(simpleCellAddress);

          delete cellData?.value;
        });
        break;
      }
      case e.ctrlKey && 'z': {
        this.spreadsheet.undo();
        break;
      }
      case e.ctrlKey && 'y': {
        this.spreadsheet.redo();
        break;
      }
      case e.ctrlKey && 'x': {
        this.spreadsheet.clipboard.cut();
        break;
      }
      case e.ctrlKey && 'c': {
        this.spreadsheet.clipboard.copy();
        break;
      }
      default:
        if (this.cellEditor.getIsHidden() && !e.ctrlKey) {
          this.cellEditor.show(this.selector.selectedCell!);
        }
    }

    this.updateViewport();
  };

  isShapeOutsideOfViewport(shape: Group | Shape, margin?: Partial<Vector2d>) {
    return !shape.isClientRectOnScreen({
      x: -(this.getViewportVector().x + (margin?.x ?? 0)),
      y: -(this.getViewportVector().y + (margin?.y ?? 0)),
    });
  }

  updateSheetDimensions() {
    this.sheetDimensions.width = this.col.getTotalSize();
    this.sheetDimensions.height = this.row.getTotalSize();
  }

  getViewportVector() {
    return {
      x: this.spreadsheet.styles.rowHeader.rect.width,
      y: this.spreadsheet.styles.colHeader.rect.height,
    };
  }

  convertVectorsToRangeSimpleCellAddress(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      end
    );

    const rowIndexes = this.row.getTopBottomIndexFromPosition({
      x: newStart.y,
      y: newEnd.y,
    });

    const colIndexes = this.col.getTopBottomIndexFromPosition({
      x: newStart.x,
      y: newEnd.x,
    });

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(
        this.sheetId,
        rowIndexes.topIndex,
        colIndexes.topIndex
      ),
      new SimpleCellAddress(
        this.sheetId,
        rowIndexes.bottomIndex,
        colIndexes.bottomIndex
      )
    );

    for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
      for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(this.sheetId, ri, ci);
        const existingRangeSimpleCellAddress =
          this.merger.associatedMergedCellAddressMap.get(simpleCellAddress);

        if (existingRangeSimpleCellAddress) {
          rangeSimpleCellAddress.limitTopLeftAddressToAnotherRange(
            'col',
            existingRangeSimpleCellAddress
          );
          rangeSimpleCellAddress.limitTopLeftAddressToAnotherRange(
            'row',
            existingRangeSimpleCellAddress
          );
          rangeSimpleCellAddress.limitBottomRightAddressToAnotherRange(
            'col',
            existingRangeSimpleCellAddress
          );
          rangeSimpleCellAddress.limitBottomRightAddressToAnotherRange(
            'row',
            existingRangeSimpleCellAddress
          );
        }
      }
    }

    return rangeSimpleCellAddress;
  }

  hide() {
    this.stage.hide();
    this.sheetEl.style.display = 'none';
  }

  show() {
    this.stage.show();
    this.sheetEl.style.display = 'block';
  }

  getStickyGroupType(isOnFrozenRow: boolean, isOnFrozenCol: boolean) {
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

  destroy() {
    this.stage.off('contextmenu', this.onContextMenu);
    this.stage.off('mousedown', this.stageOnMousedown);
    this.stage.off('click', this.stageOnClick);
    this.stage.off('wheel', this.onWheel);
    this.sheet.off('click', this.sheetOnClick);
    this.sheet.off('mousedown', this.onSheetMouseDown);
    this.sheet.off('mousemove', this.throttledSheetMove);
    this.sheet.off('mouseup', this.onSheetMouseUp);

    this.sheet.off('touchstart', this.sheetOnTouchStart);
    this.sheet.off('touchmove', this.sheetOnTouchMove);
    this.sheet.off('tap', this.sheetOnTap);

    this.sheetEl.removeEventListener('keydown', this.keyHandler);

    window.removeEventListener('resize', this.throttledResize);
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);

    this.sheetEl.remove();
    this.stage.destroy();
    this.col.destroy();
    this.row.destroy();
    this.cellEditor?.destroy();
  }

  drawTopLeftOffsetRect() {
    const topLeftRect = new Rect({
      ...this.spreadsheet.styles.topLeftRect,
      width: this.getViewportVector().x,
      height: this.getViewportVector().y,
    });
    this.scrollGroups.xySticky.group.add(topLeftRect);

    topLeftRect.moveToTop();
  }

  updateFrozenBackgrounds() {
    const frozenCells = this.spreadsheet.data.getSheetData().frozenCells;
    const xStickyFrozenBackground = this.scrollGroups.xSticky.frozenBackground;
    const yStickyFrozenBackground = this.scrollGroups.ySticky.frozenBackground;
    const xyStickyFrozenBackground =
      this.scrollGroups.xySticky.frozenBackground;

    if (frozenCells && this.row.frozenLine && this.col.frozenLine) {
      const colClientRect = this.col.frozenLine.getClientRect({
        skipStroke: true,
      });
      const rowClientRect = this.row.frozenLine.getClientRect({
        skipStroke: true,
      });

      colClientRect.x -= this.getViewportVector().x;
      rowClientRect.y -= this.getViewportVector().y;

      xStickyFrozenBackground.width(colClientRect.x);
      xStickyFrozenBackground.height(this.sheetDimensions.height);
      xStickyFrozenBackground.y(rowClientRect.y);

      yStickyFrozenBackground.width(this.sheetDimensions.width);
      yStickyFrozenBackground.height(rowClientRect.y);
      yStickyFrozenBackground.x(colClientRect.x);

      xyStickyFrozenBackground.width(colClientRect.x);
      xyStickyFrozenBackground.height(rowClientRect.y);

      xStickyFrozenBackground.show();
      yStickyFrozenBackground.show();
      xyStickyFrozenBackground.show();
    } else {
      xStickyFrozenBackground.hide();
      yStickyFrozenBackground.hide();
      xyStickyFrozenBackground.hide();
    }
  }

  updateScrollGroups() {
    scrollGroups.forEach((key) => {
      const type = key as keyof IScrollGroups;

      const existingGroup = this.scrollGroups?.[type]?.group;

      existingGroup?.destroy();

      const group = new Group({
        x: existingGroup?.x(),
        y: existingGroup?.y(),
      });

      const sheetGroup = new Group({
        ...this.getViewportVector(),
        listening: true,
        type: 'sheet',
      });

      const cellGroup = new Group({
        type: 'cell',
      });

      const rowColGroup = new Group({
        type: 'rowCol',
      });

      const headerGroup = new Group({
        listening: true,
        type: 'header',
      });

      const frozenBackground = new Rect({
        type: 'frozenBackground',
        fill: 'white',
        visible: false,
      });

      if (key !== 'main') {
        sheetGroup.add(frozenBackground);
      }

      // The order added here matters as it determines the zIndex for konva
      sheetGroup.add(rowColGroup, cellGroup);
      group.add(sheetGroup, headerGroup);

      this.layer.add(group);

      this.sheet.moveToTop();

      this.scrollGroups = {
        ...this.scrollGroups,
        [type]: {
          ...this.scrollGroups?.[type],
          group,
          sheetGroup,
          cellGroup,
          rowColGroup,
          headerGroup,
          frozenBackground,
        },
      };
    });
  }

  updateViewport() {
    this.updateScrollGroups();
    this.drawTopLeftOffsetRect();
    this.updateSheetDimensions();
    this.row.updateViewport();
    this.col.updateViewport();
    this.cellRenderer.updateViewport();
    this.selector.updateSelectedCells();
    this.spreadsheet.toolbar?.updateActiveStates();
    this.spreadsheet.formulaBar?.updateValue(
      this.selector.selectedCell?.simpleCellAddress
    );
    this.updateFrozenBackgrounds();
  }
}

export default Sheet;
