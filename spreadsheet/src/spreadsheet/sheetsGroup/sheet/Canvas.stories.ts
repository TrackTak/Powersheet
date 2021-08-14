import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import EventEmitter from 'eventemitter3';
import { defaultOptions, IOptions } from '../../options';

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

Default.args = defaultOptions;

export const FreezeCells = Template.bind({});

FreezeCells.args = {
  ...defaultOptions,
  frozenCells: {
    row: 1,
    col: 0,
  },
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultOptions,
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
