import SimpleCellAddress from '../spreadsheet/sheets/cells/cell/SimpleCellAddress'
import { Story, Meta } from '@storybook/html'
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map'
import TouchEmulator from 'hammer-touchemulator'
import { merge } from 'lodash'
import {
  ICellMetadata,
  ICellStyles,
  ISheetMetadata
} from '../spreadsheet/sheets/Data'
import { defaultOptions } from '..'
import {
  DataRawCellContent,
  HyperFormula,
  Sheets
} from '@tracktak/hyperformula'
import {
  getTTFinancialPlugin,
  finTranslations
  // @ts-ignore
} from './mocks/getTTFinancialPlugin'
import realExampleDataJSON from './mocks/realExampleData.json'
import mockFinancialDataJSON from './mocks/mockFinancialData.json'
import {
  buildOnlySpreadsheet,
  buildSpreadsheetWithEverything,
  getEmptyHyperformulaInstance,
  getHyperformulaInstance,
  IArgs,
  Template
} from './helpers'
import type { GenericSheets } from '@tracktak/hyperformula/typings/Sheet'
import type { GenericDataRawCellContent } from '@tracktak/hyperformula/typings/CellContentParser'

const realExampleData = realExampleDataJSON as
  | GenericSheets<DataRawCellContent, Partial<ISheetMetadata>>
  | undefined

export default {
  title: 'Spreadsheet'
} as Meta

export const Default = Template.bind({})

export const FrozenCells = Template.bind({})

FrozenCells.args = {
  sheets: {
    'Frozen Cells': {
      cells: [],
      sheetMetadata: {
        frozenRow: 2,
        frozenCol: 2
      }
    }
  }
}

export const MergedCells = Template.bind({})

MergedCells.args = {
  sheets: {
    'Merged Cells': {
      cells: [
        [],
        [],
        [],
        [
          {
            cellValue: undefined
          },
          {
            cellValue: 'Merged Cell',
            metadata: {
              fontSize: 14,
              bold: true,
              horizontalTextAlign: 'center'
            }
          }
        ],
        [
          {
            cellValue: undefined
          },
          {
            cellValue: 'Merged Cell',
            metadata: {
              fontSize: 14,
              bold: true,
              horizontalTextAlign: 'center'
            }
          }
        ]
      ],
      sheetMetadata: {
        mergedCells: {
          '0_3_1': {
            width: 1,
            height: 2
          }
        },
        associatedMergedCells: {
          '0_4_1': '0_3_1'
        }
      }
    }
  }
}

export const DifferentSizeCells = Template.bind({})

DifferentSizeCells.args = {
  sheets: {
    'Different Size Cells': {
      cells: [],
      sheetMetadata: {
        rowSizes: {
          0: 50,
          2: 100
        },
        colSizes: {
          0: 200
        }
      }
    }
  }
}

const MobileTemplate: Story<IArgs> = args => {
  const spreadsheet = buildSpreadsheetWithEverything(
    args,
    getEmptyHyperformulaInstance()
  )

  TouchEmulator.start()

  return spreadsheet.spreadsheetEl
}

export const Mobile = MobileTemplate.bind({})

const MillionRowsTemplate: Story<IArgs> = args => {
  const newArgs = merge({}, args, {
    options: {
      row: {
        amount: 1_000_000
      }
    }
  })

  return buildSpreadsheetWithEverything(
    newArgs,
    getEmptyHyperformulaInstance({
      maxRows: newArgs.options.row.amount
    })
  ).spreadsheetEl
}

export const MillionRows = MillionRowsTemplate.bind({})

MillionRows.args = {
  styles: {
    row: {
      headerRect: {
        width: 50
      }
    }
  }
}

export const CustomStyles = Template.bind({})

CustomStyles.args = {
  styles: {
    row: {
      gridLine: {
        stroke: '#add8e6'
      }
    },
    selection: {
      fill: 'orange',
      opacity: 0.3
    }
  }
}

export const CustomOptions = Template.bind({})

