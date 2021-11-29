import { Story } from '@storybook/html'
import TouchEmulator from 'hammer-touchemulator'
import { action } from '@storybook/addon-actions'
import { throttle } from 'lodash'
import { ISpreadsheetData } from '../spreadsheet/sheets/Data'
import { IOptions } from '../spreadsheet/options'
import { IStyles } from '../spreadsheet/styles'
import { NestedPartial } from '../spreadsheet/types'
import { ISpreadsheetConstructor } from '../spreadsheet/Spreadsheet'
import { Spreadsheet, Toolbar, FormulaBar, Exporter, BottomBar } from '..'
import { PowersheetEvents } from '../spreadsheet/PowersheetEmitter'
import { AlwaysSparse, ConfigParams, HyperFormula, SerializedNamedExpression } from '@tracktak/hyperformula'
import { ICustomRegisteredPluginDefinition } from '../spreadsheet/Exporter'

export interface IArgs {
  data?: ISpreadsheetData
  options?: NestedPartial<IOptions>
  styles?: NestedPartial<IStyles>
}

const eventLog = (event: string, ...args: any[]) => {
  action(event)(...args)
  console.log(event, ...args)
}

export const getHyperformulaInstance = (config?: Partial<ConfigParams>) => {
  const trueNamedExpression: SerializedNamedExpression = {
    name: 'TRUE',
    expression: '=TRUE()'
  }

  const falseNamedExpression: SerializedNamedExpression = {
    name: 'FALSE',
    expression: '=FALSE()'
  }

  return HyperFormula.buildEmpty({
    ...config,
    chooseAddressMappingPolicy: new AlwaysSparse(),
    // We use our own undo/redo instead
    undoLimit: 0,
    licenseKey: 'gpl-v3'
  }, [trueNamedExpression, falseNamedExpression])[0]
}

const getSpreadsheet = (
  { options, styles, data }: IArgs,
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

  spreadsheet.initialize()

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
  args: IArgs,
  hyperformula: HyperFormula,
  customRegisteredPluginDefinitions: ICustomRegisteredPluginDefinition[] = []
) => {
  const toolbar = new Toolbar()
  const formulaBar = new FormulaBar()
  const exporter = new Exporter(customRegisteredPluginDefinitions)
  const bottomBar = new BottomBar()

  const spreadsheet = getSpreadsheet(args, {
    hyperformula,
    toolbar,
    formulaBar,
    exporter,
    bottomBar
  })

  toolbar.setToolbarIcons([
    {
      elements: [
        toolbar.iconElementsMap.undo.buttonContainer,
        toolbar.iconElementsMap.redo.buttonContainer
      ]
    },
    {
      elements: [toolbar.buttonElementsMap.textFormatPattern.buttonContainer]
    },
    {
      elements: [toolbar.buttonElementsMap.fontSize.buttonContainer]
    },
    {
      elements: [
        toolbar.iconElementsMap.bold.buttonContainer,
        toolbar.iconElementsMap.italic.buttonContainer,
        toolbar.iconElementsMap.underline.buttonContainer,
        toolbar.iconElementsMap.strikeThrough.buttonContainer,
        toolbar.iconElementsMap.fontColor.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.backgroundColor.buttonContainer,
        toolbar.iconElementsMap.borders.buttonContainer,
        toolbar.iconElementsMap.merge.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.horizontalTextAlign.buttonContainer,
        toolbar.iconElementsMap.verticalTextAlign.buttonContainer,
        toolbar.iconElementsMap.textWrap.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.freeze.buttonContainer,
        toolbar.iconElementsMap.functions.buttonContainer,
        toolbar.iconElementsMap.formula.buttonContainer
      ]
    },
    {
      elements: [toolbar.iconElementsMap.export.buttonContainer]
    },
    {
      elements: [toolbar.iconElementsMap.autosave.buttonContainer]
    }
  ])

  spreadsheet.spreadsheetEl.prepend(formulaBar.formulaBarEl)
  spreadsheet.spreadsheetEl.prepend(toolbar.toolbarEl)
  spreadsheet.spreadsheetEl.appendChild(bottomBar.bottomBarEl)

  return spreadsheet
}

export const Template: Story<IArgs> = args => {
  return buildSpreadsheetWithEverything(args, getHyperformulaInstance())
    .spreadsheetEl
}
