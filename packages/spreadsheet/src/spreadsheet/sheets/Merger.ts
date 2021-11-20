import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import Sheets from './Sheets'

class Merger {
  /**
   * The cells that make up a merged cell.
   */
  associatedMergedCellAddressMap: Record<CellId, CellId> = {}
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets.spreadsheet
  }

  private *iterateAssociatedMergedCells(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId()
    const mergedCell =
      this._spreadsheet.data._spreadsheetData.mergedCells?.[cellId]

    if (mergedCell) {
      const rangeSimpleCellAddress =
        RangeSimpleCellAddress.mergedCellToAddress(mergedCell)

      for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          const associatedSimpleCellAddress = new SimpleCellAddress(
            simpleCellAddress.sheet,
            ri,
            ci
          )

          yield { associatedSimpleCellAddress, rangeSimpleCellAddress }
        }
      }
    }
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  getIsCellPartOfMerge(simpleCellAddress: SimpleCellAddress) {
    return !!this.associatedMergedCellAddressMap[simpleCellAddress.toCellId()]
  }

  /**
   * @internal
   */
  _setAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
    for (const {
      associatedSimpleCellAddress,
      rangeSimpleCellAddress
    } of this.iterateAssociatedMergedCells(simpleCellAddress)) {
      this.associatedMergedCellAddressMap[
        associatedSimpleCellAddress.toCellId()
      ] = rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
    }
  }

  /**
   * @internal
   */
  _deleteAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
    for (const {
      associatedSimpleCellAddress
    } of this.iterateAssociatedMergedCells(simpleCellAddress)) {
      delete this.associatedMergedCellAddressMap[
        associatedSimpleCellAddress.toCellId()
      ]
    }
  }

  addMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const mergedCellId =
      rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
    const existingTopLeftCell =
      this._spreadsheet.data._spreadsheetData.cells?.[mergedCellId]

    this._spreadsheet.data.setMergedCell(
      rangeSimpleCellAddress.topLeftSimpleCellAddress,
      {
        row: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.row
        },
        col: {
          x: rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
          y: rangeSimpleCellAddress.bottomRightSimpleCellAddress.col
        }
      }
    )

    if (existingTopLeftCell) {
      this._spreadsheet.data.setCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        existingTopLeftCell
      )
    }

    this._sheets.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress

    this._spreadsheet.render()
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const sheet = rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet
    const mergedCells = this._spreadsheet.data._spreadsheetData.mergedCells

    if (
      this._spreadsheet.data.getIsCellAMergedCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      )
    ) {
      const cell =
        this._spreadsheet.data._spreadsheetData.cells?.[
          rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
        ]

      if (cell) {
        this._spreadsheet.hyperformula.batch(() => {
          for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom(
            'row'
          )) {
            for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom(
              'col'
            )) {
              const associatedSimpleCellAddress = new SimpleCellAddress(
                sheet,
                ri,
                ci
              )

              this._spreadsheet.data.setCell(associatedSimpleCellAddress, cell)
            }
          }
        })
      }
    }

    this._sheets.cells.cellsMap.forEach((cell, cellId) => {
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (
        this._spreadsheet.data.getIsCellAMergedCell(simpleCellAddress) &&
        mergedCells
      ) {
        const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
          rangeSimpleCellAddress,
          cell.rangeSimpleCellAddress
        )

        if (areMergedCellsOverlapping) {
          this._spreadsheet.data.deleteMergedCell(simpleCellAddress)
        }
      }
    })

    this._spreadsheet.render()
  }

  getAreMergedCellsOverlapping(
    firstRangeSimpleCellAddress: RangeSimpleCellAddress,
    secondRangeSimpleCellAddress: RangeSimpleCellAddress
  ) {
    const isFirstOverlappingSecond =
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col

    const isSecondOverlappingFirst =
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
        secondRangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.row <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.row &&
      firstRangeSimpleCellAddress.bottomRightSimpleCellAddress.col <=
        secondRangeSimpleCellAddress.bottomRightSimpleCellAddress.col

    return isFirstOverlappingSecond || isSecondOverlappingFirst
  }

  mergeSelectedCells() {
    const selectedCells = this._sheets.selector.selectedCells

    if (!selectedCells.length) return

    const rangeSimpleCellAddress =
      this._sheets._getMinMaxRangeSimpleCellAddress(selectedCells)

    this._spreadsheet.pushToHistory(() => {
      this.addMergedCells(rangeSimpleCellAddress)
    })
  }

  unMergeSelectedCells() {
    const selectedCells = this._sheets.selector.selectedCells

    if (!selectedCells.length) return

    const rangeSimpleCellAddress =
      this._sheets._getMinMaxRangeSimpleCellAddress(selectedCells)

    this._spreadsheet.pushToHistory(() => {
      this.removeMergedCells(rangeSimpleCellAddress)
    })
  }
}

export default Merger
