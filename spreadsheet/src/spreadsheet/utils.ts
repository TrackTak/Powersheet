import { Shape } from 'konva/lib/Shape';

export const prefix = 'powersheet';

export const rotatePoint = (
  { x, y }: { x: number; y: number },
  rad: number
) => {
  const rcos = Math.cos(rad);
  const rsin = Math.sin(rad);
  return { x: x * rcos - y * rsin, y: y * rcos + x * rsin };
};

export const rotateAroundCenter = (shape: Shape, rotation: number) => {
  //@ts-ignore
  const getAngle = Konva.getAngle;

  const topLeft = {
    x: -shape.width() / 2,
    y: -shape.height() / 2,
  };

  const current = rotatePoint(topLeft, getAngle(shape.rotation()));
  const rotated = rotatePoint(topLeft, getAngle(rotation));
  const dx = rotated.x - current.x,
    dy = rotated.y - current.y;

  shape.rotation(rotation);
  shape.x(shape.x() + dx);
  shape.y(shape.y() + dy);

  return { shape, rotation };
};
