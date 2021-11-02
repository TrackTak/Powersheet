import { RectConfig } from 'konva/lib/shapes/Rect';

export const getInnerRectConfig = (
  attrs: RectConfig,
  size: {
    width: number;
    height: number;
  }
) => {
  const { strokeWidth } = attrs;

  // We must have another Rect for the inside borders
  // as konva does not allow stroke positioning
  const innerRectConfig: RectConfig = {
    ...attrs,
    x: strokeWidth! / 2,
    y: strokeWidth! / 2,
    width: size.width - strokeWidth!,
    height: size.height - strokeWidth!,
    strokeWidth,
  };

  return innerRectConfig;
};
