import { CellId } from './spreadsheet/sheet/cells/cell/SimpleCellAddress';
import { Story, Meta } from '@storybook/html';
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map';
import TouchEmulator from 'hammer-touchemulator';
import { action } from '@storybook/addon-actions';
import { merge, throttle } from 'lodash';
import { ISpreadsheetData, ICellData } from './spreadsheet/sheet/Data';
import { IOptions } from './spreadsheet/options';
import { IStyles } from './spreadsheet/styles';
import { NestedPartial } from './spreadsheet/types';
import { ISpreadsheetConstructor } from './spreadsheet/Spreadsheet';
import {
  defaultOptions,
  Spreadsheet,
  Toolbar,
  FormulaBar,
  Exporter,
  BottomBar,
} from '.';
import { PowersheetEvents } from './spreadsheet/PowersheetEmitter';
import { AlwaysSparse, ConfigParams, HyperFormula } from 'hyperformula';
import realExampleDataJSON from './realExampleData.json';

const realExampleData = realExampleDataJSON as ISpreadsheetData;

export default {
  title: 'Spreadsheet',
} as Meta;

interface IArgs {
  data?: ISpreadsheetData;
  options?: NestedPartial<IOptions>;
  styles?: NestedPartial<IStyles>;
}

const eventLog = (event: string, ...args: any[]) => {
  action(event)(...args);
};

const getHyperformulaInstance = (config?: Partial<ConfigParams>) => {
  return HyperFormula.buildEmpty({
    ...config,
    chooseAddressMappingPolicy: new AlwaysSparse(),
    // We use our own undo/redo instead
    undoLimit: 0,
    licenseKey: 'gpl-v3',
  });
};

const getSpreadsheet = (
  { options, styles, data }: IArgs,
  params: ISpreadsheetConstructor
) => {
  TouchEmulator.stop();

  const spreadsheet = new Spreadsheet({
    ...params,
  });

  if (data) {
    spreadsheet.setData(data);
  }

  if (options) {
    spreadsheet.setOptions(options);
  }

  if (styles) {
    spreadsheet.setStyles(styles);
  }

  spreadsheet.initialize();

  const oldEmit = spreadsheet.eventEmitter.emit;

  // Throttling storybooks action log so that it doesn't
  // reduce FPS by 10-15~ on resize and scroll
  const throttledEventLog = throttle(eventLog, 250);

  spreadsheet.eventEmitter.emit = function <U extends keyof PowersheetEvents>(
    event: U,
    ...args: Parameters<PowersheetEvents[U]>
  ) {
    throttledEventLog(event.toString(), ...args);

    // @ts-ignore
    oldEmit.call(spreadsheet.eventEmitter, event, ...args);

    return true;
  };

  spreadsheet.eventEmitter.on('persistData', (_, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done();
    }, 500);
  });

  return spreadsheet;
};

const buildOnlySpreadsheet = (args: IArgs, hyperformula: HyperFormula) => {
  const spreadsheet = getSpreadsheet(args, {
    hyperformula,
  });

  return spreadsheet.spreadsheetEl;
};

const buildSpreadsheetWithEverything = (
  args: IArgs,
  hyperformula: HyperFormula
) => {
  const toolbar = new Toolbar();
  const formulaBar = new FormulaBar();
  const exporter = new Exporter();
  const bottomBar = new BottomBar();

  const spreadsheet = getSpreadsheet(args, {
    hyperformula,
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
  return buildSpreadsheetWithEverything(args, getHyperformulaInstance());
};

export const Default = Template.bind({});

export const FrozenCells = Template.bind({});

FrozenCells.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Frozen Cells',
        frozenCell: 0,
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Merged Cells',
        cells: {
          '0_3_1': '0_3_1',
        },
        mergedCells: {
          '0_3_1': '0_3_1',
          '0_7_1': '0_7_1',
        },
      },
    },
    cells: {
      '0_3_1': {
        value: 'Merged Cell',
        fontSize: 14,
        id: '0_3_1',
        bold: true,
        horizontalTextAlign: 'center',
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
      '0_7_1': {
        id: '0_7_1',
        row: {
          x: 7,
          y: 9,
        },
        col: {
          x: 1,
          y: 20,
        },
      },
    },
  },
};

export const DifferentSizeCells = Template.bind({});

DifferentSizeCells.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Different Size Cells',
        rows: { '0_0': '0_0', '0_2': '0_2' },
        cols: { '0_0': '0_0' },
      },
    },
    rows: {
      '0_0': {
        id: '0_0',
        size: 50,
      },
      '0_2': {
        id: '0_2',
        size: 100,
      },
    },
    cols: {
      '0_0': {
        id: '0_0',
        size: 200,
      },
    },
  },
};

const MobileTemplate: Story<IArgs> = (args) => {
  const spreadsheet = buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance()
  );

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

  return buildSpreadsheetWithEverything(
    newArgs,
    getHyperformulaInstance({
      maxRows: newArgs.options.row.amount,
    })
  );
};

export const MillionRows = MillionRowsTemplate.bind({});

MillionRows.args = {
  styles: {
    row: {
      headerRect: {
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
  styles: {
    row: {
      gridLine: {
        stroke: '#add8e6',
      },
    },
    selection: {
      fill: 'orange',
      opacity: 0.3,
    },
  },
};

export const CustomOptions = Template.bind({});

CustomOptions.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Custom Options',
        cells: {
          '0_0_1': '0_0_1',
          '0_1_1': '0_1_1',
          '0_2_1': '0_2_1',
        },
      },
    },
    cells: {
      '0_0_1': {
        id: '0_0_1',
        value: '20000000',
        textFormatPattern: '$#,##0.##',
      },
      '0_1_1': {
        id: '0_1_1',
        value: '20000000',
        textFormatPattern: '#,###.##,,',
      },
      '0_2_1': {
        id: '0_2_1',
        value: '20000000',
        textFormatPattern: '$#,###.##,,',
        fontSize: 32,
      },
    },
  },
  options: {
    textPatternFormats: {
      currency: '$#,##0.##',
      million: '#,###.##,,',
      'million-currency': '$#,###.##,,',
    },
    fontSizes: [4, 32],
  },
};

