import { isNil, merge } from 'lodash'
import { defaultOptions, IOptions } from './options'
import Sheets from './sheets/Sheets'
import { defaultStyles, IStyles } from './styles'
import Toolbar from './toolbar/Toolbar'
import FormulaBar from './formulaBar/FormulaBar'
import { getDefaultSheetMetadata, prefix } from './utils'
import 'tippy.js/dist/tippy.css'
import './tippy.scss'
import styles from './Spreadsheet.module.scss'
import Exporter from './Exporter'
import BottomBar from './bottomBar/BottomBar'
import { HyperFormula } from '@tracktak/hyperformula'
import { ISheetMetadata, ISpreadsheetData } from './sheets/Data'
import PowersheetEmitter from './PowersheetEmitter'
import { NestedPartial } from './types'
import FunctionHelper from './functionHelper/FunctionHelper'
import Operations from './Operations'
import { UIUndoRedo } from './UIUndoRedo'
import HistoryManager from './HistoryManager'
import UIHyperformula from './sheets/Merger'
import Merger from './sheets/Merger'

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
  uiHyperformula: UIHyperformula
  historyManager: HistoryManager
  operations: Operations
  uiUndoRedo: UIUndoRedo
  bottomBar?: BottomBar
  merger: Merger
  isSaving = false
  sheetSizesSet = false

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
    this.initializeMetadata()

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

    this.merger = new Merger(this.hyperformula)

    this.toolbar?.initialize(this, this.merger)
    this.formulaBar?.initialize(this)
    this.exporter?.initialize(this, this.merger)
    this.bottomBar?.initialize(this)
    this.functionHelper?.initialize(this)

    this.uiHyperformula = new UIHyperformula(this.hyperformula)
    this.sheets = new Sheets(this, this.merger)
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
    this.sheets._updateSize()
  }

  private setMetadataForSheet(sheetName: string) {
    const sheetId = this.hyperformula.getSheetId(sheetName)!
    const partialSheetMetadata = this.hyperformula.getSheetMetadata<
      Partial<ISheetMetadata>
    >(sheetId)

    const sheetMetadata = merge<ISheetMetadata, Partial<ISheetMetadata>>(
      getDefaultSheetMetadata(),
      partialSheetMetadata
    )

    this.hyperformula.setSheetMetadata<ISheetMetadata>(sheetId, sheetMetadata)
  }

  private initializeMetadata() {
    const sheetNames = this.hyperformula.getSheetNames()

    sheetNames.forEach(sheetName => {
      this.setMetadataForSheet(sheetName)
    })

    if (sheetNames.length === 0) {
      const sheetName = this.hyperformula.addSheet()

      this.setMetadataForSheet(sheetName)
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
   * Must be called before `initialize()`.
   *
   * @param data - The persisted data that sets the spreadsheet.
   */
  setData(data: ISpreadsheetData) {
    this.spreadsheetData = {
      ...data
    }

    if (document.readyState !== 'loading' && !this.sheetSizesSet) {
      this.sheetSizesSet = true
      this.sheets._updateSize()
    } else {
      this.render()
    }
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

    this.eventEmitter.emit(
      'persistData',
      this.hyperformula.getAllSheetsSerialized(),
      done
    )
  }

  /**
   * Reverts the state of the spreadsheet to the previously pushed `_spreadsheetData`
   * that was done in `pushToHistory()` if an undo exists in the stack.
   */
  undo() {
    if (!this.hyperformula.isThereSomethingToUndo()) return

    this.hyperformula.undo()[0]

    this.render()
    this.persistData()
  }

  /**
   * Forwards the state of the spreadsheet to the previously undone `_spreadsheetData`
   * that was done in `undo()` if an redo exists in the stack.
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
    this.sheets._render()
    this.bottomBar?._render()
    this.toolbar?._render()
    this.functionHelper?._render()
    this.formulaBar?._render()

    console.log(this.hyperformula.getAllSheetsSerialized())
    console.log("undo", this.hyperformula._crudOperations.undoRedo.undoStack)
    console.log("redo", this.hyperformula._crudOperations.undoRedo.redoStack)

    if (recalculateHyperformula) {
      this.hyperformula.rebuildAndRecalculate().then(() => {
        this.render()
      })
    }
  }
}

export default Spreadsheet
