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
import TouchEmulator from 'hammer-touchemulator';
import { action } from '@storybook/addon-actions';
import EventEmitter from 'eventemitter3';
import { merge, throttle } from 'lodash';
import { ISpreadsheetData } from './sheet/Data';

export default {
  title: 'Spreadsheet',
} as Meta;

// TODO: Fix to be optional styles + options
interface IArgs {
  options: IOptions;
  styles: IStyles;
  data?: Partial<ISpreadsheetData>;
}

const eventLog = (event: string, ...args: any[]) => {
  action(event)(...args);
};

const getSpreadsheet = (params: Partial<ISpreadsheetConstructor>) => {
  TouchEmulator.stop();

  const eventEmitter = new EventEmitter();

  const oldEmit = eventEmitter.emit;

  // Throttling storybooks action log so that it doesn't
  // reduce FPS by 10-15~ on resize and scroll
  const throttledEventLog = throttle(eventLog, 250);

  eventEmitter.emit = function <
    T extends EventEmitter.EventNames<string | symbol>
  >(event: T, ...args: any[]) {
    throttledEventLog(event.toString(), ...args);

    oldEmit.call(eventEmitter, event, ...args);

    return true;
  };

  eventEmitter.on(events.sheet.setData, (_, __, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done();
    }, 500);
  });

  const spreadsheet = new Spreadsheet({
    eventEmitter,
    ...params,
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

const buildOnlySpreadsheet = (args: IArgs) => {
  const options = args.options;
  const styles = args.styles;
  const data = args.data;

  const spreadsheet = getSpreadsheet({
    options,
    styles,
    data,
  });

  return spreadsheet.spreadsheetEl;
};

const buildSpreadsheetWithEverything = (
  args: IArgs,
  hyperformula?: HyperFormula
) => {
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

const buildSpreadsheetWithHyperformula = (
  args: IArgs,
  config?: Partial<ConfigParams>
) => {
  const hyperformula = getHyperformulaInstance({
    ...config,
  });

  return buildSpreadsheetWithEverything(args, hyperformula);
};

const Template: Story<IArgs> = (args) => {
  return buildSpreadsheetWithHyperformula(args);
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Frozen Cells',
      },
    },
    frozenCells: {
      0: {
        id: 0,
        row: 2,
        col: 2,
      },
    },
  },
};

export const MergedCells = Template.bind({});

MergedCells.args = {
  ...defaultStoryArgs,
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Merged Cells',
      },
    },
    mergedCells: {
      '0_3_1': {
        id: '0_3_1',
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
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  ...defaultStoryArgs,
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Different Size Cells',
      },
    },
    rows: {
      '0_0': {
        id: '0_0',
        size: 250,
      },
    },
  },
};

const MobileTemplate: Story<IArgs> = (args) => {
  const spreadsheet = buildSpreadsheetWithHyperformula(args);

  TouchEmulator.start();

  return spreadsheet;
};

export const Mobile = MobileTemplate.bind({});

const MillionRowsTemplate: Story<IArgs> = (args) => {
  const newArgs = merge({}, args, {
    options: {
      row: {
        amount: 1_000_000,
      },
    },
  });

  return buildSpreadsheetWithHyperformula(newArgs, {
    maxRows: newArgs.options.row.amount,
  });
};

export const MillionRows = MillionRowsTemplate.bind({});

MillionRows.args = {
  ...defaultStoryArgs,
  styles: {
    ...defaultStyles,
    row: {
      ...defaultStyles.row,
      headerRect: {
        ...defaultStyles.row.headerRect,
        width: 50,
      },
    },
  },
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'One Million Rows',
      },
    },
  },
};

export const CustomStyles = Template.bind({});

CustomStyles.args = {
  ...defaultStoryArgs,
  styles: {
    ...defaultStyles,
    row: {
      ...defaultStyles.row,
      gridLine: {
        ...defaultStyles.row.gridLine,
        stroke: '#add8e6',
      },
    },
    selection: {
      ...defaultStyles.cell,
      fill: 'orange',
      opacity: 0.3,
    },
  },
};

const OnlySpreadsheet: Story<IArgs> = (args) => {
  return buildOnlySpreadsheet(args);
};

export const BareMinimumSpreadsheet = OnlySpreadsheet.bind({});

const NoHyperformulaTemplate: Story<IArgs> = (args) => {
  return buildSpreadsheetWithEverything(args);
};

export const NoHyperformula = NoHyperformulaTemplate.bind({});

export const CustomSizeSpreadsheet = Template.bind({});

CustomSizeSpreadsheet.args = {
  ...defaultStoryArgs,
  options: {
    ...defaultOptions,
    width: 500,
    height: 700,
  },
};

const AllCurrencySymbolsTemplate: Story<IArgs> = (args) => {
  return buildSpreadsheetWithHyperformula(args, {
    currencySymbol: Object.values(currencySymbolMap),
  });
};

