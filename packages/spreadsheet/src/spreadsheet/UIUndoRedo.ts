import { HyperFormula, UndoRedo } from '@tracktak/hyperformula'
import {
  MergeCellsCommand,
  SetColSizeCommand,
  SetFrozenRowColCommand,
  SetRowSizeCommand,
  UnMergeCellsCommand,
  UnsetFrozenRowColCommand
} from './Commands'
import Operations from './Operations'

export interface IUIBaseUndoRedoEntry {
  doUndo(undoRedo: UIUndoRedo): void
  doRedo(undoRedo: UIUndoRedo): void
}

export class UIBaseUndoRedoEntry {
  constructor(private hyperformula: HyperFormula) {}

  public undoOperation(operation: () => void) {
    this.hyperformula.suspendAddingUndoEntries()
    operation()
    this.hyperformula.resumeAddingUndoEntries()
  }

  public redoOperation(operation: () => void) {
    this.hyperformula.suspendAddingUndoEntries()
    operation()
    this.hyperformula.resumeAddingUndoEntries()
  }
}

export class SetFrozenRowColUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: SetFrozenRowColCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoSetFrozenRowCol(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoSetFrozenRowCol(this)
    })
  }
}

export class UnsetFrozenRowColUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: UnsetFrozenRowColCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoUnsetFrozenRowCol(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoUnsetFrozenRowCol(this)
    })
  }
}

export class SetRowSizeUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: SetRowSizeCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoSetRowSize(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoSetRowSize(this)
    })
  }
}

export class SetColSizeUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: SetColSizeCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoSetColSize(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoSetColSize(this)
    })
  }
}

export class MergeCellsUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: MergeCellsCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoMergeCells(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoMergeCells(this)
    })
  }
}

export class UnMergeCellsUndoEntry
  extends UIBaseUndoRedoEntry
  implements IUIBaseUndoRedoEntry
{
  constructor(
    hyperformula: HyperFormula,
    public readonly command: UnMergeCellsCommand
  ) {
    super(hyperformula)
  }

  public doUndo(undoRedo: UIUndoRedo): void {
    this.undoOperation(() => {
      undoRedo.undoUnMergeCells(this)
    })
  }

  public doRedo(undoRedo: UIUndoRedo): void {
    this.redoOperation(() => {
      undoRedo.redoUnMergeCells(this)
    })
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

  public undoSetRowSize(operation: SetRowSizeUndoEntry) {
    const { sheet, index, oldRowSize } = operation.command

    this.uiOperations.setRowSize(sheet, index, oldRowSize)
  }

  public undoSetColSize(operation: SetColSizeUndoEntry) {
    const { sheet, index, oldColSize } = operation.command

    this.uiOperations.setColSize(sheet, index, oldColSize)
  }

  public undoMergeCells(operation: MergeCellsUndoEntry) {
    const { topLeftSimpleCellAddress, removedMergedCells } = operation.command

    this.uiOperations.removeMergedCells(topLeftSimpleCellAddress)
    this.uiOperations.restoreRemovedMergedCells(removedMergedCells)
  }

  public undoUnMergeCells(operation: UnMergeCellsUndoEntry) {
    const { topLeftSimpleCellAddress, width, height } = operation.command

    this.uiOperations.mergeCells(topLeftSimpleCellAddress, width, height)
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

  public redoSetRowSize(operation: SetRowSizeUndoEntry) {
    const { sheet, index, newRowSize } = operation.command

    this.uiOperations.setRowSize(sheet, index, newRowSize)
  }

  public redoSetColSize(operation: SetColSizeUndoEntry) {
    const { sheet, index, newColSize } = operation.command

    this.uiOperations.setColSize(sheet, index, newColSize)
  }

  public redoMergeCells(operation: MergeCellsUndoEntry) {
    const { topLeftSimpleCellAddress, width, height } = operation.command

    this.uiOperations.mergeCells(topLeftSimpleCellAddress, width, height)
  }

  public redoUnMergeCells(operation: UnMergeCellsUndoEntry) {
    const { topLeftSimpleCellAddress } = operation.command

    this.uiOperations.unMergeCells(topLeftSimpleCellAddress)
  }
}
