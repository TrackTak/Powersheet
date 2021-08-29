import { Story, Meta } from '@storybook/html';
import Canvas from './sheetsGroup/sheet/Canvas';
import EventEmitter from 'eventemitter3';
import { defaultOptions, IOptions } from './options';
import Toolbar from './toolbar/Toolbar';
import { HyperFormula } from 'hyperformula';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';

export default {
  title: 'Spreadsheet',
} as Meta;

const buildSpreadsheet = (args: IOptions) => {
  const spreadsheet = document.createElement('div');
  const registeredFunctionNames =
    HyperFormula.getRegisteredFunctionNames('enGB');
  const eventEmitter = new EventEmitter();
  const options = args;

  const toolbar = new Toolbar({
    registeredFunctionNames,
    options,
    eventEmitter,
  });

  const canvas = new Canvas({
    toolbar,
    options,
    eventEmitter,
  });

  spreadsheet.appendChild(toolbar.toolbarEl);
  spreadsheet.appendChild(canvas.container);

  return {
    canvas,
    spreadsheet,
  };
};

const Template: Story<IOptions> = (args) => {
  return buildSpreadsheet(args).spreadsheet;
};

const MergeTemplate: Story<IOptions> = (args) => {
  const { spreadsheet, canvas } = buildSpreadsheet(args);

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

  spreadsheet.appendChild(merge);
  spreadsheet.appendChild(unmerge);
  spreadsheet.appendChild(canvas.container);

  return spreadsheet;
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