const OnlySpreadsheet: Story<IArgs> = (args) => {
  return buildOnlySpreadsheet(args, getHyperformulaInstance());
};

export const BareMinimumSpreadsheet = OnlySpreadsheet.bind({});

export const CustomSizeSpreadsheet = Template.bind({});

CustomSizeSpreadsheet.args = {
  options: {
    ...defaultOptions,
    width: 500,
    height: 700,
  },
};

const AllCurrencySymbolsTemplate: Story<IArgs> = (args) => {
  return buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance({
      currencySymbol: Object.values(currencySymbolMap),
    })
  );
};

const MultipleSpreadsheetsTemplate: Story = () => {
  const firstSpreadsheetArgs = {
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'First Spreadsheet',
        },
      },
    },
  };

  const secondSpreadsheetArgs = {
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'Second Spreadsheet',
        },
      },
    },
  };

  const hyperformula = getHyperformulaInstance();

  const firstSpreadsheetEl = buildSpreadsheetWithEverything(
    firstSpreadsheetArgs,
    hyperformula
  );
  const secondSpreadsheetEl = buildSpreadsheetWithEverything(
    secondSpreadsheetArgs,
    hyperformula
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'All Currency Symbols',
        cells: {
          '0_1_0': '0_1_0',
          '0_1_1': '0_1_1',
          '0_3_3': '0_3_3',
          '0_4_1': '0_4_1',
        },
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
  data: {
    exportSpreadsheetName: 'Cells Datas.xlsx',
    sheets: {
      0: {
        id: 0,
        sheetName: 'Cells Data',
        cells: {
          '0_1_0': '0_1_0',
          '0_1_1': '0_1_1',
          '0_3_3': '0_3_3',
          '0_4_1': '0_4_1',
          '0_4_4': '0_4_4',
          '0_40_4': '0_40_4',
        },
      },
    },
    cells: {
      '0_1_0': {
        id: '0_1_0',
        value: 'HI!',
        horizontalTextAlign: 'right',
        verticalTextAlign: 'bottom',
        backgroundColor: 'red',
        fontColor: '#ffeb3b',
      },
      '0_1_1': {
        id: '0_1_1',
        comment: 'Powersheet is the best',
        value:
          'A very long piece of text that should wrap to the next line on the word.',
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
        value: 'Some value',
        underline: true,
        strikeThrough: true,
        fontSize: 14,
        borders: ['borderBottom'],
      },
      '0_4_4': {
        id: '0_4_4',
        value: '0.05',
        textFormatPattern: '0.00%',
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Formulas',
        cells: {
          '0_0_1': '0_0_1',
          '0_1_1': '0_1_1',
          '0_2_1': '0_2_1',
          '0_2_0': '0_2_0',
          '0_4_0': '0_4_0',
          '0_4_1': '0_4_1',
        },
      },
      1: {
        id: 1,
        sheetName: 'Other',
        cells: { '1_0_0': '1_0_0' },
      },
    },
    cells: {
      '0_0_1': {
        id: '0_0_1',
        value: '5',
        textFormatPattern: '#,##0.00',
      },
      '0_1_1': {
        id: '0_1_1',
        value: '2',
        textFormatPattern: '#,##0.00',
      },
      '0_2_0': {
        id: '0_2_0',
        value: 'SUM',
      },
      '0_2_1': {
        id: '0_2_1',
        value: '=SUM(B1, B2)',
        textFormatPattern: '#,##0.00',
      },
      '0_4_0': {
        id: '0_4_0',
        value: 'Cross Sheet Reference',
      },
      '0_4_1': {
        id: '0_4_1',
        value: "='Other'!A1 * 30",
        textFormatPattern: '#,##0.00',
      },
      '1_0_0': {
        id: '1_0_0',
        value: '100',
        textFormatPattern: '#,##0.00',
      },
    },
  },
};

export const RealExample = Template.bind({});

RealExample.args = {
  data: realExampleData,
};

const SpreadsheetPerformanceTemplate: Story<IArgs> = (args) => {
  const data = args.data;

  const cell: Partial<ICellData> = {
    value: 'Performance test 0.05',
    comment: 'Performance of the each cell',
    borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
    backgroundColor: 'purple',
    fontColor: 'white',
    fontSize: 13,
    textWrap: 'wrap',
    underline: true,
    strikeThrough: true,
    bold: true,
    italic: true,
    horizontalTextAlign: 'right',
    verticalTextAlign: 'bottom',
  };

  for (let rowIndex = 0; rowIndex <= defaultOptions.row.amount; rowIndex++) {
    for (let colIndex = 0; colIndex <= defaultOptions.col.amount; colIndex++) {
      const cellId = `0_${rowIndex}_${colIndex}` as CellId;

      data!.cells![cellId] = {
        id: cellId,
        ...cell,
      };

      data!.sheets![0]!.cells![cellId] = cellId;
    }
  }

  return buildSpreadsheetWithEverything(args, getHyperformulaInstance());
};

export const SpreadsheetPerformance = SpreadsheetPerformanceTemplate.bind({});

SpreadsheetPerformance.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Spreadsheet Performance',
        cells: {},
      },
    },
    cells: {},
  },
};
