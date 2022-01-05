import { ColumnRowIndex } from '@tracktak/hyperformula'

export class SetFrozenRowColCommand {
  constructor(
    public readonly sheet: number,
    public readonly indexes: ColumnRowIndex[]
  ) {}
}

export class UnsetFrozenRowColCommand {
  constructor(
    public readonly sheet: number,
    public readonly indexes: ColumnRowIndex[]
  ) {}
}
