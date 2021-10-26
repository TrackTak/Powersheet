import { IRect, Vector2d } from 'konva/lib/types';

export const prefix = 'powersheet';

export const rotatePoint = (
  { x, y }: { x: number; y: number },
  rad: number
) => {
  const rcos = Math.cos(rad);
  const rsin = Math.sin(rad);
  return { x: x * rcos - y * rsin, y: y * rcos + x * rsin };
};

export const dataKeysComparer = (x: string, y: string) => {
  return new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  }).compare(x, y);
};

export const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.width / 2,
    y: rectOne.height / 2,
  };

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2,
  };

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y,
  };
};

export const reverseVectorsIfStartBiggerThanEnd = (
  start: Vector2d,
  end: Vector2d
) => {
  const newStart = { ...start };
  const newEnd = { ...end };
  let isReversedX = false;
  let isReversedY = false;

  if (start.x > end.x) {
    const temp = start.x;

    newStart.x = end.x;
    newEnd.x = temp;
    isReversedX = true;
  }

  if (start.y > end.y) {
    const temp = start.y;

    newStart.y = end.y;
    newEnd.y = temp;
    isReversedY = true;
  }

  return {
    start: newStart,
    end: newEnd,
    isReversedX,
    isReversedY,
  };
};

// Taken from: https://codereview.stackexchange.com/questions/16124/implement-numbering-scheme-like-a-b-c-aa-ab-aaa-similar-to-converting
export const getColumnHeader = (number: number) => {
  const baseChar = 'A'.charCodeAt(0);
  let columnHeader = '';

  do {
    number -= 1;
    columnHeader = String.fromCharCode(baseChar + (number % 26)) + columnHeader;
    number = (number / 26) >> 0; // quick `floor`
  } while (number > 0);

  return columnHeader;
};

export const setCaretToEndOfElement = (element: HTMLElement) => {
  const range = document.createRange();
  const sel = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);

  sel?.removeAllRanges();
  sel?.addRange(range);

  range.detach();
};
