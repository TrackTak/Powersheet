import {
  ColumnRowIndex,
  HyperFormula,
  SimpleCellAddress as HFSimpleCellAddress
} from '@tracktak/hyperformula'
// @ts-ignore
import { ClipboardCell } from '@tracktak/hyperformula/es/ClipboardOperations'
import { InputCell } from '@tracktak/hyperformula/typings/CellContentParser'
import { CellMetadata } from '@tracktak/hyperformula/typings/interpreter/InterpreterValue'
import SimpleCellAddress, {
  CellId
} from './sheets/cells/cell/SimpleCellAddress'
import { ICellMetadata, IMergedCell, ISheetMetadata } from './sheets/Data'
import Merger from './sheets/Merger'
import Selector from './sheets/Selector'

class Operations {
  constructor(
    private readonly _hyperformula: HyperFormula,
    private readonly _merger: Merger,
    private readonly _selector: Selector
  ) {}

  public setFrozenRowCol(sheetId: number, indexes: ColumnRowIndex) {
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    sheetMetadata.frozenRow = indexes[0]
    sheetMetadata.frozenCol = indexes[1]
  }

  public unsetFrozenRowCol(sheetId: number) {
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    delete sheetMetadata.frozenRow
    delete sheetMetadata.frozenCol
  }

  public setRowSize(sheetId: number, index: number, rowSize: number) {
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    sheetMetadata.rowSizes[index] = rowSize
  }

  public setColSize(sheetId: number, index: number, colSize: number) {
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    sheetMetadata.colSizes[index] = colSize
  }

