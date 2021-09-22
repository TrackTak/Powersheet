import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from './options';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import Spreadsheet from './Spreadsheet';
import { IData } from './sheetsGroup/sheet/Sheet';
import { defaultStyles, IStyles } from './styles';

export default {
  title: 'Spreadsheet',
} as Meta;

// TODO: Fix to be optional styles + options
interface IArgs {
  options: IOptions;
  styles: IStyles;
  data?: IData[][];
}

const buildSpreadsheet = (args: IArgs) => {
  const options = args.options;
  const styles = args.styles;
  const data = args.data;

  const spreadsheet = new Spreadsheet({
    options,
    styles,
    data,
  });

  return spreadsheet.spreadsheetEl;
};

const Template: Story<IArgs> = (args) => {
  return buildSpreadsheet(args);
};

const defaultStoryArgs: IArgs = {
  options: defaultOptions,
  styles: defaultStyles,
};

export const Default = Template.bind({});

Default.args = defaultStoryArgs;

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
        sheetName: 'Frozen Cells',
        frozenCells: {
          row: 3,
          col: 2,
        },
      },
    ],
  ],
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
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
    ],
  ],
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
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
            100: 100,
          },
        },
      },
    ],
  ],
};

export const MillionRows = Template.bind({});

MillionRows.args = {
  ...defaultStoryArgs,
  styles: {
    ...defaultStyles,
    rowHeader: {
      ...defaultStyles.rowHeader,
      rect: {
        width: 50,
      },
    },
  },
  options: {
    ...defaultOptions,
    row: {
      ...defaultOptions.row,
      amount: 1000000,
    },
  },
  data: [
    [
      {
        sheetName: 'Million Rows',
      },
    ],
  ],
};

export const CustomStyles = Template.bind({});

CustomStyles.args = {
  ...defaultStoryArgs,
  styles: {
    ...defaultStyles,
    gridLine: {
      ...defaultStyles.gridLine,
      stroke: '#add8e6',
    },
    selection: {
      ...defaultStyles.cell,
      fill: 'orange',
    },
  },
};

export const CellsData = Template.bind({});

CellsData.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
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
              horizontalTextAlign: 'center',
              verticalTextAlign: 'middle',
              bold: true,
              italic: true,
              textWrap: 'wrap',
            },
            comment: 'Powersheet is the best',
            value:
              'A very long piece of text that should wrap to the next line on the word.',
          },
          '3_3': {
            style: {
              borders: [
                'borderBottom',
                'borderRight',
                'borderTop',
                'borderLeft',
              ],
              backgroundColor: 'yellow',
            },
          },
          '4_1': {
            style: {
              underline: true,
              strikeThrough: true,
              fontSize: 14,
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
          '40_4': {
            value: 'Cell Value',
          },
        },
      },
    ],
  ],
};

export const Formulas = Template.bind({});

Formulas.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
        sheetName: 'Formulas',
        cellsData: {
          '0_1': {
            value: '5',
            style: {
              textFormatPattern: '#,##0.00',
            },
          },
          '1_1': {
            value: '2',
            style: {
              textFormatPattern: '#,##0.00',
            },
          },
          '2_1': {
            value: '=SUM(B1, B2)',
            style: {
              textFormatPattern: '#,##0.00',
            },
          },
          '2_0': {
            value: 'SUM',
          },
          '4_0': {
            value: 'Cross Sheet Reference',
          },
          '4_1': {
            value: "='Other'!A1 * 30",
            style: {
              textFormatPattern: '#,##0.00',
            },
          },
        },
      },
      {
        sheetName: 'Other',
        cellsData: {
          '0_0': {
            value: '100',
            style: {
              textFormatPattern: '#,##0.00',
            },
          },
        },
      },
    ],
  ],
};
