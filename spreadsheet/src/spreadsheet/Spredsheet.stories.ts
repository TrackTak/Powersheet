import { Story, Meta } from '@storybook/html';
import { IData } from './sheetsGroup/sheet/Sheet';
import { defaultOptions, IOptions } from './options';
import { HyperFormula } from 'hyperformula';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import Spreadsheet from './Spreadsheet';

export default {
  title: 'Spreadsheet',
} as Meta;

interface IArgs {
  options: IOptions;
  data?: IData[];
}

const buildSpreadsheet = (args: IArgs) => {
  const registeredFunctionNames =
    HyperFormula.getRegisteredFunctionNames('enGB');
  const options = args.options;
  const data = args.data;

  const spreadsheet = new Spreadsheet({
    registeredFunctionNames,
    options,
    data,
  });

  return spreadsheet.spreadsheetEl;
};

const Template: Story<IArgs> = (args) => {
  return buildSpreadsheet(args);
};

const defaultStoryArgs: IArgs = {
  options: {
    ...defaultOptions,
    devMode: true,
  },
};

export const Default = Template.bind({});

Default.args = defaultStoryArgs;

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  ...defaultStoryArgs,
  data: [
    {
      sheetName: 'FrozenCells',
      frozenCells: {
        row: 0,
        col: 0,
      },
    },
  ],
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: [
    {
      sheetName: 'MergedCells',
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
  ],
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: [
    {
      sheetName: 'DifferentSizeCells',
      col: {
        sizes: {
          '3': 70,
        },
      },
      row: {
        sizes: {
          '1': 250,
          '5': 100,
        },
      },
    },
  ],
};

export const CellStyles = Template.bind({});

CellStyles.args = {
  ...defaultStoryArgs,
  data: [
    {
      sheetName: 'CellStyles',
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
  ],
};
