import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import {
  IHeaderDimensions,
  ISheetDimensions,
  ISheetViewport,
  ISheetViewportPositions,
} from '../Canvas';
import { KonvaEventObject } from 'konva/lib/Node';
import buildScrollBar, { IBuildScroll } from './buildScrollBar';
import EventEmitter from 'eventemitter3';
import Row from '../Row';
import events from '../../../events';

export const getNextRows = (
  isScrollingDown: boolean,
  startRowPosition: number,
  totalUnusedScrollHeight: number,
  rows: Row[]
) => {
  const rowsToGet: Row[] = [];
  let newTotalUnusedScrollHeight = isScrollingDown
    ? totalUnusedScrollHeight
    : Math.abs(totalUnusedScrollHeight);
  let i = startRowPosition;
  let currentRow = rows[i];

  while (newTotalUnusedScrollHeight > currentRow?.height) {
    const rowHeight = currentRow.height;

    rowsToGet.push(currentRow);

    newTotalUnusedScrollHeight -= rowHeight;

    if (isScrollingDown) {
      i++;
    } else {
      i--;
    }

    currentRow = rows[i];
  }

  return {
    rows: rowsToGet,
    totalUnusedScrollHeight: isScrollingDown
      ? newTotalUnusedScrollHeight
      : -Math.abs(newTotalUnusedScrollHeight),
  };
};

class VerticalScrollBar {
  scrollBar!: HTMLDivElement;
  scroll!: HTMLDivElement;
  private scrollBarBuilder!: IBuildScroll;
  private previousScrollTop: number;
  private totalAggregatedHeightOfRows: number;
  private totalUnusedScrollHeight: number;

  constructor(
    private stage: Stage,
    private mainLayer: Layer,
    private horizontallyStickyLayer: Layer,
    private sheetDimensions: ISheetDimensions,
    private sheetViewport: ISheetViewport,
    private sheetViewportPositions: ISheetViewportPositions,
    private setSheetViewportPositions: (
      sheetViewportPositions: ISheetViewportPositions
    ) => void,
    private colHeaderDimensions: IHeaderDimensions,
    // private getHorizontalScrollBarBoundingClientRect: () => DOMRect,
    private rows: Row[],
    private eventEmitter: EventEmitter
  ) {
    this.stage = stage;
    this.mainLayer = mainLayer;
    this.horizontallyStickyLayer = horizontallyStickyLayer;
    this.sheetDimensions = sheetDimensions;
    this.colHeaderDimensions = colHeaderDimensions;
    // this.getHorizontalScrollBarBoundingClientRect =
    //   getHorizontalScrollBarBoundingClientRect;
    this.sheetViewport = sheetViewport;
    this.setSheetViewportPositions = setSheetViewportPositions;
    this.sheetViewportPositions = sheetViewportPositions;
    this.rows = rows;
    this.eventEmitter = eventEmitter;
    this.previousScrollTop = 0;
    this.totalAggregatedHeightOfRows = 0;
    this.totalUnusedScrollHeight = 0;

    this.create();
  }

  getBoundingClientRect = () => {
    return this.scrollBar.getBoundingClientRect();
  };

  private create() {
    const onLoad = () => {
      this.scrollBar.style.height = `${
        this.stage.height()
        // this.getHorizontalScrollBarBoundingClientRect().height -
        // this.colHeaderDimensions.height
      }px`;
      // this.scrollBar.style.bottom = `${
      //   this.getHorizontalScrollBarBoundingClientRect().height
      // }px`;
    };

    this.eventEmitter.on(
      events.scrollWheel.vertical,
      (e: KonvaEventObject<WheelEvent>) => {
        // this.scrollBar.scrollBy(0, e.evt.deltaY);
      }
    );

    this.eventEmitter.on(events.scroll.vertical, (e: Event) => {
      const { scrollTop, offsetHeight, scrollHeight, clientHeight } =
        e.target! as any;

      const availableHeight = this.sheetDimensions.height - offsetHeight;
      const changeInScrollTop = scrollTop - this.previousScrollTop;
      const isScrollingDown = changeInScrollTop > 0;
      const hasUserScrolledToBottom = scrollHeight - scrollTop <= clientHeight;
      const hasUserScrolledToTop = scrollTop === 0;

      this.totalUnusedScrollHeight += changeInScrollTop;

      const { rows, totalUnusedScrollHeight } = getNextRows(
        isScrollingDown,
        isScrollingDown
          ? this.sheetViewportPositions.row.bottom
          : this.sheetViewportPositions.row.top - 2,
        this.totalUnusedScrollHeight,
        this.rows
      );

      this.totalUnusedScrollHeight = totalUnusedScrollHeight;

      console.log(totalUnusedScrollHeight);

      const aggregatedHeightOfRows = rows.reduce((totalHeight, row) => {
        return (totalHeight += row.height);
      }, 0);

      const rowSheetViewportPositions = {
        ...this.sheetViewportPositions.row,
      };

      if (rows.length) {
        if (isScrollingDown) {
          rowSheetViewportPositions.top += rows.length;
          rowSheetViewportPositions.bottom = rows[rows.length - 1].number;
        } else {
          rowSheetViewportPositions.top = rows[rows.length - 1].number;
          rowSheetViewportPositions.bottom -= rows.length;
        }
      }

      this.setSheetViewportPositions({
        ...this.sheetViewportPositions,
        row: rowSheetViewportPositions,
      });

      let totalAggregatedHeightOfRows = isScrollingDown
        ? (this.totalAggregatedHeightOfRows += aggregatedHeightOfRows)
        : (this.totalAggregatedHeightOfRows -= aggregatedHeightOfRows);

      // // Use the remaining unused scroll leftovers
      if (hasUserScrolledToBottom) {
        totalAggregatedHeightOfRows += this.totalUnusedScrollHeight;
        this.totalUnusedScrollHeight = 0;
      }

      if (hasUserScrolledToTop) {
        totalAggregatedHeightOfRows += this.totalUnusedScrollHeight;
        this.totalUnusedScrollHeight = 0;
      }

      const delta = totalAggregatedHeightOfRows / availableHeight;

      const yToMove =
        -(this.sheetDimensions.height - this.stage.height()) * delta;

      this.mainLayer.y(yToMove);
      this.horizontallyStickyLayer.y(yToMove);

      this.previousScrollTop = scrollTop;
      this.totalAggregatedHeightOfRows = totalAggregatedHeightOfRows;
    });

    this.scrollBarBuilder = buildScrollBar(
      'vertical',
      this.stage,
      onLoad,
      this.eventEmitter
    );

    const { scrollBar, scroll } = this.scrollBarBuilder.create();

    this.scrollBar = scrollBar;
    this.scroll = scroll;

    scroll.style.height = `${this.sheetDimensions.height}px`;
  }

  scrollToNextRow(scrollTop: number) {
    // const scrollDirection: ScrollDirection =
    //   scrollTop > this.previousScrollTop ? 'down' : 'up';
    // const increment = scrollDirection === 'up' ? -1 : 1;
    // const index = this.sheetViewportIndexes.row.bottom + increment;
    // const nextRow = this.rows[index];
    // const height = nextRow.height;
    // const vector = {
    //   x: 0,
    //   y: scrollDirection === 'down' ? height : -height,
    // };
    // this.mainLayer.move(vector);
    // this.horizontallyStickyLayer.move(vector);
    // this.previousScrollTop = scrollTop;
  }

  destroy() {
    this.scrollBarBuilder.destroy();
  }
}

export default VerticalScrollBar;
