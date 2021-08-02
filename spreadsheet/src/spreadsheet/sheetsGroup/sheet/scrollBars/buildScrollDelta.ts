import getNextItemsForScroll from './getNextItemsForScroll';

interface ISheetViewportPosition {
  x: number;
  y: number;
}

export interface IBuildScrollDelta {
  getScrollDelta: (
    items: any[],
    offset: number,
    scrollAmount: number,
    scrollSize: number,
    clientSize: number,
    property: 'height' | 'width',
    sheetViewPortPosition: ISheetViewportPosition
  ) => {
    delta: number;
    newSheetViewportPositions: ISheetViewportPosition;
  };
}

const buildScrollDelta = (sheetDimensionSpace: number): IBuildScrollDelta => {
  let previousScrollAmount = 0;
  let totalUnusedScroll = 0;
  let totalAggregatedSizeOfItems = 0;

  const getScrollDelta = (
    items: any[],
    offset: number,
    scrollAmount: number,
    scrollSize: number,
    clientSize: number,
    property: 'height' | 'width',
    sheetViewPortPosition: ISheetViewportPosition
  ) => {
    const availableSpace = sheetDimensionSpace - offset;
    const changeInScrollAmount = scrollAmount - previousScrollAmount;
    const isIncrementingScroll = changeInScrollAmount > 0;
    const hasUserScrolledToMin = scrollAmount === 0;
    const hasUserScrolledToMax = scrollSize - scrollAmount <= clientSize;

    totalUnusedScroll += changeInScrollAmount;

    const { newItems, newTotalUnusedScroll } = getNextItemsForScroll(
      isIncrementingScroll,
      isIncrementingScroll
        ? sheetViewPortPosition.y
        : sheetViewPortPosition.x - 2,
      totalUnusedScroll,
      property,
      items
    );

    totalUnusedScroll = newTotalUnusedScroll;

    const aggregatedSizeOfItems = newItems.reduce((totalSize, item) => {
      return (totalSize += item[property]);
    }, 0);

    const newSheetViewportPositions = {
      ...sheetViewPortPosition,
    };

    if (newItems.length) {
      if (isIncrementingScroll) {
        newSheetViewportPositions.x += newItems.length;
        newSheetViewportPositions.y = newItems[newItems.length - 1].number;
      } else {
        newSheetViewportPositions.x = newItems[newItems.length - 1].number;
        newSheetViewportPositions.y -= newItems.length;
      }
    }

    totalAggregatedSizeOfItems = isIncrementingScroll
      ? (totalAggregatedSizeOfItems += aggregatedSizeOfItems)
      : (totalAggregatedSizeOfItems -= aggregatedSizeOfItems);

    //  Use the remaining unused scroll leftovers
    if (hasUserScrolledToMax) {
      totalAggregatedSizeOfItems += totalUnusedScroll;
      totalUnusedScroll = 0;
    }

    if (hasUserScrolledToMin) {
      totalAggregatedSizeOfItems = 0;
      totalUnusedScroll = 0;
    }

    const delta = totalAggregatedSizeOfItems / availableSpace;

    previousScrollAmount = scrollAmount;
    totalAggregatedSizeOfItems = totalAggregatedSizeOfItems;

    return {
      delta,
      newSheetViewportPositions,
    };
  };

  return {
    getScrollDelta,
  };
};

export default buildScrollDelta;
