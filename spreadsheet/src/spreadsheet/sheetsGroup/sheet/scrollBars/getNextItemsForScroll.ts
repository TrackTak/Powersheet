import { IRowColSize } from '../IRowColSize';

const getNextItemsForScroll = (
  incrementingScroll: boolean,
  startPosition: number,
  totalUnusedScroll: number,
  items: IRowColSize[]
) => {
  let newTotalUnusedScroll = incrementingScroll
    ? totalUnusedScroll
    : Math.abs(totalUnusedScroll);
  let i = startPosition;
  let currentItem = items[i];

  const itemsToGet = [];

  while (newTotalUnusedScroll >= currentItem?.getSize()) {
    const value = currentItem.getSize();

    itemsToGet.push(currentItem);

    newTotalUnusedScroll -= value;

    if (incrementingScroll) {
      i++;
    } else {
      i--;
    }

    currentItem = items[i];
  }

  return {
    newItems: itemsToGet,
    newTotalUnusedScroll: incrementingScroll
      ? newTotalUnusedScroll
      : -Math.abs(newTotalUnusedScroll),
  };
};

export default getNextItemsForScroll;
