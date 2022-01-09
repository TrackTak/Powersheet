import {
  ColumnRowIndex,
  HyperFormula,
  SimpleCellAddress as HFSimpleCellAddress
} from '@tracktak/hyperformula'
// @ts-ignore
import { ClipboardCell } from '@tracktak/hyperformula/es/ClipboardOperations'
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
      const { width, height } = sheet.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.row + sheet.mergedCells[cellId].height - 1
      ) {
        continue
      }

      if (index <= simpleCellAddress.row) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row + amount,
          simpleCellAddress.col
        )

        this.setMergedCell(newSimpleCellAddress, width, height)
        this.removeAssociatedMergedCells(simpleCellAddress)
        this.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width, height + amount)
      this.setAssociatedMergedCells(simpleCellAddress)
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
      const { width, height } = sheet.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.row + sheet.mergedCells[cellId].height - 1
      ) {
        continue
      }

      if (index < simpleCellAddress.row) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row - amount,
          simpleCellAddress.col
        )

        this.setMergedCell(newSimpleCellAddress, width, height)
        this.removeAssociatedMergedCells(simpleCellAddress)
        this.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width, height - amount)
      this.setAssociatedMergedCells(simpleCellAddress)
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
      const { width, height } = sheet.mergedCells[cellId]

      if (index > simpleCellAddress.col + sheet.mergedCells[cellId].width - 1) {
        continue
      }

      if (index <= simpleCellAddress.col) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col + amount
        )
        this.setMergedCell(newSimpleCellAddress, width, height)
        this.removeAssociatedMergedCells(simpleCellAddress)
        this.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width + amount, height)
      this.setAssociatedMergedCells(simpleCellAddress)
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
      const { width, height } = sheet.mergedCells[cellId]

      if (index > simpleCellAddress.col + sheet.mergedCells[cellId].width - 1) {
        continue
      }

      if (index < simpleCellAddress.col) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col - amount
        )

        this.setMergedCell(newSimpleCellAddress, width, height)
        this.removeAssociatedMergedCells(simpleCellAddress)
        this.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width - amount, height)
      this.setAssociatedMergedCells(simpleCellAddress)
    }
  }

  public mergeCells(
    topLeftSimpleCellAddress: SimpleCellAddress,
    width: number,
    height: number
  ) {
    const removedMergedCells = this.unMergeExistingCells(
      topLeftSimpleCellAddress,
      width,
      height
    )

    this.setMergedCell(topLeftSimpleCellAddress, width, height)
    this.setAssociatedMergedCells(topLeftSimpleCellAddress)

    this.selector.selectedSimpleCellAddress = topLeftSimpleCellAddress

    return removedMergedCells
  }

  public unMergeCells(topLeftSimpleCellAddress: SimpleCellAddress) {
    this.removeAssociatedMergedCells(topLeftSimpleCellAddress)
    this.deleteMergedCell(topLeftSimpleCellAddress)
  }

  public removeMergedCells(mergedCells: Record<CellId, IMergedCell>) {
    if (mergedCells) {
      for (const key in mergedCells) {
        const cellId = key as CellId
        const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

        this.unMergeCells(simpleCellAddress)
      }
    }
  }

  public moveMergedCells(
    sourceLeftCorner: HFSimpleCellAddress,
    targetLeftCorner: HFSimpleCellAddress,
    width: number,
    height: number
  ) {
    const removedCells = this.setMergedCellsAtTargetAddress(
      targetLeftCorner,
      width,
      height
    )

    for (let index = 0; index < width; index++) {
      const col = sourceLeftCorner.col + index

      for (let index = 0; index < height; index++) {
        const row = sourceLeftCorner.row + index
        const simpleCellAddress = new SimpleCellAddress(
          sourceLeftCorner.sheet,
          row,
          col
        )

        this.unMergeCells(simpleCellAddress)
      }
    }

    return removedCells
  }

  public pasteMergedCells(
    targetLeftCorner: HFSimpleCellAddress,
    newContent: ClipboardCell[][]
  ) {
    const height = newContent.length
    const width = newContent[0].length

    return this.setMergedCellsAtTargetAddress(targetLeftCorner, width, height)
  }

  public setMergedCellsAtTargetAddress(
    targetLeftCorner: HFSimpleCellAddress,
    width: number,
    height: number
  ) {
    let removedMergedCells: Record<CellId, IMergedCell> = {}

    for (let index = 0; index < width; index++) {
      const col = targetLeftCorner.col + index

      for (let index = 0; index < height; index++) {
        const row = targetLeftCorner.row + index
        const simpleCellAddress = new SimpleCellAddress(
          targetLeftCorner.sheet,
          row,
          col
        )
        const { metadata } =
          this.hyperformula.getCellSerialized<ICellMetadata>(simpleCellAddress)

        if (metadata?.width !== undefined && metadata?.height !== undefined) {
          removedMergedCells = {
            ...this.mergeCells(
              simpleCellAddress,
              metadata.width,
              metadata.height
            )
          }
        }
      }
    }

    return removedMergedCells
  }

  private setMergedCell(
    simpleCellAddress: SimpleCellAddress,
    width: number,
    height: number
  ) {
    const sheetName = this.hyperformula.getSheetName(simpleCellAddress.sheet)!
    const mergedCellId = simpleCellAddress.toCellId()
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    sheet.mergedCells[mergedCellId] = {
      height,
      width
    }

    const { cellValue, metadata } =
      this.hyperformula.getCellSerialized<ICellMetadata>(simpleCellAddress)

    this.hyperformula.suspendAddingUndoEntries()

    this.hyperformula.setCellContents<ICellMetadata>(
      simpleCellAddress,
      {
        cellValue,
        metadata: {
          ...metadata,
          height,
          width
        }
      },
      false
    )

    this.hyperformula.resumeAddingUndoEntries()
  }

  private deleteMergedCell(simpleCellAddress: SimpleCellAddress) {
    const sheetName = this.hyperformula.getSheetName(simpleCellAddress.sheet)!
    const mergedCellId = simpleCellAddress.toCellId()
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    delete sheet.mergedCells[mergedCellId]

    const { cellValue, metadata } =
      this.hyperformula.getCellSerialized<ICellMetadata>(simpleCellAddress)
    const { width, height, ...otherMetadata } = metadata ?? {}

    this.hyperformula.suspendAddingUndoEntries()

    this.hyperformula.setCellContents<ICellMetadata>(
      simpleCellAddress,
      {
        cellValue: cellValue,
        metadata: otherMetadata
      },
      false
    )

    this.hyperformula.resumeAddingUndoEntries()
  }

  private unMergeExistingCells(
    simpleCellAddress: SimpleCellAddress,
    width: number,
    height: number
  ) {
    const removedMergedCells: Record<CellId, IMergedCell> = {}
    const sheetName = this.hyperformula.getSheetName(simpleCellAddress.sheet)!
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (let index = 0; index < width; index++) {
      const col = simpleCellAddress.col + index

      for (let index = 0; index < height; index++) {
        const row = simpleCellAddress.row + index
        const newSimpleCellAddress = new SimpleCellAddress(
          simpleCellAddress.sheet,
          row,
          col
        )

        if (this.merger.getIsCellTopLeftMergedCell(newSimpleCellAddress)) {
          const mergedCellId = newSimpleCellAddress.toCellId()

          removedMergedCells[mergedCellId] = sheet.mergedCells[mergedCellId]

          this.unMergeCells(newSimpleCellAddress)
        }

        if (this.merger.getIsCellPartOfMerge(newSimpleCellAddress)) {
          const associatedMergedCellId = newSimpleCellAddress.toCellId()
          const mergedCellId =
            sheet.associatedMergedCells[associatedMergedCellId]
          const mergedCellAddress =
            SimpleCellAddress.cellIdToAddress(mergedCellId)

          removedMergedCells[mergedCellId] = sheet.mergedCells[mergedCellId]

          this.unMergeCells(mergedCellAddress)
        }
      }
    }
    return removedMergedCells
  }

  private removeAssociatedMergedCells(
    topLeftSimpleCellAddress: SimpleCellAddress
  ) {
    const sheetName = this.hyperformula.getSheetName(
      topLeftSimpleCellAddress.sheet
    )!
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const address of this.merger._iterateMergedCellWidthHeight(
      topLeftSimpleCellAddress
    )) {
      const cellId = address.toCellId()

      delete sheet.associatedMergedCells[cellId]
    }
  }

  private setAssociatedMergedCells(simpleCellAddress: SimpleCellAddress) {
    const sheetName = this.hyperformula.getSheetName(simpleCellAddress.sheet)!
    const sheet = this.data._spreadsheetData.uiSheets[sheetName]

    for (const address of this.merger._iterateMergedCellWidthHeight(
      simpleCellAddress
    )) {
      const cellId = address.toCellId()

      sheet.associatedMergedCells[cellId] = simpleCellAddress.toCellId()
    }
  }
}

export default Operations
