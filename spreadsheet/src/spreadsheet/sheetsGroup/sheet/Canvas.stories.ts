import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import Col from './Col';
import Row from './Row';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../../IOptions';

export default {
  title: 'Canvas',
} as Meta;

const Template: Story<IOptions> = (args) => {
  const eventEmitter = new EventEmitter();
  const rows: Row[] = [];
  const cols: Col[] = [];

  for (let index = 0; index < args.numberOfRows; index++) {
    const isFrozen = index <= args.frozenCells?.row;

    const row = new Row(
      index + 1,
      index,
      args.row.minHeight,
      args.row.defaultHeight,
      isFrozen
    );

    rows.push(row);
  }

  for (let index = 0; index < args.numberOfCols; index++) {
    const startCharCode = 'A'.charCodeAt(0);
    const letter = String.fromCharCode(startCharCode + index);
    const isFrozen = index <= args.frozenCells?.col;

    cols.push(
      new Col(letter, index, args.col.minWidth, args.col.defaultWidth, isFrozen)
    );
  }

  const canvas = new Canvas({
    rows,
    cols,
    options: args,
    eventEmitter,
  });

  return canvas.container;
};

export const Default = Template.bind({});

const defaultArgs = {
  numberOfRows: 100,
  numberOfCols: 26,
  row: {
    minHeight: 25,
    defaultHeight: 25,
  },
  col: {
    minWidth: 60,
    defaultWidth: 100,
  },
};

Default.args = defaultArgs;

export const FreezeCells = Template.bind({});

FreezeCells.args = {
  ...defaultArgs,
  frozenCells: {
    row: 0,
    col: 0,
  },
};
