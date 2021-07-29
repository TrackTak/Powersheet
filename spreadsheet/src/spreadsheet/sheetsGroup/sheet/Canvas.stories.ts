import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import Col from './Col';
import Row from './Row';

export default {
  title: 'spreadsheet/sheetsGroup/sheet/Canvas',
  argTypes: {},
} as Meta;

const Template: Story<{}> = () => {
  const rowNumber = 100;
  const columnNumber = 26;
  const rows: Row[] = [];
  const cols: Col[] = [];

  for (let index = 0; index < rowNumber; index++) {
    rows.push(new Row(index + 1, 25, 25));
  }

  for (let index = 0; index < columnNumber; index++) {
    cols.push(new Col(index + 1, 60, 100));
  }
  const canvas = new Canvas({
    rows,
    cols,
  });

  return canvas.container;
};

export const Default = Template.bind({});

Default.args = {};
