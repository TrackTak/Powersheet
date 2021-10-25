import { Vector2d } from 'konva/lib/types';

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
  *iterateFromYToX() {
    for (let index = this.y; index >= this.x; index--) {
      yield index;
    }
  }
}

export default ViewportPosition;
