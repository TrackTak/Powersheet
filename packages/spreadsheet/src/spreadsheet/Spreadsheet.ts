import { Dictionary, groupBy, isNil, merge } from 'lodash'
import { defaultOptions, IOptions } from './options'
import Sheets from './sheets/Sheets'
import { defaultStyles, IStyles } from './styles'
import Toolbar from './toolbar/Toolbar'
import FormulaBar from './formulaBar/FormulaBar'
import {
  isStringAFormula,
  mapFromSheetsToSerializedSheets,
  prefix
} from './utils'
import './tippy.scss'
import styles from './Spreadsheet.module.scss'
import Exporter from './Exporter'
import BottomBar from './bottomBar/BottomBar'
import {
  HyperFormula,
  DetailedCellError,
  lexerConfig
} from '@tracktak/hyperformula'
import {
  buildLexerConfig,
  FormulaLexer
  // @ts-ignore
} from '@tracktak/hyperformula/es/parser/index'
// @ts-ignore
import { Config } from '@tracktak/hyperformula/es/Config'
import { ISpreadsheetData } from './sheets/Data'
import PowersheetEmitter from './PowersheetEmitter'
import { NestedPartial } from './types'
import FunctionHelper, {
  IFunctionHelperData
} from './functionHelper/FunctionHelper'
import Operations from './Operations'
import { UIUndoRedo } from './UIUndoRedo'
import HistoryManager from './HistoryManager'
import powersheetFormulaMetadataJSON from './functionHelper/powersheetFormulaMetadata.json'
import Merger from './sheets/Merger'
import { IToken } from 'chevrotain'

export interface IPatternCellReference {
  startOffset: number
  endOffset: number
  cellValue: string
}

export interface ISpreadsheetConstructor {
  hyperformula: HyperFormula
  toolbar?: Toolbar
  formulaBar?: FormulaBar
  exporter?: Exporter
  bottomBar?: BottomBar
  functionHelper?: FunctionHelper
}

class Spreadsheet {
  spreadsheetEl: HTMLDivElement
  sheets: Sheets
  styles: IStyles
  eventEmitter: PowersheetEmitter
  options: IOptions
  toolbar?: Toolbar
  formulaBar?: FormulaBar
  functionHelper?: FunctionHelper
  spreadsheetData: ISpreadsheetData
  exporter?: Exporter
  hyperformula: HyperFormula
  historyManager: HistoryManager
  merger: Merger
  operations: Operations
  uiUndoRedo: UIUndoRedo
  functionMetadata: Record<string, IFunctionHelperData> = {}
  functionMetadataByGroup: Dictionary<
    [IFunctionHelperData, ...IFunctionHelperData[]]
  > = {}
  bottomBar?: BottomBar
  isSaving = false
  patternLexer: FormulaLexer

  constructor(params: ISpreadsheetConstructor) {
    this.options = defaultOptions
    this.styles = defaultStyles
    this.toolbar = params.toolbar
    this.formulaBar = params.formulaBar
    this.bottomBar = params.bottomBar
    this.exporter = params.exporter
    this.functionHelper = params.functionHelper
    this.hyperformula = params.hyperformula
    this.spreadsheetData = {}

    this.spreadsheetEl = document.createElement('div')
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    )
    this.eventEmitter = new PowersheetEmitter()

    if (!isNil(this.options.width)) {
      this.spreadsheetEl.style.width = `${this.options.width}px`
    }

    if (!isNil(this.options.height)) {
      this.spreadsheetEl.style.height = `${this.options.height}px`
    }
    this.setFunctionMetadata(powersheetFormulaMetadataJSON)

    this.merger = new Merger(this.hyperformula)
    this.sheets = new Sheets(this)

    this.toolbar?.initialize(this, this.merger)
    this.formulaBar?.initialize(this)
    this.exporter?.initialize(this, this.merger)
    this.bottomBar?.initialize(this)
    this.functionHelper?.initialize(this)

    this.operations = new Operations(
      this.hyperformula,
      this.merger,
      this.sheets.selector
    )
    this.uiUndoRedo = new UIUndoRedo(this.hyperformula, this.operations)
    this.historyManager = new HistoryManager(
      this.hyperformula,
      this.operations,
      this.sheets
    )

    const config = new Config(this.hyperformula.getConfig())
    const patternLexerConfig = buildLexerConfig(config)

    patternLexerConfig.allTokens = [
      lexerConfig.WhiteSpace,
      lexerConfig.CellReference
    ]

    const sheetMapping = this.hyperformula.dependencyGraph.sheetMapping

    this.patternLexer = new FormulaLexer(patternLexerConfig, sheetMapping)

