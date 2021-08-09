import { ISizes } from '../../../IOptions';
import { ISheetViewportPosition } from '../Canvas';

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
    console.log(scrollAmount);
    // const isIncrementingScroll = changeInScrollAmount > 0;
    // const hasUserScrolledToMin = scrollAmount === 0;
    // const hasUserScrolledToMax = scrollSize - scrollAmount <= clientSize;

    // totalUnusedScroll += changeInScrollAmount;

    // const index = sheetViewPortPosition.y + 1;

    // const index = isIncrementingScroll
    //   ? sheetViewPortPosition.y + 1
    //   : sheetViewPortPosition.x - 1;

    // let newTotalUnusedScroll = isIncrementingScroll
    //   ? totalUnusedScroll
    //   : Math.abs(totalUnusedScroll);

    // let i = index;
    // const getCurrentSize = () => sizes?.[i] ?? defaultSize;
    // let currentSize = getCurrentSize();
    // const newSizes = [];

    // while (newTotalUnusedScroll >= currentSize) {
    //   newTotalUnusedScroll -= currentSize;

    //   newSizes.push(currentSize);

    //   if (isIncrementingScroll) {
    //     i++;
    //   } else {
    //     i--;
    //   }

    //   currentSize = getCurrentSize();
    // }

    // const aggregatedSizeOfItems = newSizes.reduce((totalSize, size) => {
    //   return (totalSize += size);
    // }, 0);

    // totalUnusedScroll = newTotalUnusedScroll;

    // const newSheetViewportPositions = {
    //   ...sheetViewPortPosition,
    // };

    // if (newSizes.length) {
    //   if (isIncrementingScroll) {
    //     newSheetViewportPositions.x += length;
    //     newSheetViewportPositions.y += length;
    //   } else {
    //     newSheetViewportPositions.x -= length;
    //     newSheetViewportPositions.y -= length;
    //   }
    // }

    // totalAggregatedSizeOfItems = isIncrementingScroll
    //   ? (totalAggregatedSizeOfItems += aggregatedSizeOfItems)
    //   : (totalAggregatedSizeOfItems -= aggregatedSizeOfItems);

    // //  Use the remaining unused scroll leftovers
    // if (hasUserScrolledToMax) {
    //   totalUnusedScroll = 0;
    // }

    // if (hasUserScrolledToMin) {
    //   totalUnusedScroll = 0;
    // }

    // const delta = totalAggregatedSizeOfItems / availableSpace;

    // previousScrollAmount = scrollAmount;
    // totalAggregatedSizeOfItems = totalAggregatedSizeOfItems;

    return {
      delta: 0,
      newSheetViewportPositions: 0,
    };
  };

  return {
    getScrollDelta,
  };
};

export default buildScrollDelta;
