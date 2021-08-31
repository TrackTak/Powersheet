import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';
import EventEmitter from 'eventemitter3';
import { defaultOptions, IOptions } from '../../options';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';

export default {
  title: 'Canvas',
} as Meta;

const createCanvas = (args: IOptions) => {
  const eventEmitter = new EventEmitter();
  const options = args;

  const canvas = new Canvas({
    options,
    eventEmitter,
  });

  const container = document.createElement('div');

  container.appendChild(canvas.container);

  return {
    canvas,
    container,
  };
};

const Template: Story<IOptions> = (args) => {
  return createCanvas(args).container;
};

const MergeTemplate: Story<IOptions> = (args) => {
  const { container, canvas } = createCanvas(args);

  const merge = document.createElement('button');

  merge.innerHTML = 'Merge Cell';
  merge.onclick = () => {
    canvas.merger.mergeSelectedCells();
  };

  const unmerge = document.createElement('button');

  unmerge.innerHTML = 'Unmerge Cell';
  unmerge.onclick = () => {
    canvas.merger.unMergeSelectedCells();
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
    row: 0,
    col: 0,
  },
};

export const MergedCells = MergeTemplate.bind({});

MergedCells.args = {
  ...defaultOptions,
  mergedCells: [
    {
      start: {
        row: 3,
        col: 1,
      },
      end: {
        row: 4,
        col: 2,
      },
    },
  ],
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultOptions,
  col: {
    ...defaultOptions.col,
    sizes: {
      '3': 70,
    },
  },
  row: {
    ...defaultOptions.row,
    sizes: {
      '1': 250,
      '5': 100,
    },
  },
};