CustomOptions.args = {
  sheets: {
    'Custom Options': {
      cells: [
        [
          {
            cellValue: '20000000',
            metadata: {
              textFormatPattern: '$#,##0.##'
            }
          },
          {
            cellValue: '20000000',
            metadata: {
              textFormatPattern: '#,###.##,,'
            }
          },
          {
            cellValue: '20000000',
            metadata: {
              textFormatPattern: '$#,###.##,,',
              fontSize: 32
            }
          }
        ]
      ]
    }
  },
  options: {
    textPatternFormats: {
      currency: '$#,##0.##',
      million: '#,###.##,,',
      'million-currency': '$#,###.##,,'
    },
    fontSizes: [4, 32]
  }
}

const OnlySpreadsheet: Story<IArgs> = args => {
  return buildOnlySpreadsheet(args, getEmptyHyperformulaInstance())
    .spreadsheetEl
}

export const BareMinimumSpreadsheet = OnlySpreadsheet.bind({})

export const CustomSizeSpreadsheet = Template.bind({})

CustomSizeSpreadsheet.args = {
  options: {
    ...defaultOptions,
    width: 500,
    height: 700
  }
}

const MultipleSpreadsheetsTemplate: Story = () => {
  const hyperformula = getEmptyHyperformulaInstance()

  const firstSpreadsheetEl = buildSpreadsheetWithEverything(
    undefined,
    hyperformula
  )
  const secondSpreadsheetEl = buildSpreadsheetWithEverything(
    undefined,
    hyperformula
  )

  const containerEl = document.createElement('div')

  containerEl.appendChild(firstSpreadsheetEl.spreadsheetEl)
  containerEl.appendChild(secondSpreadsheetEl.spreadsheetEl)

  containerEl.style.height = '50%'

  return containerEl
}

export const MultipleSpreadsheets = MultipleSpreadsheetsTemplate.bind({})

const AllCurrencySymbolsTemplate: Story<IArgs> = args => {
  return buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance(args.sheets!, {
      currencySymbol: Object.values(currencySymbolMap)
    })
  ).spreadsheetEl
}

export const AllCurrencySymbols = AllCurrencySymbolsTemplate.bind({})

AllCurrencySymbols.args = {
  options: {
    textPatternFormats: {
      usCurrency: '$#,##0.##',
      israeliCurrency: '₪#,##0.##',
      gbpCurrency: '£#,##0.##'
    }
  },
  sheets: {
    'All Currency Symbols': {
      cells: [
        [
          {
            cellValue: '$33334.33',
            metadata: {
              textFormatPattern: '$#,##0.##'
            }
          },
          {
            cellValue: '₪22.2',
            metadata: {
              textFormatPattern: '₪#,##0.##'
            }
          },
          {
            cellValue: '£33.3',
            metadata: {
              textFormatPattern: '£#,##0.##'
            }
          },
          {
            cellValue: '=A1+B1+C1',
            metadata: {
              textFormatPattern: '#,##0.##'
            }
          }
        ]
      ]
    }
  }
}

export const CellsData = Template.bind({})

CellsData.args = {
  data: {
    exportSpreadsheetName: 'Cells Datas.xlsx'
  },
  sheets: {
    'Cells Data': {
      cells: [
        [
          {
            cellValue: '=2/0'
          },
          {
            cellValue: 'HI!',
            metadata: {
              horizontalTextAlign: 'right',
              verticalTextAlign: 'bottom',
              backgroundColor: 'red',
              fontColor: '#ffeb3b'
            }
          },
          {
            cellValue:
              'A very long piece of text that should wrap to the next line on the word.',
            metadata: {
              comment: 'Powersheet is the best',
              horizontalTextAlign: 'center',
              verticalTextAlign: 'middle',
              bold: true,
              italic: true,
              textWrap: 'wrap'
            }
          },
          {
            cellValue: undefined,
            metadata: {
              borders: [
                'borderBottom',
                'borderRight',
                'borderTop',
                'borderLeft'
              ],
              backgroundColor: 'yellow'
            }
          },
          {
            cellValue: 'Some value',
            metadata: {
              underline: true,
              strikeThrough: true,
              fontSize: 14,
              borders: ['borderBottom']
            }
          },
          {
            cellValue: '0.05',
            metadata: {
              textFormatPattern: '0.00%'
            }
          },
          {
            cellValue: 'Cell Value'
          }
        ]
      ]
    }
  }
}

