import { ISizes } from '../../../IOptions';

const getNextItemsForScroll = (
  incrementingScroll: boolean,
  startIndex: number,
  totalUnusedScroll: number,
  sizes: ISizes | undefined,
  defaultSize: number
) => {
  let newTotalUnusedScroll = incrementingScroll
    ? totalUnusedScroll
    : Math.abs(totalUnusedScroll);
  let i = startIndex;
  const getCurrentSize = () => sizes?.[i] ?? defaultSize;
  let currentSize = getCurrentSize();
  const newSizes = [];

  while (newTotalUnusedScroll >= currentSize) {
    newTotalUnusedScroll -= currentSize;

    newSizes.push(currentSize);

    if (incrementingScroll) {
      i++;
    } else {
      i--;
    }

    currentSize = getCurrentSize();
  }

  return {
    newSizes,
    newTotalUnusedScroll: incrementingScroll
      ? newTotalUnusedScroll
      : -Math.abs(newTotalUnusedScroll),
  };
};

export default getNextItemsForScroll;
