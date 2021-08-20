import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import EventEmitter from 'eventemitter3';
import { defaultOptions, IOptions } from '../../options';

export default {
  title: 'Canvas',
} as Meta;

const Template: Story<IOptions> = (args) => {
  const eventEmitter = new EventEmitter();
  const options = args;

  const canvas = new Canvas({
    options,
    eventEmitter,
  });

  const container = document.createElement('div');
  const merge = document.createElement('button');

  merge.innerHTML = 'Merge Cell';
  merge.onclick = () => {
    canvas.mergeSelectedCells();
  };

  const unmerge = document.createElement('button');

  unmerge.innerHTML = 'Unmerge Cell';
  unmerge.onclick = () => {
    canvas.unmergeSelectedCells();
  };

  container.appendChild(merge);
  container.appendChild(unmerge);
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
  mergedCells: [
    {
      start: {
        row: 9,
        col: 3,
      },
      end: {
        row: 14,
        col: 5,
      },
    },
    {
      start: {
        row: 7,
        col: 3,
      },
      end: {
        row: 8,
        col: 5,
      },
    },
  ],
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
