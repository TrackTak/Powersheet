import SimpleCellAddress from '../spreadsheet/sheets/cells/cell/SimpleCellAddress'
import { Story, Meta } from '@storybook/html'
// @ts-ignore
import { currencySymbolMap } from 'currency-symbol-map'
import TouchEmulator from 'hammer-touchemulator'
import { merge } from 'lodash'
import { ISpreadsheetData, ICellData } from '../spreadsheet/sheets/Data'
import { defaultOptions } from '..'
import { HyperFormula } from 'hyperformula'
// @ts-ignore
import { getTTFinancialPlugin, finTranslations } from './mocks/getTTFinancialPlugin'
import realExampleDataJSON from './mocks/realExampleData.json'
import mockFinancialDataJSON from './mocks/mockFinancialData.json'
import {
  buildOnlySpreadsheet,
  buildSpreadsheetWithEverything,
  getHyperformulaInstance,
  IArgs,
  Template
} from './helpers'

const realExampleData = realExampleDataJSON as ISpreadsheetData

export default {
  title: 'Spreadsheet'
} as Meta

export const Default = Template.bind({})

export const FrozenCells = Template.bind({})

FrozenCells.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Frozen Cells',
        frozenCell: 0
      }
    },
    frozenCells: {
      0: {
        id: 0,
        row: 2,
        col: 2
      }
    }
  }
}

export const MergedCells = Template.bind({})

MergedCells.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Merged Cells',
        cells: {
          '0_3_1': '0_3_1'
        },
        mergedCells: {
          '0_3_1': '0_3_1',
          '0_7_1': '0_7_1'
        }
      }
    },
    cells: {
      '0_3_1': {
        value: 'Merged Cell',
        fontSize: 14,
        id: '0_3_1',
        bold: true,
        horizontalTextAlign: 'center'
      }
    },
    mergedCells: {
      '0_3_1': {
        id: '0_3_1',
        row: {
          x: 3,
          y: 5
        },
        col: {
          x: 1,
          y: 1
        }
      },
      '0_7_1': {
        id: '0_7_1',
        row: {
          x: 7,
          y: 9
        },
        col: {
          x: 1,
          y: 20
        }
      }
    }
  }
}

export const DifferentSizeCells = Template.bind({})

DifferentSizeCells.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Different Size Cells',
        rows: { '0_0': '0_0', '0_2': '0_2' },
        cols: { '0_0': '0_0' }
      }
    },
    rows: {
      '0_0': {
        id: '0_0',
        size: 50
      },
      '0_2': {
        id: '0_2',
        size: 100
      }
    },
    cols: {
      '0_0': {
        id: '0_0',
        size: 200
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
    getHyperformulaInstance({
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
  },
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'One Million Rows'
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Custom Options',
        cells: {
          '0_0_1': '0_0_1',
          '0_1_1': '0_1_1',
          '0_2_1': '0_2_1'
        }
      }
    },
    cells: {
      '0_0_1': {
        id: '0_0_1',
        value: '20000000',
        textFormatPattern: '$#,##0.##'
      },
      '0_1_1': {
        id: '0_1_1',
        value: '20000000',
        textFormatPattern: '#,###.##,,'
      },
      '0_2_1': {
        id: '0_2_1',
        value: '20000000',
        textFormatPattern: '$#,###.##,,',
        fontSize: 32
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
  const firstSpreadsheetArgs = {
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'First Spreadsheet'
        }
      }
    }
  }

  const secondSpreadsheetArgs = {
    data: {
      sheets: {
        0: {
          id: 0,
          sheetName: 'Second Spreadsheet'
        }
      }
    }
  }

  const hyperformula = getHyperformulaInstance()

  const firstSpreadsheetEl = buildSpreadsheetWithEverything(
    firstSpreadsheetArgs,
    hyperformula
  )
  const secondSpreadsheetEl = buildSpreadsheetWithEverything(
    secondSpreadsheetArgs,
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
    getHyperformulaInstance({
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
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'All Currency Symbols',
        cells: {
          '0_1_0': '0_1_0',
          '0_1_1': '0_1_1',
          '0_3_3': '0_3_3',
          '0_4_1': '0_4_1'
        }
      }
    },
    cells: {
      '0_1_0': {
        id: '0_1_0',
        value: '$33334.33',
        textFormatPattern: '$#,##0.##'
      },
      '0_1_1': {
        id: '0_1_1',
        value: '₪22.2',
        textFormatPattern: '₪#,##0.##'
      },
      '0_3_3': {
        id: '0_3_3',
        value: '£33.3',
        textFormatPattern: '£#,##0.##'
      },
      '0_4_1': {
        id: '0_4_1',
        value: '=A2+B2+D4',
        textFormatPattern: '#,##0.##'
      }
    }
  }
}

