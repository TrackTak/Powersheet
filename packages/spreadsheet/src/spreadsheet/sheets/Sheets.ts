import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { Vector2d } from 'konva/lib/types';
import Selector from './Selector';
import RowCols, { RowColType } from './rowCols/RowCols';
import CellEditor from './cellEditor/CellEditor';
import RightClickMenu from './rightClickMenu/RightClickMenu';
import { Stage } from 'konva/lib/Stage';
import Spreadsheet from '../Spreadsheet';
import { prefix, reverseVectorsIfStartBiggerThanEnd } from '../utils';
import styles from './Sheets.module.scss';
import { KonvaEventObject } from 'konva/lib/Node';
import Comment from './comment/Comment';
import { debounce, DebouncedFunc, isNil, throttle } from 'lodash';
import { Shape } from 'konva/lib/Shape';
import SimpleCellAddress from './cells/cell/SimpleCellAddress';
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress';
import Cell from './cells/cell/Cell';
import Cells from './cells/Cells';
import { ISheetData } from './Data';
import Merger from './Merger';
import Clipboard from '../Clipboard';

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

class Sheets {
  scrollGroups!: IScrollGroups;
  sheetIds: SheetId[] = [];
  sheetEl: HTMLDivElement;
  stage: Stage;
  layer: Layer;
  sheet: Rect;
  cols: RowCols;
  rows: RowCols;
  clipboard: Clipboard;
  merger: Merger;
  selector: Selector;
  cells: Cells;
  sheetDimensions: IDimensions = {
    width: 0,
    height: 0,
  };
  previousSheetClickTime = 0;
  sheetClickTime = 0;
  cellEditor: CellEditor;
  rightClickMenu: RightClickMenu;
  topLeftRect?: Rect;
  comment: Comment;
  activeSheetId = 0;
  totalSheetCount = 0;
  private debouncedResize: DebouncedFunc<(e: Event) => void>;
  private throttledSheetMove: DebouncedFunc<
    (e: KonvaEventObject<MouseEvent>) => void
  >;

  constructor(public spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.sheetEl = document.createElement('div');
    this.sheetEl.classList.add(`${prefix}-sheet`, styles.sheet);

    this.spreadsheet.spreadsheetEl.appendChild(this.sheetEl);

    this.debouncedResize = debounce(this.onResize, 50);
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

    scrollGroups.forEach((key) => {
      const type = key as keyof IScrollGroups;

      const group = new Group();

      const sheetGroup = new Group({
        name: 'sheetGroup',
        listening: true,
      });

      const cellGroup = new Group({
        name: 'cellGroup',
      });

      const rowColGroup = new Group({
        name: 'rowColGroup',
      });

      const headerGroup = new Group({
        name: 'headerGroup',
        listening: true,
      });

      const frozenBackground = new Rect({
        name: 'frozenBackgroundRect',
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

    this.clipboard = new Clipboard(this);
    this.merger = new Merger(this);
    this.cells = new Cells(this);
    this.cols = new RowCols('col', this);
    this.rows = new RowCols('row', this);

    this.rows.updateViewportSize();
    this.cols.updateViewportSize();

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

    window.addEventListener('resize', this.debouncedResize);

    this.updateSheetDimensions();

    this.sheet.setPosition(this.getViewportVector());

    this.cols.scrollBar.setYIndex();
    this.rows.scrollBar.setYIndex();

    // TODO: use scrollBar size instead of hardcoded value
    this.rows.scrollBar.scrollBarEl.style.bottom = `${16}px`;

    this.cellEditor = new CellEditor(this);
  }

  deleteSheet(sheetId: SheetId) {
    if (this.activeSheetId === sheetId) {
      const currentIndex = this.sheetIds.indexOf(sheetId);

      if (currentIndex === 0) {
        this.switchSheet(this.sheetIds[1]);
      } else {
        this.switchSheet(this.sheetIds[currentIndex - 1]);
      }
    }

    this.spreadsheet.data.deleteSheet(sheetId);

    delete this.sheetIds[sheetId];

    this.spreadsheet.updateViewport();
  }

  switchSheet(sheetId: SheetId) {
    this.activeSheetId = sheetId;

    this.spreadsheet.updateViewport();
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this.spreadsheet.data.setSheet(sheetId, {
      sheetName,
    });
    this.spreadsheet.hyperformula.renameSheet(sheetId, sheetName);

    this.spreadsheet.updateViewport();
  }

  createNewSheet(data: ISheetData) {
    this.spreadsheet.data.setSheet(data.id, data);
    this.spreadsheet.hyperformula.addSheet(data.sheetName);

    this.totalSheetCount++;

    this.spreadsheet.updateViewport();
  }

  getSheetName() {
    return `Sheet${this.totalSheetCount + 1}`;
  }

  updateSize() {
    // 16 is scrollbar
    this.stage.width(this.sheetEl.offsetWidth - 16);
    this.stage.height(this.sheetEl.offsetHeight - 16);

    this.sheet.width(this.stage.width() - this.getViewportVector().x);
    this.sheet.height(this.stage.height() - this.getViewportVector().y);

    this.rows.updateViewportSize();
    this.cols.updateViewportSize();

    const context = this.layer.canvas.getContext();

    // We reset the translate each time and then
    // translate 0.5 for crisp lines.
    context.reset();
    context.translate(0.5, 0.5);

    this.rows.setCachedRowCols();
    this.cols.setCachedRowCols();
    this.cells.setCachedCells();

    this.spreadsheet.updateViewport();
  }

  onResize = () => {
    this.updateSize();
  };

  onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    this.cols.scrollBar.scrollBarEl.scrollBy(e.evt.deltaX, 0);
    this.rows.scrollBar.scrollBarEl.scrollBy(0, e.evt.deltaY);

    this.spreadsheet.eventEmitter.emit('scrollVerticalWheel', e);
  };

  sheetOnTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) return;

    const { clientX, clientY } = touch1;

    this.cellEditor.hideAndSave();

    this.cols.scrollBar.previousTouchMovePosition = clientX;
    this.rows.scrollBar.previousTouchMovePosition = clientY;
  };

  sheetOnTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) return;

