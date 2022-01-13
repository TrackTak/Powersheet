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
import Operations from './Operations'
import { ISheetMetadata } from './sheets/Data'
import Sheets from './sheets/Sheets'

class HistoryManager {
  constructor(
    private hyperformula: HyperFormula,
    private operations: Operations,
    private sheets: Sheets
  ) {
    this.hyperformula.on('addUndoEntry', this.onAddUndoEntry)
    this.hyperformula.on('undo', this.onUndo)
    this.hyperformula.on('redo', this.onRedo)
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

    const { mergedCells, frozenRow, frozenCol } =
      this.hyperformula.getSheetMetadata<ISheetMetadata>(
        this.sheets.activeSheetId
      )

    if (operation instanceof BatchUndoEntry) {
      operation.operations.forEach(operation => {
        this.onAddUndoEntry(operation)
      })
    }

    if (operation instanceof AddSheetUndoEntry) {
      // @ts-ignore
      operation.sheetNames = this.hyperformula.getSheetNames()
      // @ts-ignore
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
      // @ts-ignore
      this.operations.restoreOldCellContents(operation.oldContent)
      // @ts-ignore
      this.operations.restoreRemovedMergedCells(operation.removedMergedCells)
    }

    if (operation instanceof AddSheetUndoEntry) {
      const newSheetId = this.operations.removeSheet(
        operation.sheetName,
        // @ts-ignore
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
      // @ts-ignore
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

  /**
   * @internal
   */
  _destroy() {
    this.hyperformula.off('addUndoEntry', this.onAddUndoEntry)
    this.hyperformula.off('undo', this.onUndo)
    this.hyperformula.off('redo', this.onRedo)
  }
}

export default HistoryManager
