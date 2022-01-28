import SimpleCellAddress, {
  CellId
} from '../spreadsheet/sheets/cells/cell/SimpleCellAddress'
import { Story, Meta } from '@storybook/html'
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map'
import TouchEmulator from 'hammer-touchemulator'
import { merge } from 'lodash'
import {
  ICellMetadata,
  ICellStyles,
  SerializedSheets
} from '../spreadsheet/sheets/Data'
import { defaultOptions } from '..'
import { HyperFormula } from '@tracktak/hyperformula'
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
  getHyperformulaInstance,
  IArgs,
  Template
} from './helpers'
import type { GenericDataRawCellContent } from '@tracktak/hyperformula/typings/CellContentParser'
import { addressToCellId } from '../spreadsheet/utils'

const realExampleSheets = realExampleDataJSON as SerializedSheets

export default {
  title: 'Spreadsheet'
} as Meta

export const Default = Template.bind({})

export const FrozenCells = Template.bind({})

FrozenCells.args = {
  sheets: {
    'Frozen Cells': {
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
      cells: {
        '3_1': {
          cellValue: 'Merged Cell',
          metadata: {
            fontSize: 14,
            bold: true,
            horizontalTextAlign: 'center'
          }
        }
      },
      sheetMetadata: {
        mergedCells: {
          '3_1': {
            width: 1,
            height: 2
          }
        }
      }
    }
  }
}

export const DifferentSizeCells = Template.bind({})

DifferentSizeCells.args = {
  sheets: {
    'Different Size Cells': {
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
    getHyperformulaInstance()
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
    getHyperformulaInstance(undefined, {
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
      cells: {
        '0_1': {
          cellValue: '200',
          metadata: {
            textFormatPattern: '$#,##0.##'
          }
        },
        '1_1': {
          cellValue: '20000000',
          metadata: {
            textFormatPattern: '#,###.##,,'
          }
        },
        '2_1': {
          cellValue: '20000000',
          metadata: {
            textFormatPattern: '$#,###.##,,',
            fontSize: 32
          }
        }
      }
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
  return buildOnlySpreadsheet(args, getHyperformulaInstance()).spreadsheetEl
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
  const hyperformula = getHyperformulaInstance()

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
      usCurrency: '$#,##0.00',
      israeliCurrency: '₪#,##0.00',
      gbpCurrency: '£#,##0.00'
    }
  },
  data: {
    textPatternFormats: {
      dynamicCurrency: `=\"['All Currency Symbols'!B6]\"#,##0.00`
    }
  },
  sheets: {
    'All Currency Symbols': {
      cells: {
        '1_0': {
          cellValue: '$33334.33',
          metadata: {
            textFormatPattern: '$#,##0.00'
          }
        },
        '1_1': {
          cellValue: '₪22.2',
          metadata: {
            textFormatPattern: '₪#,##0.00'
          }
        },
        '3_3': {
          cellValue: '£33.3',
          metadata: {
            textFormatPattern: '£#,##0.00'
          }
        },
        '4_1': {
          cellValue: '=A2+B2+D4',
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        },
        '5_1': {
          cellValue: 'NT$'
        }
      }
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
      cells: {
        '0_5': {
          cellValue: '=2/0'
        },
        '1_0': {
          cellValue: 'HI!',
          metadata: {
            horizontalTextAlign: 'right',
            verticalTextAlign: 'bottom',
            backgroundColor: 'red',
            fontColor: '#ffeb3b'
          }
        },
        '1_1': {
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
        '3_3': {
          cellValue: undefined,
          metadata: {
            borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
            backgroundColor: 'yellow'
          }
        },
        '4_1': {
          cellValue: 'Some value',
          metadata: {
            underline: true,
            strikeThrough: true,
            fontSize: 14,
            borders: ['borderBottom']
          }
        },
        '4_4': {
          cellValue: '0.05',
          metadata: {
            textFormatPattern: '0.00%'
          }
        },
        '40_4': {
          cellValue: 'Cell Value'
        }
      }
    }
  }
}

export const Formulas = Template.bind({})

Formulas.args = {
  sheets: {
    Formulas: {
      cells: {
        '0_1': {
          cellValue: '5',
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        },
        '1_1': {
          cellValue: '2',
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        },
        '2_0': {
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
        '2_1': {
          cellValue: '=SUM(B1, B2)',
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        },
        '4_0': {
          cellValue: 'Cross Sheet Reference',
          metadata: {
            underline: true,
            strikeThrough: true,
            fontSize: 14,
            borders: ['borderBottom']
          }
        },
        '4_1': {
          cellValue: "='Other'!A1 * 30",
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        }
      }
    },
    Other: {
      cells: {
        '0_0': {
          cellValue: '100',
          metadata: {
            textFormatPattern: '#,##0.00'
          }
        }
      }
    }
  }
}

const RealExampleTemplate: Story<IArgs> = args => {
  let FinancialPlugin = getTTFinancialPlugin(mockFinancialDataJSON)

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

  spreadsheet.hyperformula.addNamedExpression('TRUE', '=TRUE()')
  spreadsheet.hyperformula.addNamedExpression('FALSE', '=FALSE()')

  return spreadsheet.spreadsheetEl
}

export const RealExample = RealExampleTemplate.bind({})

RealExample.args = {
  sheets: realExampleSheets,
  options: {
    textPatternFormats: {
      currency: '$#,##0.##',
      million: '#,###.##,,',
      'million-currency': '$#,###.##,,'
    }
  }
}

const SpreadsheetPerformanceTemplate: Story<IArgs> = () => {
  const cells: Record<CellId, GenericDataRawCellContent<ICellMetadata>> = {}

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
    for (let ci = 0; ci <= defaultOptions.col.amount; ci++) {
      const simpleCellAddress = new SimpleCellAddress(0, ri, ci)
      const cellId = addressToCellId(simpleCellAddress)

      cells![cellId] = {
        cellValue: simpleCellAddress.addressToString(),
        metadata: {
          ...cell,
          backgroundColor: getRandomBackgroundColor()
        }
      }
    }
  }

  const sheets: SerializedSheets = {
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
