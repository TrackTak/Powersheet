import { HyperFormula, SimpleCellAddress } from '@tracktak/hyperformula'
import { ISheetMetadata } from './Data'
import { addressToCellId } from '../utils'

class Merger {
  constructor(private _hyperformula: HyperFormula) {}

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
    const sheetMetadata = this._hyperformula.getSheetMetadata<ISheetMetadata>(
      simpleCellAddress.sheet
    )

    return !!sheetMetadata.associatedMergedCells[cellId]
  }
}

export default Merger
