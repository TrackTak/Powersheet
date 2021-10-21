import { Vector2d } from '@tracktak/konva/lib/types';

class ViewportPosition implements Vector2d {
  constructor(public x = 0, public y = 0) {
    this.x = x;
    this.y = y;
  }

  *iterateFromXToY() {
    for (let index = this.x; index <= this.y; index++) {
      yield index;
    }
  }
}

export default ViewportPosition;
