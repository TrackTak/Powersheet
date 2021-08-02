const getNextItemsForScroll = (
  incrementingScroll: boolean,
  startPosition: number,
  totalUnusedScroll: number,
  property: 'height' | 'width',
  items: any[]
) => {
  let newTotalUnusedScroll = incrementingScroll
    ? totalUnusedScroll
    : Math.abs(totalUnusedScroll);
  let i = startPosition;
  let currentItem = items[i];

  const itemsToGet = [];

  while (newTotalUnusedScroll >= currentItem?.[property]) {
    const value = currentItem[property];

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
