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
import Exporter from './Exporter'
import BottomBar from './bottomBar/BottomBar'
import {
  UndoEntry,
  HyperFormula,
  RemoveRowsUndoEntry,
  AddRowsUndoEntry,
  RemoveColumnsUndoEntry,
  AddColumnsUndoEntry,
  BatchUndoEntry,
  MoveCellsUndoEntry,
  PasteUndoEntry,
  AddSheetUndoEntry,
  RemoveSheetUndoEntry
} from '@tracktak/hyperformula'
import { ISheetMetadata, ISpreadsheetData } from './sheets/Data'
import PowersheetEmitter from './PowersheetEmitter'
import { NestedPartial } from './types'
import FunctionHelper from './functionHelper/FunctionHelper'
import Operations from './Operations'
import { UIUndoRedo } from './UIUndoRedo'

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
  operations: Operations
  uiUndoRedo: UIUndoRedo
  bottomBar?: BottomBar
  isSaving = false
  sheetSizesSet = false

  constructor(params: ISpreadsheetConstructor) {
    this.options = defaultOptions
    this.styles = defaultStyles
    this.spreadsheetData = {}

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
    this.eventEmitter = new PowersheetEmitter()

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

    this.sheets = new Sheets(this)
    this.operations = new Operations(
      this.hyperformula,
      this.sheets.merger,
      this.sheets.selector
    )
    this.uiUndoRedo = new UIUndoRedo(this.hyperformula, this.operations)

    // once is StoryBook bug workaround: https://github.com/storybookjs/storybook/issues/15753#issuecomment-932495346
    window.addEventListener('DOMContentLoaded', this._onDOMContentLoaded, {
      once: true
    })

    this.hyperformula.on('asyncValuesUpdated', this.onAsyncValuesUpdated)
    this.hyperformula.on('addUndoEntry', this.onAddUndoEntry)
    this.hyperformula.on('undo', this.onUndo)
    this.hyperformula.on('redo', this.onRedo)
  }

  private onAsyncValuesUpdated = () => {
    this.render()
  }

  private onAddUndoEntry = (operation: UndoEntry) => {
    if (operation instanceof RemoveSheetUndoEntry) {
      const newSheetId = this.operations.removeSheet(
        operation.sheetName,
        operation.oldSheetNames,
        operation.sheetId,
        this.sheets.activeSheetId
      )
      this.sheets.switchSheet(newSheetId)
    }

    const {
      mergedCells,
      frozenRow,
      frozenCol
    } = this.hyperformula.getSheetMetadata<ISheetMetadata>(
      this.sheets.activeSheetId
    )

    if (operation instanceof BatchUndoEntry) {
      operation.operations.forEach(operation => {
        this.onAddUndoEntry(operation)
      })
    }

    if (operation instanceof AddSheetUndoEntry) {
      operation.sheetNames = this.hyperformula.getSheetNames()
      operation.sheetId = this.hyperformula.getSheetId(operation.sheetName)

      this.sheets.switchSheet(operation.sheetId)
      this.sheets._updateSize()
    }

    if (operation instanceof MoveCellsUndoEntry) {
      const removedMergedCells = this.operations.moveMergedCells(
        operation.sourceLeftCorner,
        operation.destinationLeftCorner,
        operation.width,
        operation.height
      )

      // @ts-ignore
      operation.removedMergedCells = removedMergedCells
    }

    if (operation instanceof PasteUndoEntry) {
      const removedMergedCells = this.operations.pasteMergedCells(
        operation.targetLeftCorner,
        operation.newContent
      )

      // @ts-ignore
      operation.removedMergedCells = removedMergedCells
    }

    if (operation instanceof RemoveRowsUndoEntry) {
      // @ts-ignore
      operation.frozenRow = frozenRow
      // @ts-ignore
      operation.mergedCells = mergedCells

      this.operations.removeFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        frozenRow
      )

      this.operations.removeMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        mergedCells
      )
    }

    if (operation instanceof AddRowsUndoEntry) {
      // @ts-ignore
      operation.frozenRow = frozenRow
      // @ts-ignore
      operation.mergedCells = mergedCells

      this.operations.addFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        frozenRow
      )

      this.operations.addMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        mergedCells
      )
    }

    if (operation instanceof RemoveColumnsUndoEntry) {
      // @ts-ignore
      operation.frozenCol = frozenCol
      // @ts-ignore
      operation.mergedCells = mergedCells

      this.operations.removeFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        frozenCol
      )

      this.operations.removeMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        mergedCells
      )
    }

    if (operation instanceof AddColumnsUndoEntry) {
      // @ts-ignore
      operation.frozenCol = frozenCol
      // @ts-ignore
      operation.mergedCells = mergedCells

      this.operations.addFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        frozenCol
      )

      this.operations.addMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        mergedCells
      )
    }
  }

  private onUndo = (operation: UndoEntry) => {
    this.hyperformula.suspendAddingUndoEntries()

    if (operation instanceof PasteUndoEntry) {
      this.operations.restoreOldCellContents(operation.oldContent)
      this.operations.restoreRemovedMergedCells(operation.removedMergedCells)
    }

    if (operation instanceof AddSheetUndoEntry) {
      const newSheetId = this.operations.removeSheet(
        operation.sheetName,
        operation.sheetNames,
        operation.sheetId,
        this.sheets.activeSheetId
      )
      this.sheets.switchSheet(newSheetId)
    }

    if (operation instanceof RemoveSheetUndoEntry) {
      this.sheets.switchSheet(operation.sheetId)
      this.sheets._updateSize()
    }

    if (operation instanceof MoveCellsUndoEntry) {
      this.operations.moveMergedCells(
        operation.destinationLeftCorner,
        operation.sourceLeftCorner,
        operation.width,
        operation.height
      )
      this.operations.restoreRemovedMergedCells(operation.removedMergedCells)
    }

    if (operation instanceof RemoveRowsUndoEntry) {
      this.operations.addFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenRow
      )

      this.operations.addMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof AddRowsUndoEntry) {
      this.operations.removeFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenRow
      )

      this.operations.removeMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof RemoveColumnsUndoEntry) {
      this.operations.addFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenCol
      )

      this.operations.addMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof AddColumnsUndoEntry) {
      this.operations.removeFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenCol
      )

      this.operations.removeMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    this.hyperformula.resumeAddingUndoEntries()
  }

  private onRedo = (operation: UndoEntry) => {
    this.hyperformula.suspendAddingUndoEntries()

    if (operation instanceof PasteUndoEntry) {
      this.operations.pasteMergedCells(
        operation.targetLeftCorner,
        operation.newContent
      )
    }

    if (operation instanceof AddSheetUndoEntry) {
      this.sheets.switchSheet(operation.sheetId)
      this.sheets._updateSize()
    }

    if (operation instanceof RemoveSheetUndoEntry) {
      const newSheetId = this.operations.removeSheet(
        operation.sheetName,
        operation.oldSheetNames,
        operation.sheetId,
        this.sheets.activeSheetId
      )
      this.sheets.switchSheet(newSheetId)
    }

    if (operation instanceof MoveCellsUndoEntry) {
      this.operations.moveMergedCells(
        operation.sourceLeftCorner,
        operation.destinationLeftCorner,
        operation.width,
        operation.height
      )
    }

    if (operation instanceof RemoveRowsUndoEntry) {
      this.operations.removeFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenRow
      )

      this.operations.removeMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof AddRowsUndoEntry) {
      this.operations.addFrozenRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenRow
      )

      this.operations.addMergedCellRows(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof RemoveColumnsUndoEntry) {
      this.operations.removeFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenCol
      )

      this.operations.removeMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    if (operation instanceof AddColumnsUndoEntry) {
      this.operations.addFrozenCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.frozenCol
      )

      this.operations.addMergedCellCols(
        operation.command.sheet,
        operation.command.indexes[0],
        // @ts-ignore
        operation.mergedCells
      )
    }

    this.hyperformula.resumeAddingUndoEntries()
  }

  private _onDOMContentLoaded = () => {
    this.sheets._updateSize()
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
    this.hyperformula.off('addUndoEntry', this.onAddUndoEntry)
    this.hyperformula.off('undo', this.onUndo)
    this.hyperformula.off('redo', this.onRedo)

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

    if (recalculateHyperformula) {
      this.hyperformula.rebuildAndRecalculate().then(() => {
        this.render()
      })
    }
  }
}

export default Spreadsheet
