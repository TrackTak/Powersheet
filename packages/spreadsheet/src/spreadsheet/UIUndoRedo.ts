import { HyperFormula, UndoRedo } from '@tracktak/hyperformula'
import { SetFrozenRowColCommand, UnsetFrozenRowColCommand } from './Commands'
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
}
