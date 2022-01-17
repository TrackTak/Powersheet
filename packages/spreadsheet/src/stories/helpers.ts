import { Story } from '@storybook/html'
import TouchEmulator from 'hammer-touchemulator'
import { action } from '@storybook/addon-actions'
import { throttle } from 'lodash'
import { IOptions } from '../spreadsheet/options'
import { IStyles } from '../spreadsheet/styles'
import { NestedPartial } from '../spreadsheet/types'
import { ISpreadsheetConstructor } from '../spreadsheet/Spreadsheet'
import {
  Spreadsheet,
  Toolbar,
  FormulaBar,
  Exporter,
  BottomBar,
  FunctionHelper
} from '..'
import { PowersheetEvents } from '../spreadsheet/PowersheetEmitter'
import {
  AlwaysSparse,
  ConfigParams,
  HyperFormula
} from '@tracktak/hyperformula'
import { ICustomRegisteredPluginDefinition } from '../spreadsheet/Exporter'
import getToolbarElementIcons from './getToolbarActionGroups'
import customFunctionMetadata from './mocks/customFunctionMetadata'
import { SerializedSheets, ISpreadsheetData } from '../spreadsheet/sheets/Data'
import { mapFromSerializedSheetsToSheets } from '../spreadsheet/utils'

export interface IArgs {
  sheets?: SerializedSheets
  data?: ISpreadsheetData
  options?: NestedPartial<IOptions>
  styles?: NestedPartial<IStyles>
}

const eventLog = (event: string, ...args: any[]) => {
  action(event)(...args)
  console.log(event, ...args)
}

export const getHyperformulaInstance = (
  sheets?: SerializedSheets,
  config?: Partial<ConfigParams>
) => {
  if (!sheets) {
    sheets = {
      'Default': {
      }
    }
  }

  const hyperformula = HyperFormula.buildFromSheets(
    mapFromSerializedSheetsToSheets(sheets),
    {
      ...config,
      chooseAddressMappingPolicy: new AlwaysSparse(),
      licenseKey: 'gpl-v3'
    }
  )[0]

  return hyperformula
}

const getSpreadsheet = (
  { options, styles, data }: IArgs | undefined = {},
  params: ISpreadsheetConstructor
) => {
  TouchEmulator.stop()

  const spreadsheet = new Spreadsheet({
    ...params
  })

  if (data) {
    spreadsheet.setData(data)
  }

  if (options) {
    spreadsheet.setOptions(options)
  }

  if (styles) {
    spreadsheet.setStyles(styles)
  }

  const oldEmit = spreadsheet.eventEmitter.emit

  // Throttling storybooks action log so that it doesn't
  // reduce FPS by 10-15~ on resize and scroll
  const throttledEventLog = throttle(eventLog, 250)

  spreadsheet.eventEmitter.emit = function <U extends keyof PowersheetEvents>(
    event: U,
    ...args: Parameters<PowersheetEvents[U]>
  ) {
    throttledEventLog(event.toString(), ...args)

    // @ts-ignore
    oldEmit.call(spreadsheet.eventEmitter, event, ...args)

    return true
  }

  spreadsheet.eventEmitter.on('persistData', (_, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done()
    }, 500)
  })

  return spreadsheet
}

export const buildOnlySpreadsheet = (
  args: IArgs,
  hyperformula: HyperFormula
) => {
  const spreadsheet = getSpreadsheet(args, {
    hyperformula
  })

  return spreadsheet
}

export const buildSpreadsheetWithEverything = (
  args: IArgs | undefined,
  hyperformula: HyperFormula,
  customRegisteredPluginDefinitions: ICustomRegisteredPluginDefinition[] = []
) => {
  const toolbar = new Toolbar()
  const formulaBar = new FormulaBar()
  const exporter = new Exporter(customRegisteredPluginDefinitions)
  const bottomBar = new BottomBar()
  const functionHelper = new FunctionHelper()

  const spreadsheet = getSpreadsheet(args, {
    hyperformula,
    toolbar,
    formulaBar,
    exporter,
    bottomBar,
    functionHelper
  })

  spreadsheet.spreadsheetEl.prepend(formulaBar.formulaBarEl)
  spreadsheet.spreadsheetEl.prepend(toolbar.toolbarEl)
  spreadsheet.spreadsheetEl.appendChild(bottomBar.bottomBarEl)
  spreadsheet.sheets.sheetElContainer.appendChild(
    functionHelper.functionHelperEl
  )
  spreadsheet.setCustomFunctionMetadata(customFunctionMetadata)
  spreadsheet.setFunctionTypeBlocklist(['Engineering'])
  functionHelper.setDrawerContent()
  toolbar.setToolbarIcons(getToolbarElementIcons(toolbar))

  return spreadsheet
}

export const Template: Story<IArgs> = args => {
  return buildSpreadsheetWithEverything(
    args,
    getHyperformulaInstance(args.sheets)
  ).spreadsheetEl
}
