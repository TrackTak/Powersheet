import { ISizes } from '../../../IOptions';
import { ISheetViewportPosition } from '../Canvas';
import getNextItemsForScroll from './getNextItemsForScroll';

export interface IBuildScrollDelta {
  getScrollDelta: (
    offset: number,
    scrollAmount: number,
    scrollSize: number,
    clientSize: number,
    sheetViewPortPosition: ISheetViewportPosition,
    sizes: ISizes | undefined,
    defaultSize: number
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
    offset: number,
    scrollAmount: number,
    scrollSize: number,
    clientSize: number,
    sheetViewPortPosition: ISheetViewportPosition,
    sizes: ISizes | undefined,
    defaultSize: number
  ) => {
    const availableSpace = sheetDimensionSpace - offset;
    const changeInScrollAmount = scrollAmount - previousScrollAmount;
    const isIncrementingScroll = changeInScrollAmount > 0;
    const hasUserScrolledToMin = scrollAmount === 0;
    const hasUserScrolledToMax = scrollSize - scrollAmount <= clientSize;

    totalUnusedScroll += changeInScrollAmount;

    const index = isIncrementingScroll
      ? sheetViewPortPosition.y + 1
      : sheetViewPortPosition.x - 1;

    const { newSizes, newTotalUnusedScroll } = getNextItemsForScroll(
      isIncrementingScroll,
      index,
      totalUnusedScroll,
      sizes,
      defaultSize
    );

    const aggregatedSizeOfItems = newSizes.reduce((totalSize, size) => {
      return (totalSize += size);
    }, 0);

    totalUnusedScroll = newTotalUnusedScroll;

    const newSheetViewportPositions = {
      ...sheetViewPortPosition,
    };

    if (newSizes.length) {
      if (isIncrementingScroll) {
        newSheetViewportPositions.x += length;
        newSheetViewportPositions.y += length;
      } else {
        newSheetViewportPositions.x -= length;
        newSheetViewportPositions.y -= length;
      }
    }

    totalAggregatedSizeOfItems = isIncrementingScroll
      ? (totalAggregatedSizeOfItems += aggregatedSizeOfItems)
      : (totalAggregatedSizeOfItems -= aggregatedSizeOfItems);

    //  Use the remaining unused scroll leftovers
    if (hasUserScrolledToMax) {
      totalUnusedScroll = 0;
    }

    if (hasUserScrolledToMin) {
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
