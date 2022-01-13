import { HyperFormula, SimpleCellAddress } from '@tracktak/hyperformula'
import { ICellMetadata, ISheetMetadata } from './Data'
import { addressToCellId, cellIdToAddress } from '../utils'
import { CellId } from './cells/cell/SimpleCellAddress'

class Merger {
  /**
   * The cells that make up a merged cell.
   */
  associatedMergedCellAddressMap: Record<CellId, CellId> = {}

  constructor(private _hyperformula: HyperFormula) {
    const sheetNames = this._hyperformula.getSheetNames()

    sheetNames.forEach(sheetName => {
      const sheetId = this._hyperformula.getSheetId(sheetName)!
      const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
        sheetId
      )

      for (const key in sheetMetadata.mergedCells) {
        const cellId = key as CellId

        this.setAssociatedMergedCells(cellIdToAddress(cellId))
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
    const {
      cellValue,
      metadata
    } = this._hyperformula.getCellSerialized<ICellMetadata>(simpleCellAddress)

    const { width: _, height: __, ...otherMetadata } = metadata ?? {}

    for (const address of this._iterateMergedCellWidthHeight(
      simpleCellAddress
    )) {
      const cellId = addressToCellId(address)

      this.associatedMergedCellAddressMap[cellId] = addressToCellId(
        simpleCellAddress
      )

      this._hyperformula.setCellContents(
        address,
        {
          cellValue,
          metadata: otherMetadata
        },
        false
      )
    }
  }

  public removeAssociatedMergedCells(
    topLeftSimpleCellAddress: SimpleCellAddress
  ) {
    for (const address of this._iterateMergedCellWidthHeight(
      topLeftSimpleCellAddress
    )) {
      const cellId = addressToCellId(address)

      delete this.associatedMergedCellAddressMap[cellId]
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
  public getIsCellPartOfMerge(simpleCellAddress: SimpleCellAddress) {
    const cellId = addressToCellId(simpleCellAddress)

    return !!this.associatedMergedCellAddressMap[cellId]
  }
}

export default Merger
