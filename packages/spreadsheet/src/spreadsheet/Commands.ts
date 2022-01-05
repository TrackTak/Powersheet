import { ColumnRowIndex } from '@tracktak/hyperformula'

export class SetFrozenRowColCommand {
  constructor(
    public readonly sheetName: string,
    public readonly indexes: ColumnRowIndex[]
  ) {}
}

export class UnsetFrozenRowColCommand {
  constructor(
    public readonly sheetName: string,
    public readonly indexes: ColumnRowIndex[]
  ) {}
}
