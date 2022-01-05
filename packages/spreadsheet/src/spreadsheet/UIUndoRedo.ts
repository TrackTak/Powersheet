import { HyperFormula, UndoRedo } from '@tracktak/hyperformula'
import {
  SetColSizeCommand,
  SetFrozenRowColCommand,
  SetRowSizeCommand,
  UnsetFrozenRowColCommand
} from './Commands'
import Operations from './Operations'

export interface IUIBaseUndoRedoEntry {
  doUndo(undoRedo: UIUndoRedo): void
  doRedo(undoRedo: UIUndoRedo): void
}

export class SetFrozenRowColUndoEntry implements IUIBaseUndoRedoEntry {
  constructor(public readonly command: SetFrozenRowColCommand) {}

  public doUndo(undoRedo: UIUndoRedo): void {
    undoRedo.undoSetFrozenRowCol(this)
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    undoRedo.redoSetFrozenRowCol(this)
  }
}

export class UnsetFrozenRowColUndoEntry implements IUIBaseUndoRedoEntry {
  constructor(public readonly command: UnsetFrozenRowColCommand) {}

  public doUndo(undoRedo: UIUndoRedo): void {
    undoRedo.undoUnsetFrozenRowCol(this)
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    undoRedo.redoUnsetFrozenRowCol(this)
  }
}

export class SetRowSizeUndoEntry implements IUIBaseUndoRedoEntry {
  constructor(public readonly command: SetRowSizeCommand) {}

  public doUndo(undoRedo: UIUndoRedo): void {
    undoRedo.undoSetRowSize(this)
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    undoRedo.redoSetRowSize(this)
  }
}

export class SetColSizeUndoEntry implements IUIBaseUndoRedoEntry {
  constructor(public readonly command: SetColSizeCommand) {}

  public doUndo(undoRedo: UIUndoRedo): void {
    undoRedo.undoSetColSize(this)
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    undoRedo.redoSetColSize(this)
  }
}

export class UIUndoRedo extends UndoRedo {
  constructor(
    hyperformula: HyperFormula,
    private readonly uiOperations: Operations
  ) {
    super(
      // @ts-ignore
      hyperformula._config,
      // @ts-ignore
      hyperformula._crudOperations.operations,
      // @ts-ignore
      hyperformula._emitter
    )
    // @ts-ignore
    hyperformula._lazilyTransformingAstService.undoRedo = this
    // @ts-ignore
    hyperformula._crudOperations.undoRedo = this
  }

  public undoSetFrozenRowCol(operation: SetFrozenRowColUndoEntry) {
    const {
      command: { sheet }
    } = operation

    this.uiOperations.unsetFrozenRowCol(sheet)
  }

  public undoUnsetFrozenRowCol(operation: UnsetFrozenRowColUndoEntry) {
    const {
      command: { sheet, indexes }
    } = operation

    this.uiOperations.setFrozenRowCol(sheet, indexes)
  }

  public redoSetFrozenRowCol(operation: SetFrozenRowColUndoEntry) {
    const {
      command: { sheet, indexes }
    } = operation

    this.uiOperations.setFrozenRowCol(sheet, indexes)
  }

  public redoUnsetFrozenRowCol(operation: UnsetFrozenRowColUndoEntry) {
    const {
      command: { sheet }
    } = operation

    this.uiOperations.unsetFrozenRowCol(sheet)
  }

  public undoSetRowSize(operation: SetRowSizeUndoEntry) {
    const { sheet, index, oldRowSize } = operation.command

    this.uiOperations.setRowSize(sheet, index, oldRowSize)
  }

  public undoSetColSize(operation: SetColSizeUndoEntry) {
    const { sheet, index, oldColSize } = operation.command

    this.uiOperations.setColSize(sheet, index, oldColSize)
  }

  public redoSetRowSize(operation: SetRowSizeUndoEntry) {
    const { sheet, index, newRowSize } = operation.command

    this.uiOperations.setRowSize(sheet, index, newRowSize)
  }

  public redoSetColSize(operation: SetColSizeUndoEntry) {
    const { sheet, index, newColSize } = operation.command

    this.uiOperations.setColSize(sheet, index, newColSize)
  }
}
