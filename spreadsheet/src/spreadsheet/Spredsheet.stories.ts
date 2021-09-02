import { Story, Meta } from '@storybook/html';
import Sheet from './sheetsGroup/sheet/Sheet';
import EventEmitter from 'eventemitter3';
import { defaultOptions, IOptions } from './options';
import Toolbar from './toolbar/Toolbar';
import { HyperFormula } from 'hyperformula';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import FormulaBar from './formulaBar/FormulaBar';

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

  const formulaBar = new FormulaBar();

  const sheet = new Sheet({
    toolbar,
    options,
    eventEmitter,
  });

  spreadsheet.appendChild(toolbar.toolbarEl);
  spreadsheet.appendChild(formulaBar.formulaBarEl);
  spreadsheet.appendChild(sheet.container);

  return {
    sheet,
    spreadsheet,
  };
};

const Template: Story<IOptions> = (args) => {
  return buildSpreadsheet(args).spreadsheet;
};

const defaultStoryArgs: IOptions = {
  ...defaultOptions,
  devMode: false,
};

export const Default = Template.bind({});

Default.args = defaultStoryArgs;

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  ...defaultStoryArgs,
  frozenCells: {
    row: 0,
    col: 0,
  },
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  mergedCells: [
    {
      row: {
        x: 3,
        y: 4,
      },
      col: {
        x: 1,
        y: 2,
      },
    },
  ],
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  col: {
    ...defaultStoryArgs.col,
    sizes: {
      '3': 70,
    },
  },
  row: {
    ...defaultStoryArgs.row,
    sizes: {
      '1': 250,
      '5': 100,
    },
  },
};
