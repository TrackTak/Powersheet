import { ColumnRowIndex } from '@tracktak/hyperformula'
import SimpleCellAddress, {
  CellId
} from './sheets/cells/cell/SimpleCellAddress'
import { IMergedCell } from './sheets/Data'
// @ts-ignore
import { ClipboardCell } from '@tracktak/hyperformula/es/ClipboardOperations'

export class SetFrozenRowColCommand {
  constructor(
    public readonly sheet: number,
    public readonly indexes: ColumnRowIndex
  ) {}
}

export class UnsetFrozenRowColCommand {
  constructor(
    public readonly sheet: number,
    public readonly indexes: ColumnRowIndex
  ) {}
}

export class SetRowSizeCommand {
  constructor(
    public readonly sheet: number,
    public readonly index: number,
    public readonly oldRowSize: number,
    public readonly newRowSize: number
  ) {}
}

export class SetColSizeCommand {
  constructor(
    public readonly sheet: number,
    public readonly index: number,
    public readonly oldColSize: number,
    public readonly newColSize: number
  ) {}
}

export class MergeCellsCommand {
  constructor(
    public readonly topLeftSimpleCellAddress: SimpleCellAddress,
    public readonly width: number,
    public readonly height: number,
    public readonly removedMergedCells: Record<CellId, IMergedCell>,
    // public readonly oldContent: [SimpleCellAddress, ClipboardCell]
  ) {}
}

export class UnMergeCellsCommand {
  constructor(
    public readonly topLeftSimpleCellAddress: SimpleCellAddress,
    public readonly width: number,
    public readonly height: number
  ) {}
}
