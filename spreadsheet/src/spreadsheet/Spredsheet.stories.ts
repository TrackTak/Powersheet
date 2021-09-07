import { Story, Meta } from '@storybook/html';
import Sheet, { IData } from './sheetsGroup/sheet/Sheet';
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

interface IArgs {
  options: IOptions;
  data: IData;
}

const buildSpreadsheet = (args: IArgs) => {
  const spreadsheet = document.createElement('div');
  const registeredFunctionNames =
    HyperFormula.getRegisteredFunctionNames('enGB');
  const eventEmitter = new EventEmitter();
  const options = args.options;
  const data: IData = args.data;

  const toolbar = new Toolbar({
    registeredFunctionNames,
    data,
    options,
    eventEmitter,
  });

  const formulaBar = new FormulaBar();

  const sheet = new Sheet({
    toolbar,
    formulaBar,
    data,
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

const Template: Story<IArgs> = (args) => {
  return buildSpreadsheet(args).spreadsheet;
};

const defaultStoryArgs: IArgs = {
  options: {
    ...defaultOptions,
    devMode: true,
  },
  data: {
    frozenCells: {},
    mergedCells: [],
    cellStyles: {},
    row: {
      sizes: {},
    },
    col: {
      sizes: {},
    },
  },
};

export const Default = Template.bind({});

Default.args = defaultStoryArgs;

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  ...defaultStoryArgs,
  data: {
    ...defaultStoryArgs.data,
    frozenCells: {
      row: 0,
      col: 0,
    },
  },
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: {
    ...defaultStoryArgs.data,
    mergedCells: [
      {
        row: {
          x: 4,
          y: 5,
        },
        col: {
          x: 1,
          y: 5,
        },
      },
    ],
  },
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: {
    ...defaultStoryArgs.data,
    col: {
      ...defaultStoryArgs.data.col,
      sizes: {
        '3': 70,
      },
    },
    row: {
      ...defaultStoryArgs.data.row,
      sizes: {
        '1': 250,
        '5': 100,
      },
    },
  },
};

export const CellStyles = Template.bind({});

CellStyles.args = {
  ...defaultStoryArgs,
  data: {
    ...defaultStoryArgs.data,
    cellStyles: {
      '1_0': {
        backgroundColor: 'red',
      },
      '3_3': {
        borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
        backgroundColor: 'yellow',
      },
      '4_5': {
        borders: ['borderBottom', 'borderTop'],
      },
    },
    mergedCells: [
      {
        row: {
          x: 3,
          y: 3,
        },
        col: {
          x: 3,
          y: 4,
        },
      },
    ],
  },
};
