import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import Col from './Col';
import Row from './Row';
import EventEmitter from 'eventemitter3';

export default {
  title: 'spreadsheet/sheetsGroup/sheet/Canvas',
  argTypes: {},
} as Meta;

const Template: Story<{}> = () => {
  const eventEmitter = new EventEmitter();
  const rowNumber = 100;
  const columnNumber = 26;
  const defaultRowHeight = 25;
  const defaultColWidth = 100;
  const rows: Row[] = [];
  const cols: Col[] = [];

  for (let index = 0; index < rowNumber; index++) {
    rows.push(new Row(index + 1, 25));
  }

  for (let index = 0; index < columnNumber; index++) {
    cols.push(new Col(index + 1, 60));
  }

  const canvas = new Canvas({
    rows,
    cols,
    defaultRowHeight,
    defaultColWidth,
    eventEmitter,
  });

  return canvas.container;
};

export const Default = Template.bind({});

Default.args = {};
