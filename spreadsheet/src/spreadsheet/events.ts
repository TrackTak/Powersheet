const events = {
  spreadsheet: {
    focusedSheetChange: 's-focusedSheetChange',
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
  cellEditor: {
    change: 'ce-change',
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
    startSelection: 's-startSelection',
    moveSelection: 's-moveSelection',
    endSelection: 's-endSelection',
  },
  sheet: {
    setData: 's-setData',
  },
};

export default events;
