import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from './options';
import { HyperFormula } from 'hyperformula';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import Spreadsheet from './Spreadsheet';
import { ISheetsData } from './sheetsGroup/sheet/Sheet';

export default {
  title: 'Spreadsheet',
} as Meta;

interface IArgs {
  options: IOptions;
  data?: ISheetsData;
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
  data: {
    FrozenCells: {
      sheetName: 'Frozen Cells',
      frozenCells: {
        row: 0,
        col: 0,
      },
    },
  },
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: {
    MergedCells: {
      sheetName: 'Merged Cells',
      mergedCells: [
        {
          row: {
            x: 5,
            y: 5,
          },
          col: {
            x: 1,
            y: 3,
          },
        },
      ],
    },
  },
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: {
    DifferentSizeCells: {
      sheetName: 'Different Size Cells',
      col: {
        sizes: {
          3: 70,
        },
      },
      row: {
        sizes: {
          1: 250,
          5: 100,
        },
      },
    },
  },
};

export const CellsData = Template.bind({});

CellsData.args = {
  ...defaultStoryArgs,
  data: {
    CellsData: {
      sheetName: 'Cells Data',
      cellsData: {
        '1_0': {
          style: {
            horizontalTextAlign: 'right',
            verticalTextAlign: 'bottom',
            backgroundColor: 'red',
            fontColor: '#ffeb3b',
          },
          value: 'HI!',
        },
        '1_1': {
          style: {
            textWrap: 'wrap',
            horizontalTextAlign: 'center',
            verticalTextAlign: 'middle',
            bold: true,
            italic: true,
          },
          comment: 'Powersheet is the best',
          value:
            'A very long piece of text that should wrap to the next line on the word.',
        },
        '3_3': {
          style: {
            borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
            backgroundColor: 'yellow',
          },
        },
        '4_1': {
          style: {
            underline: true,
            strikeThrough: true,
            fontSize: 36,
            borders: ['borderBottom'],
          },
          value: 'Some value',
        },
        '4_4': {
          style: {
            textFormatPattern: '0.00%',
          },
          value: '0.05',
        },
      },
    },
  },
};

export const Formulas = Template.bind({});

Formulas.args = {
  ...defaultStoryArgs,
  data: {
    Formulas: {
      sheetName: 'Formulas',
      cellsData: {
        '0_1': {
          value: '5',
        },
        '1_1': {
          value: '2',
        },
        '2_1': {
          value: '=SUM(B1, B2)',
        },
        '2_0': {
          value: 'SUM',
        },
        '4_0': {
          value: 'Cross Sheet Reference',
        },
        '4_1': {
          value: "='Other'!A1 * 30",
        },
      },
    },
    Other: {
      sheetName: 'Other',
      cellsData: {
        '0_0': {
          value: '100',
        },
      },
    },
  },
};
