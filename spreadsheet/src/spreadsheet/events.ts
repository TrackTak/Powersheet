const events = {
  canvas: {
    load: 'c-load',
  },
  scroll: {
    vertical: 'sv-scroll',
    horizontal: 'sh-scroll',
  },
  scrollWheel: {
    vertical: 'swv-scroll',
    horizontal: 'swh-scroll',
  },
  resize: {
    row: {
      start: 'rr-start',
      move: 'rr-move',
      end: 'rr-end',
    },
    col: {
      start: 'rc-start',
      move: 'rc-move',
      end: 'rc-end',
    },
  },
  selector: {
    selectCells: 's-selectCells',
  },
};

export default events;
