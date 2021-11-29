import { isNil, merge } from 'lodash'
import { defaultOptions, IOptions } from './options'
import Sheets from './sheets/Sheets'
import { defaultStyles, IStyles } from './styles'
import Toolbar from './toolbar/Toolbar'
import FormulaBar from './formulaBar/FormulaBar'
import { prefix } from './utils'
import 'tippy.js/dist/tippy.css'
import './tippy.scss'
import styles from './Spreadsheet.module.scss'
import Manager from 'undo-redo-manager'
import Exporter from './Exporter'
import BottomBar from './bottomBar/BottomBar'
import { HyperFormula } from '@tracktak/hyperformula'
import Data, { ISpreadsheetData } from './sheets/Data'
import SimpleCellAddress, {
  CellId
} from './sheets/cells/cell/SimpleCellAddress'
import PowersheetEmitter from './PowersheetEmitter'
import { NestedPartial } from './types'
import FunctionHelper from './functionHelper/FunctionHelper'

export interface ISpreadsheetConstructor {
  hyperformula: HyperFormula
  toolbar?: Toolbar
  formulaBar?: FormulaBar
  exporter?: Exporter
  bottomBar?: BottomBar
  functionHelper?: FunctionHelper
}

export interface IHistoryData {
  activeSheetId: number
  associatedMergedCellAddressMap: Record<CellId, CellId>
  data: ISpreadsheetData
}

class Spreadsheet {
  spreadsheetEl: HTMLDivElement
  sheets: Sheets
  styles: IStyles
  eventEmitter: PowersheetEmitter
  options: IOptions
  data: Data
  toolbar?: Toolbar
  formulaBar?: FormulaBar
  functionHelper?: FunctionHelper
  exporter?: Exporter
  hyperformula: HyperFormula
  history: any
  bottomBar?: BottomBar
  isSaving = false
  isInitialized = false

  constructor(params: ISpreadsheetConstructor) {
    this.data = new Data(this)
    this.options = defaultOptions
    this.styles = defaultStyles
    this.eventEmitter = new PowersheetEmitter()

    this.toolbar = params.toolbar
    this.formulaBar = params.formulaBar
    this.bottomBar = params.bottomBar
    this.exporter = params.exporter
    this.functionHelper = params.functionHelper
    this.hyperformula = params.hyperformula
    this.spreadsheetEl = document.createElement('div')
    this.spreadsheetEl.classList.add(
      `${prefix}-spreadsheet`,
      styles.spreadsheet
    )

    if (!isNil(this.options.width)) {
      this.spreadsheetEl.style.width = `${this.options.width}px`
    }

    if (!isNil(this.options.height)) {
      this.spreadsheetEl.style.height = `${this.options.height}px`
    }

    this.toolbar?.initialize(this)
    this.formulaBar?.initialize(this)
    this.exporter?.initialize(this)
    this.bottomBar?.initialize(this)
    this.functionHelper?.initialize(this)

    // TODO: Change to command pattern later so we don't
    // need to store huge JSON objects: https://stackoverflow.com/questions/49755/design-pattern-for-undo-engine
    this.history = new Manager((data: string) => {
      const currentData: IHistoryData = {
        data: this.data._spreadsheetData,
        activeSheetId: this.sheets.activeSheetId,
        associatedMergedCellAddressMap:
          this.sheets.merger.associatedMergedCellAddressMap
      }

      const parsedData: IHistoryData = JSON.parse(data)

      this.data._spreadsheetData = parsedData.data
      this.sheets.activeSheetId = parsedData.activeSheetId
      this.sheets.merger.associatedMergedCellAddressMap =
        parsedData.associatedMergedCellAddressMap

      this.hyperformula.batch(() => {
        const sheetName = this.hyperformula.getSheetName(
          this.sheets.activeSheetId
        )!

        const sheetId = this.hyperformula.getSheetId(sheetName)!

        this.hyperformula.clearSheet(sheetId)
        this.setCells()
      })

      return JSON.stringify(currentData)
    }, this.options.undoRedoLimit)
    this.sheets = new Sheets(this)

    this.data.setSheet(0)

    // once is StoryBook bug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded, {
      once: true
    })
  }

  private setCells() {
    for (const key in this.data._spreadsheetData.cells) {
      const cellId = key as CellId
      const cell = this.data._spreadsheetData.cells?.[cellId]

      this.hyperformula.setCellContents(
        SimpleCellAddress.cellIdToAddress(cellId),
        cell?.value
      )
    }
  }

  private updateSheetSizes() {
    this.sheets._updateSize()
  }

  private onDOMContentLoaded = () => {
    this.updateSheetSizes()
  }

  /**
   * Creates the spreadsheets sheets from the data and sets
   * hyperformula cells if powersheet has not been initialized yet.
   * This must be called after `setData()`
   */
  initialize() {
    if (!this.isInitialized) {
      this.isInitialized = true

      for (const key in this.data._spreadsheetData.sheets) {
        const sheetId = parseInt(key, 10)
        const sheet = this.data._spreadsheetData.sheets[sheetId]

        this.sheets.createNewSheet(sheet)
      }

      if (this.data._spreadsheetData.sheets) {
        this.hyperformula.batch(() => {
          this.setCells()
        })
      }

      this.isSaving = false

      this.render()

      if (document.readyState !== 'loading') {
        this.updateSheetSizes()
      }
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
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded)

    this.spreadsheetEl.remove()

    this.toolbar?.destroy()
    this.formulaBar?.destroy()
    this.bottomBar?.destroy()
    this.functionHelper?._destroy()
    this.sheets._destroy()

    if (destroyHyperformula) {
      this.hyperformula.destroy()
    }
  }

  /**
   * Must be called before `initialize()`.
   *
   * @param data - The persisted data that sets the spreadsheet.
   */
  setData(data: ISpreadsheetData) {
    this.data._spreadsheetData = data

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
   * This adds to the stack for the undo/redo functionality.
   * `persistData()` is automatically called at the end of this method.
   *
   * @param callback - A function that you want to be called after the history is pushed
   * onto the stack.
   */
  pushToHistory(callback?: () => void) {
    const historyData: IHistoryData = {
      activeSheetId: this.sheets.activeSheetId,
      data: this.data._spreadsheetData,
      associatedMergedCellAddressMap:
        this.sheets.merger.associatedMergedCellAddressMap
    }
    const data = JSON.stringify(historyData)

    this.history.push(data)

    this.eventEmitter.emit('historyPush', data)

    if (callback) {
      callback()
    }

    this.persistData()
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

    this.eventEmitter.emit('persistData', this.data._spreadsheetData, done)
  }

  /**
   * Reverts the state of the spreadsheet to the previously pushed `_spreadsheetData`
   * that was done in `pushToHistory()` if an undo exists in the stack.
   */
  undo() {
    if (!this.history.canUndo) return

    this.history.undo()

    this.render()
    this.persistData()
  }

  /**
   * Forwards the state of the spreadsheet to the previously undone `_spreadsheetData`
   * that was done in `undo()` if an redo exists in the stack.
   */
  redo() {
    if (!this.history.canRedo) return

    this.history.redo()

    this.render()
    this.persistData()
  }

  /**
   * This updates the viewport visible on the user's screen and all
   * sub-components. This function should be called after you need to refresh
   * the spreadsheet. This is basically equivalent to React's `render()` method.
   */
  render() {
    this.sheets._render()
    this.bottomBar?._render()
    this.toolbar?._render()
    this.functionHelper?._render()
    this.formulaBar?._render()
  }
}

export default Spreadsheet