export const CellsData = Template.bind({})

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
          '0_40_4': '0_40_4'
        }
      }
    },
    cells: {
      '0_1_0': {
        id: '0_1_0',
        value: 'HI!',
        horizontalTextAlign: 'right',
        verticalTextAlign: 'bottom',
        backgroundColor: 'red',
        fontColor: '#ffeb3b'
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
        textWrap: 'wrap'
      },
      '0_3_3': {
        id: '0_3_3',
        borders: ['borderBottom', 'borderRight', 'borderTop', 'borderLeft'],
        backgroundColor: 'yellow'
      },
      '0_4_1': {
        id: '0_4_1',
        value: 'Some value',
        underline: true,
        strikeThrough: true,
        fontSize: 14,
        borders: ['borderBottom']
      },
      '0_4_4': {
        id: '0_4_4',
        value: '0.05',
        textFormatPattern: '0.00%'
      },
      '0_40_4': {
        id: '0_40_4',
        value: 'Cell Value'
      }
    }
  }
}

export const Formulas = Template.bind({})

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
          '0_4_1': '0_4_1'
        }
      },
      1: {
        id: 1,
        sheetName: 'Other',
        cells: { '1_0_0': '1_0_0' }
      }
    },
    cells: {
      '0_0_1': {
        id: '0_0_1',
        value: '5',
        textFormatPattern: '#,##0.00'
      },
      '0_1_1': {
        id: '0_1_1',
        value: '2',
        textFormatPattern: '#,##0.00'
      },
      '0_2_0': {
        id: '0_2_0',
        value: 'SUM'
      },
      '0_2_1': {
        id: '0_2_1',
        value: '=SUM(B1, B2)',
        textFormatPattern: '#,##0.00'
      },
      '0_4_0': {
        id: '0_4_0',
        value: 'Cross Sheet Reference'
      },
      '0_4_1': {
        id: '0_4_1',
        value: "='Other'!A1 * 30",
        textFormatPattern: '#,##0.00'
      },
      '1_0_0': {
        id: '1_0_0',
        value: '100',
        textFormatPattern: '#,##0.00'
      }
    }
  }
}

const RealExampleTemplate: Story<IArgs> = args => {
  let FinancialPlugin = getTTFinancialPlugin()

  HyperFormula.registerFunctionPlugin(FinancialPlugin, finTranslations)

  const spreadsheet = buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance(),
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

    spreadsheet?.hyperformula.rebuildAndRecalculate()
    spreadsheet?.updateViewport()
  }, 2000)

  return spreadsheet.spreadsheetEl
}

export const RealExample = RealExampleTemplate.bind({})

RealExample.args = {
  data: realExampleData,
  options: {
    textPatternFormats: {
      currency: '$#,##0.##',
      million: '#,###.##,,',
      'million-currency': '$#,###.##,,'
    }
  }
}

const SpreadsheetPerformanceTemplate: Story<IArgs> = args => {
  const data = args.data

  const cell: Partial<ICellData> = {
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
      const cellId = simpleCellAddress.toCellId()

      data!.cells![cellId] = {
        ...cell,
        id: cellId,
        value: simpleCellAddress.addressToString(),
        backgroundColor: getRandomBackgroundColor()
      }

      data!.sheets![0]!.cells![cellId] = cellId
    }
  }

  return buildSpreadsheetWithEverything(args, getHyperformulaInstance())
    .spreadsheetEl
}

export const SpreadsheetPerformance = SpreadsheetPerformanceTemplate.bind({})

SpreadsheetPerformance.args = {
  data: {
    sheets: {
      0: {
        id: 0,
        sheetName: 'Spreadsheet Performance',
        cells: {}
      }
    },
    cells: {}
  }
}
