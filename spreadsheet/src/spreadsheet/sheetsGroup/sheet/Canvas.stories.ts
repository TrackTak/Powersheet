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
    defaultRowHeight: 25,
    defaultColWidth: 100,
    // frozenCells: {
    //   start: {
    //     row: 1,
    //     col: 1
    //   },
    // },
  };
  const rows: Row[] = [];
  const cols: Col[] = [];

  for (let index = 0; index < options.numberOfRows; index++) {
    rows.push(new Row(index + 1, index, 25, options.defaultRowHeight));
  }

  for (let index = 0; index < options.numberOfCols; index++) {
    const startCharCode = 'A'.charCodeAt(0);
    const letter = String.fromCharCode(startCharCode + index);

    cols.push(new Col(letter, index, 60, options.defaultColWidth));
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