    // once is StoryBook bug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this._onDOMContentLoaded, {
      once: true
    })

    this.hyperformula.on('asyncValuesUpdated', this.onAsyncValuesUpdated)
  }

  private onAsyncValuesUpdated = () => {
    this.render()
  }

  private _onDOMContentLoaded = () => {
    this.updateSize()
  }

  private setFunctionMetadata(
    functionMetadata: Record<string, IFunctionHelperData>,
    blockedFunctionTypes: string[] = []
  ) {
    this.functionMetadata = functionMetadata
    this.functionMetadataByGroup = groupBy(functionMetadata, 'type')
    this.unregisterBlockedFunctions(blockedFunctionTypes)
    this.functionHelper?._update()
  }

  private unregisterBlockedFunctions(blockedFunctionTypes: string[]) {
    blockedFunctionTypes.forEach(functionType => {
      const functions = this.functionMetadataByGroup[functionType] ?? []
      delete this.functionMetadataByGroup[functionType]
      functions.forEach((func: IFunctionHelperData) => {
        HyperFormula.unregisterFunction(func.header)
        delete this.functionMetadata[func.header]
      })
    })
  }

  public parseDynamicPattern(pattern: string) {
    if (!isStringAFormula(pattern)) {
      return pattern
    }

    const tokens = this.patternLexer.tokenizeFormula(pattern).tokens as IToken[]
    const cellReferenceValues: IPatternCellReference[] = []

    tokens.forEach(token => {
      if (token.tokenType.name === lexerConfig.CellReference.name) {
        const address = this.hyperformula.simpleCellAddressFromString(
          token.image,
          this.sheets.activeSheetId
        )

        if (address) {
          const cellValue = this.hyperformula.getCellValue(address)

          if (
            cellValue &&
            !Array.isArray(cellValue) &&
            !(cellValue instanceof DetailedCellError) &&
            token.endOffset
          ) {
            // -1 & +1 offset to remove square braces
            cellReferenceValues.push({
              cellValue: cellValue.cellValue as string,
              startOffset: token.startOffset - 1,
              endOffset: token.endOffset + 1
            })
          }
        }
      }
    })

    const initialCharsLength = pattern.length
    let offsetDifference = 0

    cellReferenceValues.forEach(({ cellValue, startOffset, endOffset }) => {
      const chars = pattern.split('')
      const start = startOffset + offsetDifference
      const deleteCount = endOffset + offsetDifference - start + 1

      chars.splice(start, deleteCount, cellValue)

      offsetDifference += chars.length - initialCharsLength

      pattern = chars.join('')
    })

    pattern = pattern.slice(1)

    return pattern
  }

  /**
   *
   * @internal
   */
  _getTextFormatPatterns() {
    return {
      ...this.options.textPatternFormats,
      ...this.spreadsheetData.textPatternFormats
    }
  }

  /**
   * Unregister's event listeners and removes all DOM elements for
   * the Spreadsheet and all it's children
   *
   * @param destroyHyperformula - This should only be set to false
   * when you are using multiple spreadsheets with a shared hyperformula instance.
   */
  destroy(destroyHyperformula = true) {
    window.removeEventListener('DOMContentLoaded', this._onDOMContentLoaded)

    this.hyperformula.off('asyncValuesUpdated', this.onAsyncValuesUpdated)

    this.spreadsheetEl.remove()

    this.toolbar?.destroy()
    this.formulaBar?.destroy()
    this.bottomBar?.destroy()
    this.functionHelper?._destroy()
    this.sheets._destroy()
    this.historyManager._destroy()

    if (destroyHyperformula) {
      this.hyperformula.destroy()
    }
  }

  /**
   * @param data - The persisted data that sets the spreadsheet.
   */
  setData(data: ISpreadsheetData) {
    this.spreadsheetData = {
      ...data
    }

    this.render()
  }

  /**
   *
   * @param options - Custom options that you want for the spreadsheet.
   */
  setOptions(options: NestedPartial<IOptions>) {
    this.options = merge({}, this.options, options)

    this.render()
  }

  /**
   *
   * @param styles - Customs styling specifically for the canvas elements.
   */
  setStyles(styles: NestedPartial<IStyles>) {
    this.styles = merge({}, this.styles, styles)

    this.render()
  }

  /**
   * Provides a way for developers to save the `_spreadsheetData` to their database.
   * This function should be called after an action by the user or a custom function.
   */
  persistData() {
    const done = () => {
      this.isSaving = false

      // We don't update sheet viewport for performance reasons
      this.toolbar?._render()
    }

    this.isSaving = true

    const serializedSheets = mapFromSheetsToSerializedSheets(
      this.hyperformula.getAllSheetsSerialized()
    )

    this.eventEmitter.emit(
      'persistData',
      {
        data: this.spreadsheetData,
        sheets: serializedSheets
      },
      done
    )
  }

  /**
   * Reverts the state of the spreadsheet to the previously pushed data
   */
  undo() {
    if (!this.hyperformula.isThereSomethingToUndo()) return

    this.hyperformula.undo()[0]

    this.render()
    this.persistData()
  }

  /**
   * Forwards the state of the spreadsheet to the previously undone data
   */
  redo() {
    if (!this.hyperformula.isThereSomethingToRedo()) return

    this.hyperformula.redo()[0]

    this.render()
    this.persistData()
  }

  /**
   * This updates the viewport visible on the user's screen and all
   * sub-components. This function should be called after you need to refresh
   * the spreadsheet. This is basically equivalent to React's `render()` method.
   *
   * @param recalculateHyperformula - If true then it will call hyperformula's
   * `rebuildAndRecalculate()` method which updates all the formulas again.
   */
  render(recalculateHyperformula = false) {
    if (recalculateHyperformula) {
      this.hyperformula.rebuildAndRecalculate().then(() => {
        this.render()
      })
      return
    }

    this.sheets._render()
    this.bottomBar?._render()
    this.toolbar?._render()
    this.functionHelper?._render()
    this.formulaBar?._render()
  }

  updateSize() {
    this.sheets._updateSize()
  }

  /**
   * Allows the setting of custom function metadata that will be displayed in the function helpers
   *
   * @param customFunctionMetadata - The custom metadata
   */
  setCustomFunctionMetadata(
    customFunctionMetadata: Record<string, IFunctionHelperData>
  ) {
    this.setFunctionMetadata({
      ...customFunctionMetadata,
      ...this.functionMetadata
    })
  }

  /**
   * Sets the list of blocked function types so that the metadata will not appear in the function helpers
   *
   * @param blockedFunctionTypes - The array of function types e.g. Engineering, Array etc.
   */
  setFunctionTypeBlocklist(blockedFunctionTypes: string[]) {
    this.setFunctionMetadata(this.functionMetadata, blockedFunctionTypes)
  }
}

export default Spreadsheet
