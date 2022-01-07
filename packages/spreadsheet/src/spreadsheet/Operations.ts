import { ColumnRowIndex, HyperFormula } from '@tracktak/hyperformula'
import { GenericDataRawCellContent } from '@tracktak/hyperformula/typings/CellContentParser'
import SimpleCellAddress, {
  CellId
} from './sheets/cells/cell/SimpleCellAddress'
import Data, { ICellMetadata, IMergedCell } from './sheets/Data'
import Merger from './sheets/Merger'
import Selector from './sheets/Selector'

class Operations {
  constructor(
    private readonly hyperformula: HyperFormula,
    private readonly data: Data,
    private readonly merger: Merger,
    private readonly selector: Selector
  ) {}

  public setFrozenRowCol(sheetId: number, indexes: ColumnRowIndex) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].frozenRow = indexes[0]
    this.data._spreadsheetData.uiSheets[sheetName].frozenCol = indexes[1]
  }

  public unsetFrozenRowCol(sheetId: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    delete this.data._spreadsheetData.uiSheets[sheetName].frozenRow
    delete this.data._spreadsheetData.uiSheets[sheetName].frozenCol
  }

  public setRowSize(sheetId: number, index: number, rowSize: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].rowSizes[index] = rowSize
  }

  public setColSize(sheetId: number, index: number, colSize: number) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    this.data._spreadsheetData.uiSheets[sheetName].colSizes[index] = colSize
  }

  public removeFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheet.frozenRow! -= amount
    }
  }

  public removeFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheet.frozenCol! -= amount
    }
  }

  public addFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheet.frozenRow! += amount
    }
  }

  public addFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheet.frozenCol! += amount
    }
  }

  public addMergedCellRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const key in mergedCells) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (
        index >
        simpleCellAddress.row + sheet.mergedCells[cellId].height - 1
      ) {
        continue
      }

      if (index <= simpleCellAddress.row) {
        const newCellId = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row + amount,
          simpleCellAddress.col
        ).toCellId()

        sheet.mergedCells[newCellId] = sheet.mergedCells[cellId]

        delete sheet.mergedCells[cellId]

        continue
      }

      sheet.mergedCells[cellId].height += amount

      this.setAssociatedMergedCells(simpleCellAddress, false)
    }
  }

  public removeMergedCellRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const key in mergedCells) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (
        index >
        simpleCellAddress.row + sheet.mergedCells[cellId].height - 1
      ) {
        continue
      }

      if (index < simpleCellAddress.row) {
        const newCellId = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row - amount,
          simpleCellAddress.col
        ).toCellId()

        sheet.mergedCells[newCellId] = sheet.mergedCells[cellId]

        delete sheet.mergedCells[cellId]

        continue
      }

      sheet.mergedCells[cellId].height -= amount

      this.setAssociatedMergedCells(simpleCellAddress, false)
    }
  }

  public addMergedCellCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const key in mergedCells) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (index > simpleCellAddress.col + sheet.mergedCells[cellId].width - 1) {
        continue
      }

      if (index <= simpleCellAddress.col) {
        const newCellId = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col + amount
        ).toCellId()

        sheet.mergedCells[newCellId] = sheet.mergedCells[cellId]

        delete sheet.mergedCells[cellId]

        continue
      }

      sheet.mergedCells[cellId].width += amount

      this.setAssociatedMergedCells(simpleCellAddress, false)
    }
  }

  public removeMergedCellCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const sheetName = this.hyperformula.getSheetName(sheetId)!

    const [index, amount] = indexes
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const key in mergedCells) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (index > simpleCellAddress.col + sheet.mergedCells[cellId].width - 1) {
        continue
      }

      if (index < simpleCellAddress.col) {
        const newCellId = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col - amount
        ).toCellId()

        sheet.mergedCells[newCellId] = sheet.mergedCells[cellId]

        delete sheet.mergedCells[cellId]

        continue
      }

      sheet.mergedCells[cellId].width -= amount

      this.setAssociatedMergedCells(simpleCellAddress, false)
    }
  }

  public mergeCells(
    topLeftSimpleCellAddress: SimpleCellAddress,
    width: number,
    height: number,
    clearRedoStack = true
  ) {
    const sheetName = this.hyperformula.getSheetName(
      topLeftSimpleCellAddress.sheet
    )!
    const mergedCellId = topLeftSimpleCellAddress.toCellId()
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    sheet.mergedCells[mergedCellId] = {
      height,
      width
    }

    const removedMergedCells: Record<CellId, IMergedCell> = {}

    for (const simpleCellAddress of this.merger._iterateMergedCellWidthHeight(
      topLeftSimpleCellAddress
    )) {
      const id = simpleCellAddress.toCellId()
      const mergedCell = sheet.mergedCells[id]

      if (mergedCell) {
        removedMergedCells[id] = mergedCell

        delete sheet.mergedCells[id]
      }
    }

    // TODO: Add moveCells in spreadsheet undoEntry for merged cells
    this.setAssociatedMergedCells(topLeftSimpleCellAddress, clearRedoStack)

    this.selector.selectedSimpleCellAddress = topLeftSimpleCellAddress

    return removedMergedCells
  }

  public unMergeCells(
    topLeftSimpleCellAddress: SimpleCellAddress,
    clearRedoStack = true
  ) {
    const cell = this.hyperformula.getCellSerialized<ICellMetadata>(
      topLeftSimpleCellAddress
    )
    const sheetName = this.hyperformula.getSheetName(
      topLeftSimpleCellAddress.sheet
    )!
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]
    const mergedCellId = topLeftSimpleCellAddress.toCellId()

    this.removeAssociatedMergedCells(
      topLeftSimpleCellAddress,
      cell,
      clearRedoStack
    )

    delete sheet.mergedCells[mergedCellId]
  }

  public restoreRemovedMergedCells(
    removedMergedCells: Record<CellId, IMergedCell>
  ) {
    if (removedMergedCells) {
      for (const key in removedMergedCells) {
        const cellId = key as CellId
        const { width, height } = removedMergedCells[cellId]
        const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

        this.mergeCells(simpleCellAddress, width, height, false)
      }
    }
  }

  private removeAssociatedMergedCells(
    topLeftSimpleCellAddress: SimpleCellAddress,
    { cellValue, metadata }: GenericDataRawCellContent<ICellMetadata>,
    clearRedoStack = true
  ) {
    this.hyperformula.suspendAddingUndoEntries()

    this.hyperformula.batch(() => {
      for (const address of this.merger._iterateMergedCellWidthHeight(
        topLeftSimpleCellAddress
      )) {
        this.hyperformula.setCellContents<ICellMetadata>(
          address,
          {
            cellValue,
            metadata
          },
          clearRedoStack
        )
      }
    })

    this.hyperformula.resumeAddingUndoEntries()
  }

  private setAssociatedMergedCells(
    simpleCellAddress: SimpleCellAddress,
    clearRedoStack = true
  ) {
    this.hyperformula.suspendAddingUndoEntries()

    this.hyperformula.batch(() => {
      for (const address of this.merger._iterateMergedCellWidthHeight(
        simpleCellAddress
      )) {
        const topLeftMergedCellRowOffset = address.row - simpleCellAddress.row
        const topLeftMergedCellColOffset = address.col - simpleCellAddress.col

        this.hyperformula.setCellContents<ICellMetadata>(
          address,
          {
            cellValue: undefined,
            metadata: {
              topLeftMergedCellRowOffset,
              topLeftMergedCellColOffset
            }
          },
          clearRedoStack
        )
      }
    })

    this.hyperformula.resumeAddingUndoEntries()
  }
}

export default Operations
