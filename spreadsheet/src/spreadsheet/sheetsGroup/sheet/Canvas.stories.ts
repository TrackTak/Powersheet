import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../../IOptions';

export default {
  title: 'Canvas',
} as Meta;

const Template: Story<IOptions> = (args) => {
  const eventEmitter = new EventEmitter();

  const canvas = new Canvas({
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
    row: 1,
    col: 0,
  },
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultArgs,
  col: {
    minWidth: 60,
    defaultWidth: 100,
    widths: {
      '3': 70,
    },
  },
  row: {
    heights: {
      '1': 250,
      '5': 100,
    },
    minHeight: 25,
    defaultHeight: 25,
  },
};
