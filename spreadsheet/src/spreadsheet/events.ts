const events = {
  scroll: {
    vertical: 'sv-scroll',
    horizontal: 'sh-scroll',
  },
  scrollWheel: {
    scroll: 'sw-scroll',
  },
  toolbar: {
    change: 't-change',
  },
  cellEditor: {
    change: 'ce-change',
  },
  history: {
    push: 'hp-push',
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
  persist: {
    save: 'p-save',
  },
  selector: {
    startSelection: 's-startSelection',
    moveSelection: 's-moveSelection',
    endSelection: 's-endSelection',
  },
};

export default events;
