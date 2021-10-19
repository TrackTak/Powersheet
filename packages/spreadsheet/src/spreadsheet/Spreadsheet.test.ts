import { AlwaysSparse, ConfigParams, HyperFormula } from 'hyperformula';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { Toolbar, FormulaBar, Exporter, BottomBar, Spreadsheet } from '..';
import { PowersheetEvents } from './PowersheetEmitter';
import { ISpreadsheetConstructor } from './Spreadsheet';

expect.extend({ toMatchImageSnapshot });

// TODO move all to common place if tests work
const buildSpreadsheetWithEverything = (
  args: any,
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

const getSpreadsheet = (
  { options, styles, data }: any,
  params: ISpreadsheetConstructor
) => {
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

  spreadsheet.eventEmitter.emit = function <U extends keyof PowersheetEvents>(
    event: U,
    ...args: Parameters<PowersheetEvents[U]>
  ) {
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

export const getHyperformulaInstance = (config?: Partial<ConfigParams>) => {
  return HyperFormula.buildEmpty({
    ...config,
    chooseAddressMappingPolicy: new AlwaysSparse(),
    // We use our own undo/redo instead
    undoLimit: 0,
    licenseKey: 'gpl-v3',
  });
};

describe('Spreadsheet', () => {
  it('test', () => {
    const spreadsheetEl = buildSpreadsheetWithEverything(
      {
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
      },
      getHyperformulaInstance()
    );

    const canvas = spreadsheetEl.getElementsByTagName('canvas')[0];
    const img = canvas.toDataURL();
    const data = img.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(data, 'base64');
    expect(buf).toMatchImageSnapshot({
      failureThreshold: 0.001,
      failureThresholdType: 'percent',
    });
  });
});
