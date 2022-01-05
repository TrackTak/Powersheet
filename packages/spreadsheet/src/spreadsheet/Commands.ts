import { ColumnRowIndex } from '@tracktak/hyperformula'

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
