import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from './options';
import 'tippy.js/dist/tippy.css';
import './tippy.scss';
import Spreadsheet, { ISpreadsheetConstructor } from './Spreadsheet';
import { defaultStyles, IStyles } from './styles';
import events from './events';
import { ConfigParams, HyperFormula } from 'hyperformula';
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map';
import Toolbar from './toolbar/Toolbar';
import FormulaBar from './formulaBar/FormulaBar';
import Exporter from './Exporter';
import getHyperformulaConfig from './getHyperformulaConfig';
import BottomBar from './bottomBar/BottomBar';
import { ISheetData } from './sheet/Sheet';

export default {
  title: 'Spreadsheet',
} as Meta;

// TODO: Fix to be optional styles + options
interface IArgs {
  options: IOptions;
  styles: IStyles;
  data?: ISheetData[];
}

const getSpreadsheet = (params: ISpreadsheetConstructor) => {
  const spreadsheet = new Spreadsheet(params);

  spreadsheet.eventEmitter.on(events.sheet.setData, (_, __, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done();
    }, 500);
  });

  return spreadsheet;
};

const getHyperformulaInstance = (config?: Partial<ConfigParams>) => {
  return HyperFormula.buildEmpty({
    ...getHyperformulaConfig(),
    ...config,
    licenseKey: 'gpl-v3',
  });
};

const buildOnlySpreadsheet = (args: IArgs, config?: Partial<ConfigParams>) => {
  const hyperformula = getHyperformulaInstance(config);
  const options = args.options;
  const styles = args.styles;
  const data = args.data;

  const spreadsheet = getSpreadsheet({
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

const buildSpreadsheetWithEverything = (
  args: IArgs,
  config?: Partial<ConfigParams>
) => {
  const hyperformula = getHyperformulaInstance(config);
  const options = args.options;
  const styles = args.styles;
  const data = args.data;

  const toolbar = new Toolbar();
  const formulaBar = new FormulaBar();
  const exporter = new Exporter();
  const bottomBar = new BottomBar();

  const spreadsheet = getSpreadsheet({
    hyperformula,
    options,
    styles,
    data,
    toolbar,
    formulaBar,
    bottomBar,
    exporter,
  });

  spreadsheet.spreadsheetEl.prepend(formulaBar.formulaBarEl);
  spreadsheet.spreadsheetEl.prepend(toolbar.toolbarEl);
  spreadsheet.spreadsheetEl.appendChild(bottomBar.bottomBarEl);

  return spreadsheet.spreadsheetEl;
};

const Template: Story<IArgs> = (args) => {
  return buildSpreadsheetWithEverything(args);
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
    {
      sheetName: 'Frozen Cells',
      frozenCells: {
        row: 3,
        col: 3,
      },
    },
  ],
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: [
    {
      sheetName: 'Merged Cells',
      cellsData: {
        '4_0': {
          value: 'Merged Cells Sheet',
        },
        '10_1': {
          value: 'Another value',
        },
      },
      mergedCells: {
        '3_1': {
          row: {
            x: 3,
            y: 5,
          },
          col: {
            x: 1,
            y: 1,
          },
        },
      },
    },
  ],
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: [
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
};

const MillionRowsTemplate: Story<IArgs> = (args) => {
  args.options.row.amount = 1_000_000;

  return buildSpreadsheetWithEverything(args, {
    maxRows: args.options.row.amount,
  });
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
    {
      sheetName: 'One Million Rows',
    },
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

const OnlySpreadsheetTemplate: Story<IArgs> = (args) => {
  return buildOnlySpreadsheet(args);
};

export const OnlySpreadsheet = OnlySpreadsheetTemplate.bind({});

const AllCurrencySymbolsTemplate: Story<IArgs> = (args) => {
  return buildSpreadsheetWithEverything(args, {
    currencySymbol: Object.values(currencySymbolMap),
  });
};

const MultipleSpreadsheetsTemplate: Story = () => {
  const firstSpreadsheetArgs: IArgs = {
    ...defaultStoryArgs,
    data: [
      {
        sheetName: 'First Spreadsheet Sheet',
      },
    ],
  };

  const secondSpreadsheetArgs: IArgs = {
    ...defaultStoryArgs,
    data: [
      {
        sheetName: 'Second Spreadsheet Sheet',
      },
    ],
  };

  const firstSpreadsheetEl =
    buildSpreadsheetWithEverything(firstSpreadsheetArgs);
  const secondSpreadsheetEl = buildSpreadsheetWithEverything(
    secondSpreadsheetArgs
  );

  const containerEl = document.createElement('div');

  containerEl.appendChild(firstSpreadsheetEl);
  containerEl.appendChild(secondSpreadsheetEl);

  return containerEl;
};

export const MultipleSpreadsheets = MultipleSpreadsheetsTemplate.bind({});

export const AllCurrencySymbols = AllCurrencySymbolsTemplate.bind({});

AllCurrencySymbols.args = {
  ...defaultStoryArgs,
  data: [
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
};

export const CellsData = Template.bind({});

CellsData.args = {
  ...defaultStoryArgs,
  data: [
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
            borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
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
};

export const Formulas = Template.bind({});

Formulas.args = {
  ...defaultStoryArgs,
  data: [
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
};