const MultipleSpreadsheetsTemplate: Story = () => {
  const firstSpreadsheetArgs: IArgs = {
    ...defaultStoryArgs,
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'First Spreadsheet',
        },
      },
    },
  };

  const secondSpreadsheetArgs: IArgs = {
    ...defaultStoryArgs,
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'Second Spreadsheet',
        },
      },
    },
  };

  const firstSpreadsheetEl =
    buildSpreadsheetWithHyperformula(firstSpreadsheetArgs);
  const secondSpreadsheetEl = buildSpreadsheetWithHyperformula(
    secondSpreadsheetArgs
  );

  const containerEl = document.createElement('div');

  containerEl.appendChild(firstSpreadsheetEl);
  containerEl.appendChild(secondSpreadsheetEl);

  containerEl.style.height = '50%';

  return containerEl;
};

export const MultipleSpreadsheets = MultipleSpreadsheetsTemplate.bind({});

export const AllCurrencySymbols = AllCurrencySymbolsTemplate.bind({});

AllCurrencySymbols.args = {
  ...defaultStoryArgs,
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'All Currency Symbols',
      },
    },
    cells: {
      '0_1_0': {
        id: '0_1_0',
        value: '$33334.33',
      },
      '0_1_1': {
        id: '0_1_1',
        value: '₪22.2',
      },
      '0_3_3': {
        id: '0_3_3',
        value: '£33.3',
      },
      '0_4_1': {
        id: '0_4_1',
        value: '=A2+B2+D4',
      },
    },
  },
};

export const CellsData = Template.bind({});

CellsData.args = {
  ...defaultStoryArgs,
  data: {
    exportSpreadsheetName: 'Cells Datas.xlsx',
    sheets: {
      0: {
        id: 0,
        sheetName: 'Cells Data',
      },
    },
    cellStyles: {
      '0_1_0': {
        id: '0_1_0',
        horizontalTextAlign: 'right',
        verticalTextAlign: 'bottom',
        backgroundColor: 'red',
        fontColor: '#ffeb3b',
      },
      '0_1_1': {
        id: '0_1_1',
        horizontalTextAlign: 'center',
        verticalTextAlign: 'middle',
        bold: true,
        italic: true,
        textWrap: 'wrap',
      },
      '0_3_3': {
        id: '0_3_3',
        borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
        backgroundColor: 'yellow',
      },
      '0_4_1': {
        id: '0_4_1',
        underline: true,
        strikeThrough: true,
        fontSize: 14,
        borders: ['borderBottom'],
      },
      '0_4_4': {
        id: '0_4_4',
        textFormatPattern: '0.00%',
      },
    },
    cells: {
      '0_1_0': {
        id: '0_1_0',
        style: '0_1_0',
        value: 'HI!',
      },
      '0_1_1': {
        id: '0_1_1',
        style: '0_1_1',
        comment: 'Powersheet is the best',
        value:
          'A very long piece of text that should wrap to the next line on the word.',
      },
      '0_3_3': {
        id: '0_3_3',
        style: '0_3_3',
      },
      '0_4_1': {
        id: '0_4_1',
        style: '0_4_1',
        value: 'Some value',
      },
      '0_4_4': {
        id: '0_4_4',
        style: '0_4_4',
        value: '0.05',
      },
      '0_40_4': {
        id: '0_40_4',
        value: 'Cell Value',
      },
    },
  },
};

export const Formulas = Template.bind({});

Formulas.args = {
  ...defaultStoryArgs,
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Formulas',
      },
      1: {
        id: 1,
        sheetName: 'Other',
      },
    },
    cellStyles: {
      '0_0_1': {
        id: '0_0_1',
        textFormatPattern: '#,##0.00',
      },
      '0_1_1': {
        id: '0_1_1',
        textFormatPattern: '#,##0.00',
      },
      '0_2_1': {
        id: '0_2_1',
        textFormatPattern: '#,##0.00',
      },
      '0_4_1': {
        id: '0_4_1',
        textFormatPattern: '#,##0.00',
      },
      '1_0_0': {
        id: '1_0_0',
        textFormatPattern: '#,##0.00',
      },
    },
    cells: {
      '0_0_1': {
        id: '0_0_1',
        value: '5',
      },
      '0_1_1': {
        id: '0_1_1',
        value: '2',
      },
      '0_2_1': {
        id: '0_2_1',
        value: '=SUM(B1, B2)',
      },
      '0_2_0': {
        id: '0_2_0',
        value: 'SUM',
      },
      '0_4_0': {
        id: '0_4_0',
        value: 'Cross Sheet Reference',
      },
      '0_4_1': {
        id: '0_4_1',
        value: "='Other'!A1 * 30",
      },
      '1_0_0': {
        id: '1_0_0',
        value: '100',
      },
    },
  },
};
