class RowResizer {
  constructor() {}

  private create() {
    this.shapes.rowHeaderResizeLine.on(
      'dragstart',
      this.rowHeaderResizeLineDragStart
    );
    this.shapes.rowHeaderResizeLine.on(
      'dragmove',
      this.rowHeaderResizeLineDragMove
    );
    this.shapes.rowHeaderResizeLine.on(
      'dragend',
      this.rowHeaderResizeLineDragEnd
    );
    this.shapes.rowHeaderResizeLine.on(
      'mousedown',
      this.rowHeaderResizeLineOnMousedown
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseover',
      this.rowHeaderResizeLineOnMouseover
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseout',
      this.rowHeaderResizeLineOnMouseout
    );
    this.shapes.rowHeaderResizeLine.on(
      'mouseup',
      this.rowHeaderResizeLineOnMouseup
    );
  }
}

export default RowResizer;
