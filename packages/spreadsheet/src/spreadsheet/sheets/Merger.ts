import { HyperFormula, SimpleCellAddress } from '@tracktak/hyperformula'
import { ISheetMetadata } from './Data'
import {
  addressToCellId,
  addressToSheetCellId,
  cellIdToAddress
} from '../utils'
import { CellId, SheetCellId } from './cells/cell/SimpleCellAddress'

class Merger {
  /**
   * The cells that make up a merged cell.
   */
  associatedMergedCellAddressMap: Record<SheetCellId, SheetCellId> = {}

  constructor(private _hyperformula: HyperFormula) {
    const sheetNames = this._hyperformula.getSheetNames()

    sheetNames.forEach(sheetName => {
      const sheetId = this._hyperformula.getSheetId(sheetName)!
      const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
        sheetId
      )

      for (const key in sheetMetadata.mergedCells) {
        const cellId = key as CellId

        this.setAssociatedMergedCells({
          sheet: sheetId,
          ...cellIdToAddress(cellId)
        })
      }
    })
  }

  /**
   * @internal
   */
  public *_iterateMergedCellWidthHeight(simpleCellAddress: SimpleCellAddress) {
    const { sheet, row, col } = simpleCellAddress
    const mergedCellId = addressToCellId(simpleCellAddress)
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )

    const { width, height } = sheetMetadata.mergedCells[mergedCellId] ?? {}

    if (width === undefined || height === undefined) return

    for (let index = 0; index < width; index++) {
      const newCol = col + index

      for (let index = 0; index < height; index++) {
        const newRow = row + index

        if (newRow === row && newCol === col) {
          continue
        }

        yield { sheet, row: newRow, col: newCol }
      }
    }
  }

  public setAssociatedMergedCells(simpleCellAddress: SimpleCellAddress) {
    for (const address of this._iterateMergedCellWidthHeight(
      simpleCellAddress
    )) {
      const sheetCellId = addressToSheetCellId(address)

      this.associatedMergedCellAddressMap[sheetCellId] = addressToSheetCellId(
        simpleCellAddress
      )
    }
  }

  public removeAssociatedMergedCells(
    topLeftSimpleCellAddress: SimpleCellAddress
  ) {
    for (const address of this._iterateMergedCellWidthHeight(
      topLeftSimpleCellAddress
    )) {
      const sheetCellId = addressToSheetCellId(address)

      delete this.associatedMergedCellAddressMap[sheetCellId]
    }
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  public getIsCellTopLeftMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCellId = addressToCellId(simpleCellAddress)
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )
    const mergedCell = sheetMetadata.mergedCells[mergedCellId]

    return mergedCell !== undefined
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  public getIsCellPartOfMerge(address: SimpleCellAddress) {
    const sheetCellId = addressToSheetCellId(address)

    return !!this.associatedMergedCellAddressMap[sheetCellId]
  }
}

export default Merger
