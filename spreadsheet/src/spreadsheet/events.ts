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
  toolbar: {
    change: 't-change',
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
  merge: {
    add: 'm-add',
    unMerge: 'm-unMerge',
  },
  selector: {
    selectCells: 's-selectCells',
  },
};

export default events;