export const Formulas = Template.bind({})

Formulas.args = {
  sheets: {
    Formulas: {
      cells: [
        [
          {
            cellValue: '5',
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          },
          {
            cellValue: '2',
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          },
          {
            cellValue: 'SUM',
            metadata: {
              comment: 'Powersheet is the best',
              horizontalTextAlign: 'center',
              verticalTextAlign: 'middle',
              bold: true,
              italic: true,
              textWrap: 'wrap'
            }
          },
          {
            cellValue: '=SUM(A1, A2)',
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          },
          {
            cellValue: 'Cross Sheet Reference',
            metadata: {
              underline: true,
              strikeThrough: true,
              fontSize: 14,
              borders: ['borderBottom']
            }
          },
          {
            cellValue: "='Other'!A1 * 30",
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          },
          {
            cellValue: '100',
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          }
        ]
      ]
    },
    Other: {
      cells: [
        [
          {
            cellValue: '100',
            metadata: {
              textFormatPattern: '#,##0.00'
            }
          }
        ]
      ]
    }
  }
}

const RealExampleTemplate: Story<IArgs> = args => {
  let FinancialPlugin = getTTFinancialPlugin()

  HyperFormula.registerFunctionPlugin(FinancialPlugin, finTranslations)

  const spreadsheet = buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance(args.sheets!),
    [
      {
        // @ts-ignore
        implementedFunctions: FinancialPlugin.implementedFunctions,
        aliases: FinancialPlugin.aliases
      }
    ]
  )

  // Simulate API call
  setTimeout(() => {
    FinancialPlugin = getTTFinancialPlugin(mockFinancialDataJSON)

    HyperFormula.unregisterFunctionPlugin(FinancialPlugin)
    HyperFormula.registerFunctionPlugin(FinancialPlugin, finTranslations)

    spreadsheet?.render(true)
  }, 2000)

  return spreadsheet.spreadsheetEl
}

export const RealExample = RealExampleTemplate.bind({})

RealExample.args = {
  sheets: realExampleData,
  options: {
    textPatternFormats: {
      currency: '$#,##0.##',
      million: '#,###.##,,',
      'million-currency': '$#,###.##,,'
    }
  }
}

const SpreadsheetPerformanceTemplate: Story<IArgs> = () => {
  const cells: GenericDataRawCellContent<ICellMetadata>[][] = []

  const cell: Partial<ICellStyles> = {
    comment: 'Performance of each cell',
    fontColor: 'white',
    fontSize: 13,
    textWrap: 'wrap',
    underline: true,
    strikeThrough: true,
    bold: true,
    italic: true,
    horizontalTextAlign: 'center',
    verticalTextAlign: 'middle'
  }

  const getRandomBackgroundColor = () => {
    const x = Math.floor(Math.random() * 256)
    const y = Math.floor(Math.random() * 256)
    const z = Math.floor(Math.random() * 256)

    const backgroundColor = 'rgb(' + x + ',' + y + ',' + z + ')'

    return backgroundColor
  }

  for (let ri = 0; ri <= defaultOptions.row.amount; ri++) {
    const row: GenericDataRawCellContent<ICellMetadata>[] = []

    for (let ci = 0; ci <= defaultOptions.col.amount; ci++) {
      const simpleCellAddress = new SimpleCellAddress(0, ri, ci)

      row.push({
        cellValue: simpleCellAddress.addressToString(),
        metadata: {
          ...cell,
          backgroundColor: getRandomBackgroundColor()
        }
      })
    }

    cells.push(row)
  }

  const sheets: Sheets = {
    Performance: {
      cells
    }
  }

  return buildSpreadsheetWithEverything(
    { sheets },
    getHyperformulaInstance(sheets)
  ).spreadsheetEl
}

export const SpreadsheetPerformance = SpreadsheetPerformanceTemplate.bind({})
