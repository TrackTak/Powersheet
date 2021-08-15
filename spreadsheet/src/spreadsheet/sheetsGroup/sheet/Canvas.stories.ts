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

  const container = document.createElement('div');
  const btn = document.createElement('button');

  btn.innerHTML = 'Merge Cell';
  btn.onclick = () => canvas.mergeCells();

  container.appendChild(btn);
  container.appendChild(canvas.container);

  return container;
};

export const Default = Template.bind({});

Default.args = defaultOptions;

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  ...defaultOptions,
  frozenCells: {
    row: 1,
    col: 0,
  },
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultOptions,
  mergedCells: {
    // Removes the horizontal lines at index row for each line index
    row: {
      0: [0, 4],
    },
    // Removes the vertical lines at index col for each index
    col: {},
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