  public removeFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheetMetadata.frozenRow! -= amount
    }
  }

  public removeFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheetMetadata.frozenCol! -= amount
    }
  }

  public addFrozenRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenRow: number | undefined
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    if (frozenRow === undefined) return

    if (index <= frozenRow) {
      sheetMetadata.frozenRow! += amount
    }
  }

  public addFrozenCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    frozenCol: number | undefined
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    if (frozenCol === undefined) return

    if (index <= frozenCol) {
      sheetMetadata.frozenCol! += amount
    }
  }

  public addMergedCellRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    for (const key of Object.keys(mergedCells).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    )) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
      const { width, height } = sheetMetadata.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.row + sheetMetadata.mergedCells[cellId].height - 1
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
        this._merger.removeAssociatedMergedCells(simpleCellAddress)
        this._merger.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this._merger.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width, height + amount)
      this._merger.setAssociatedMergedCells(simpleCellAddress)
    }
  }

  public removeMergedCellRows(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    for (const key of Object.keys(mergedCells).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
      const { width, height } = sheetMetadata.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.row + sheetMetadata.mergedCells[cellId].height - 1
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
        this._merger.removeAssociatedMergedCells(simpleCellAddress)
        this._merger.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this._merger.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width, height - amount)
      this._merger.setAssociatedMergedCells(simpleCellAddress)
    }
  }

  public addMergedCellCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    for (const key of Object.keys(mergedCells).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    )) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
      const { width, height } = sheetMetadata.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.col + sheetMetadata.mergedCells[cellId].width - 1
      ) {
        continue
      }

      if (index <= simpleCellAddress.col) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col + amount
        )
        this.setMergedCell(newSimpleCellAddress, width, height)
        this._merger.removeAssociatedMergedCells(simpleCellAddress)
        this._merger.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this._merger.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width + amount, height)
      this._merger.setAssociatedMergedCells(simpleCellAddress)
    }
  }

  public removeMergedCellCols(
    sheetId: number,
    indexes: ColumnRowIndex,
    mergedCells: Record<CellId, IMergedCell>
  ) {
    const [index, amount] = indexes
    const sheetMetadata =
      this._hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    for (const key of Object.keys(mergedCells).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )) {
      const cellId = key as CellId
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)
      const { width, height } = sheetMetadata.mergedCells[cellId]

      if (
        index >
        simpleCellAddress.col + sheetMetadata.mergedCells[cellId].width - 1
      ) {
        continue
      }

      if (index < simpleCellAddress.col) {
        const newSimpleCellAddress = new SimpleCellAddress(
          sheetId,
          simpleCellAddress.row,
          simpleCellAddress.col - amount
        )

        this.setMergedCell(newSimpleCellAddress, width, height)
        this._merger.removeAssociatedMergedCells(simpleCellAddress)
        this._merger.setAssociatedMergedCells(newSimpleCellAddress)
        this.deleteMergedCell(simpleCellAddress)

        continue
      }

      this._merger.removeAssociatedMergedCells(simpleCellAddress)
      this.setMergedCell(simpleCellAddress, width - amount, height)
      this._merger.setAssociatedMergedCells(simpleCellAddress)
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
    this._merger.setAssociatedMergedCells(topLeftSimpleCellAddress)

    this._selector.selectedSimpleCellAddress = topLeftSimpleCellAddress

    return removedMergedCells
  }

  public removeMergedCells(topLeftSimpleCellAddress: SimpleCellAddress) {
    this._merger.removeAssociatedMergedCells(topLeftSimpleCellAddress)
    this.deleteMergedCell(topLeftSimpleCellAddress)
  }

  public unMergeCells(topLeftSimpleCellAddress: SimpleCellAddress) {
    const { cellValue, metadata } =
      this._hyperformula.getCellSerialized<ICellMetadata>(
        topLeftSimpleCellAddress
      )

    for (const address of this._merger._iterateMergedCellWidthHeight(
      topLeftSimpleCellAddress
    )) {
      const associatedCellSerialized =
        this._hyperformula.getCellSerialized<ICellMetadata>(address)

      const cellContent: InputCell<CellMetadata> = {
        metadata
      }

      // Do not set it if it's the same value otherwise HF will
      // throw not computed errors if it's set twice
      if (associatedCellSerialized.cellValue !== cellValue) {
        cellContent.cellValue = cellValue
      }

      this._hyperformula.setCellContents(address, cellContent, false)
    }

    this.removeMergedCells(topLeftSimpleCellAddress)
  }

  public moveMergedCells(
    sourceLeftCorner: HFSimpleCellAddress,
    targetLeftCorner: HFSimpleCellAddress,
    width: number,
    height: number
  ) {
    const removedCells = this.setMergedCellsAtTargetAddress(
      sourceLeftCorner,
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

        this.removeMergedCells(simpleCellAddress)
      }
    }

    return removedCells
  }

  public pasteMergedCells(
    sourceLeftCorner: HFSimpleCellAddress,
    targetLeftCorner: HFSimpleCellAddress,
    newContent: ClipboardCell[][]
  ) {
    const height = newContent.length
    const width = newContent[0].length

    return this.setMergedCellsAtTargetAddress(
      sourceLeftCorner,
      targetLeftCorner,
      width,
      height
    )
  }

  public setMergedCellsAtTargetAddress(
    sourceLeftCorner: HFSimpleCellAddress,
    targetLeftCorner: HFSimpleCellAddress,
    width: number,
    height: number
  ) {
    let removedMergedCells: Record<CellId, IMergedCell> = {}
    const sourceSimpleCellAddress = new SimpleCellAddress(
      sourceLeftCorner.sheet,
      sourceLeftCorner.row,
      sourceLeftCorner.col
    )

    const mergedCellId = sourceSimpleCellAddress.toCellId()
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      sourceSimpleCellAddress.sheet
    )
    const mergedCell = sheetMetadata.mergedCells[mergedCellId]

    const recentlyMergedCellIds: Record<CellId, CellId> = {}

    for (let index = 0; index < width; index++) {
      const col = targetLeftCorner.col + index

      for (let index = 0; index < height; index++) {
        const row = targetLeftCorner.row + index
        const targetSimpleCellAddress = new SimpleCellAddress(
          targetLeftCorner.sheet,
          row,
          col
        )
        const targetCellId = targetSimpleCellAddress.toCellId()
        const targetMergedCellId =
          this._merger.associatedMergedCellAddressMap[targetCellId]

        if (
          mergedCell?.width !== undefined &&
          mergedCell?.height !== undefined &&
          !recentlyMergedCellIds[targetMergedCellId]
        ) {
          recentlyMergedCellIds[targetCellId] = targetCellId
          removedMergedCells = {
            ...this.mergeCells(
              targetSimpleCellAddress,
              mergedCell.width,
              mergedCell.height
            )
          }
        }
      }
    }

    return removedMergedCells
  }

  public restoreRemovedMergedCells(
    removedMergedCells: Record<CellId, IMergedCell>
  ) {
    if (removedMergedCells) {
      for (const key in removedMergedCells) {
        const cellId = key as CellId
        const { width, height } = removedMergedCells[cellId]
        const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

        this.mergeCells(simpleCellAddress, width, height)
      }
    }
  }

  public removeSheet(
    name: string,
    sheetNames: string[],
    sheetId: number,
    activeSheetId: number
  ) {
    let newSheetId = activeSheetId

    if (activeSheetId === sheetId) {
      const currentIndex = sheetNames.indexOf(name)

      if (currentIndex === 0) {
        const sheetId = this._hyperformula.getSheetId(sheetNames[1])!

        newSheetId = sheetId
      } else {
        const sheetId = this._hyperformula.getSheetId(
          sheetNames[currentIndex - 1]
        )!

        newSheetId = sheetId
      }
    }

    return newSheetId
  }

  private setMergedCell(
    simpleCellAddress: SimpleCellAddress,
    width: number,
    height: number
  ) {
    const mergedCellId = simpleCellAddress.toCellId()
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )

    sheetMetadata.mergedCells[mergedCellId] = {
      height,
      width
    }
  }

  private deleteMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCellId = simpleCellAddress.toCellId()
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )

    delete sheetMetadata.mergedCells[mergedCellId]
  }

  private unMergeExistingCells(
    simpleCellAddress: SimpleCellAddress,
    width: number,
    height: number
  ) {
    const removedMergedCells: Record<CellId, IMergedCell> = {}
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )

    for (let index = 0; index < width; index++) {
      const col = simpleCellAddress.col + index

      for (let index = 0; index < height; index++) {
        const row = simpleCellAddress.row + index
        const newSimpleCellAddress = new SimpleCellAddress(
          simpleCellAddress.sheet,
          row,
          col
        )

        if (this._merger.getIsCellTopLeftMergedCell(newSimpleCellAddress)) {
          const mergedCellId = newSimpleCellAddress.toCellId()

          removedMergedCells[mergedCellId] =
            sheetMetadata.mergedCells[mergedCellId]

          this.removeMergedCells(newSimpleCellAddress)
        }

        if (this._merger.getIsCellPartOfMerge(newSimpleCellAddress)) {
          const associatedMergedCellId = newSimpleCellAddress.toCellId()
          const mergedCellId =
            this._merger.associatedMergedCellAddressMap[associatedMergedCellId]
          const mergedCellAddress =
            SimpleCellAddress.cellIdToAddress(mergedCellId)

          removedMergedCells[mergedCellId] =
            sheetMetadata.mergedCells[mergedCellId]

          this.removeMergedCells(mergedCellAddress)
        }
      }
    }
    return removedMergedCells
  }
}

export default Operations
