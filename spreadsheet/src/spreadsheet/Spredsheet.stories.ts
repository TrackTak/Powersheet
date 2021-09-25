import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from './options';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import Spreadsheet from './Spreadsheet';
import { IData } from './sheetsGroup/sheet/Sheet';
import { defaultStyles, IStyles } from './styles';
import events from './events';
import { HyperFormula } from 'hyperformula';
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map';

export default {
  title: 'Spreadsheet',
} as Meta;

const hyperformula = HyperFormula.buildEmpty({
  licenseKey: 'gpl-v3',
});

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
    hyperformula,
    options,
    styles,
    data,
  });

  spreadsheet.eventEmitter.on(events.sheet.setData, (_, __, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done();
    }, 500);
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
        mergedCells: {
          '5_1': {
            row: {
              x: 5,
              y: 5,
            },
            col: {
              x: 1,
              y: 3,
            },
          },
        },
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
          },
        },
      },
    ],
  ],
};

const MillionRowsTemplate: Story<IArgs> = (args) => {
  args.options.row.amount = 1_000_000;

  hyperformula.updateConfig({
    maxRows: args.options.row.amount,
  });

  return buildSpreadsheet(args);
};

export const MillionRows = MillionRowsTemplate.bind({});

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
  data: [
    [
      {
        sheetName: 'One Million Rows',
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

const AllCurrencySymbolsTemplate: Story<IArgs> = (args) => {
  hyperformula.updateConfig({
    currencySymbol: Object.values(currencySymbolMap),
  });

  return buildSpreadsheet(args);
};

export const AllCurrencySymbols = AllCurrencySymbolsTemplate.bind({});

AllCurrencySymbols.args = {
  ...defaultStoryArgs,
  data: [
    [
      {
        sheetName: 'Currency Symbols',
        cellsData: {
          '1_0': {
            value: '$33334.33',
          },
          '1_1': {
            value: '₪22.2',
          },
          '3_3': {
            value: '£33.3',
          },
          '4_1': {
            value: '=A2+B2+D4',
          },
        },
      },
    ],
  ],
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
