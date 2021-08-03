import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import Col from './Col';
import Row from './Row';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../../IOptions';

export default {
  title: 'spreadsheet/sheetsGroup/sheet/Canvas',
  argTypes: {},
} as Meta;

const Template: Story<{}> = () => {
  const eventEmitter = new EventEmitter();
  const options: IOptions = {
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
    frozenCells: {
      row: [0],
      col: [0],
    },
  };
  const rows: Row[] = [];
  const cols: Col[] = [];

  for (let index = 0; index < options.numberOfRows; index++) {
    const isFrozen = options.frozenCells.row.includes(index);

    const row = new Row(
      index + 1,
      index,
      options.row.minHeight,
      options.row.defaultHeight,
      isFrozen
    );

    rows.push(row);
  }

  for (let index = 0; index < options.numberOfCols; index++) {
    const startCharCode = 'A'.charCodeAt(0);
    const letter = String.fromCharCode(startCharCode + index);
    const isFrozen = options.frozenCells.col.includes(index);

    cols.push(
      new Col(
        letter,
        index,
        options.col.minWidth,
        options.col.defaultWidth,
        isFrozen
      )
    );
  }

  const canvas = new Canvas({
    rows,
    cols,
    options,
    eventEmitter,
  });

  return canvas.container;
};

export const Default = Template.bind({});

Default.args = {};