    const { clientX, clientY } = touch1;

    const deltaX =
      (this.cols.scrollBar.previousTouchMovePosition - clientX) *
      this.spreadsheet.options.touchScrollSpeed;

    const deltaY =
      (this.rows.scrollBar.previousTouchMovePosition - clientY) *
      this.spreadsheet.options.touchScrollSpeed;

    this.cols.scrollBar.scrollBarEl.scrollBy(deltaX, 0);
    this.rows.scrollBar.scrollBarEl.scrollBy(0, deltaY);

    this.cols.scrollBar.previousTouchMovePosition = clientX;
    this.rows.scrollBar.previousTouchMovePosition = clientY;
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
    const cellId = simpleCellAddress.toCellId();

    if (this.hasDoubleClickedOnCell()) {
      this.cellEditor.show(selectedFirstcell);
    }

    if (this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.comment) {
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
      new SimpleCellAddress(this.activeSheetId, getMin('row'), getMin('col')),
      new SimpleCellAddress(this.activeSheetId, getMax('row'), getMax('col'))
    );
  }

  keyHandler = async (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        break;
      }
      case 'Delete': {
        this.spreadsheet.pushToHistory(() => {
          this.spreadsheet.hyperformula.batch(() => {
            this.selector.selectedCells.forEach((cell) => {
              const simpleCellAddress = cell.simpleCellAddress;

              this.spreadsheet.data.deleteCell(simpleCellAddress);
            });
          });
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
        await this.clipboard.cut();
        break;
      }
      case e.ctrlKey && 'c': {
        await this.clipboard.copy();
        break;
      }
      case e.ctrlKey && 'v': {
        this.clipboard.paste();
        break;
      }
      default:
        if (this.cellEditor.getIsHidden() && !e.ctrlKey) {
          this.cellEditor.show(this.selector.selectedCell!);
        }
    }

    this.spreadsheet.updateViewport();
  };

  isShapeOutsideOfViewport(shape: Group | Shape, margin?: Partial<Vector2d>) {
    return !shape.isClientRectOnScreen({
      x: -(this.getViewportVector().x + (margin?.x ?? 0.001)),
      y: -(this.getViewportVector().y + (margin?.y ?? 0.001)),
    });
  }

  updateSheetDimensions() {
    this.sheetDimensions.width = this.cols.getTotalSize();
    this.sheetDimensions.height = this.rows.getTotalSize();
  }

  getViewportVector() {
    return {
      x: this.spreadsheet.styles.row.headerRect.width!,
      y: this.spreadsheet.styles.col.headerRect.height!,
    };
  }

  convertVectorsToRangeSimpleCellAddress(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      end
    );

    const rowIndexes = this.rows.getTopBottomIndexFromPosition({
      x: newStart.y,
      y: newEnd.y,
    });

    const colIndexes = this.cols.getTopBottomIndexFromPosition({
      x: newStart.x,
      y: newEnd.x,
    });

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(
        this.activeSheetId,
        rowIndexes.topIndex,
        colIndexes.topIndex
      ),
      new SimpleCellAddress(
        this.activeSheetId,
        rowIndexes.bottomIndex,
        colIndexes.bottomIndex
      )
    );

    for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
      for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(
          this.activeSheetId,
          ri,
          ci
        );
        const existingRangeSimpleCellAddress =
          this.merger.associatedMergedCellAddressMap.get(
            simpleCellAddress.toCellId()
          );

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

    window.removeEventListener('resize', this.debouncedResize);

    this.sheetEl.remove();
    this.stage.destroy();
    this.cols.destroy();
    this.rows.destroy();
    this.cellEditor?.destroy();
  }

  drawTopLeftOffsetRect() {
    this.topLeftRect?.destroy();
    this.topLeftRect = new Rect({
      ...this.spreadsheet.styles.topLeftRect,
      width: this.getViewportVector().x,
      height: this.getViewportVector().y,
    });
    this.scrollGroups.xySticky.group.add(this.topLeftRect);

    this.topLeftRect.moveToTop();
  }

  updateFrozenBackgrounds() {
    const frozenCells =
      this.spreadsheet.data.spreadsheetData.frozenCells?.[this.activeSheetId];
    const xStickyFrozenBackground = this.scrollGroups.xSticky.frozenBackground;
    const yStickyFrozenBackground = this.scrollGroups.ySticky.frozenBackground;
    const xyStickyFrozenBackground =
      this.scrollGroups.xySticky.frozenBackground;
    const frozenRowExists = !isNil(frozenCells?.row);
    const frozenColExists = !isNil(frozenCells?.col);

    const sizeUpToFrozenCol = this.cols.getSizeUpToFrozenRowCol();
    const sizeUpToFrozenRow = this.rows.getSizeUpToFrozenRowCol();

    xStickyFrozenBackground.hide();
    yStickyFrozenBackground.hide();
    xyStickyFrozenBackground.hide();

    if (frozenColExists) {
      xStickyFrozenBackground.size({
        width: sizeUpToFrozenCol,
        height: this.sheetDimensions.height,
      });
      xStickyFrozenBackground.y(sizeUpToFrozenRow);
      xStickyFrozenBackground.show();
    }

    if (frozenRowExists) {
      yStickyFrozenBackground.size({
        width: this.sheetDimensions.width,
        height: sizeUpToFrozenRow,
      });
      yStickyFrozenBackground.x(sizeUpToFrozenCol);
      yStickyFrozenBackground.show();
    }

    if (frozenRowExists && frozenColExists) {
      xyStickyFrozenBackground.show();

      xyStickyFrozenBackground.size({
        width: sizeUpToFrozenCol,
        height: sizeUpToFrozenRow,
      });
    }
  }

  updateViewport() {
    Object.keys(this.scrollGroups).forEach((key) => {
      const type = key as keyof IScrollGroups;

      const scrollGroup = this.scrollGroups[type];

      scrollGroup.sheetGroup.setAttrs(this.getViewportVector());
    });
    this.updateSheetDimensions();

    this.cells.clearAll();
    this.rows.clearAll();
    this.cols.clearAll();

    this.drawTopLeftOffsetRect();
    this.cells.updateViewport();
    this.rows.updateViewport();
    this.cols.updateViewport();
    this.selector.updateSelectedCells();
    this.spreadsheet.toolbar?.updateActiveStates();
    this.spreadsheet.formulaBar?.updateValue(
      this.selector.selectedCell?.simpleCellAddress
    );
    this.updateFrozenBackgrounds();
  }
}

export default Sheets;
