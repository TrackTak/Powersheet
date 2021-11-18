import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import Sheets from './Sheets'

class Merger {
  /**
   * The cells that make up a merged cell.
   */
  associatedMergedCellAddressMap: Record<CellId, CellId> = {}
  private spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private sheets: Sheets) {
    this.spreadsheet = this.sheets.spreadsheet
  }

  private *iterateAssociatedMergedCells(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId()
    const mergedCell =
      this.spreadsheet.data.spreadsheetData.mergedCells?.[cellId]

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
  setAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
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
  deleteAssociatedMergedCellIds(simpleCellAddress: SimpleCellAddress) {
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
      this.spreadsheet.data.spreadsheetData.cells?.[mergedCellId]

    this.spreadsheet.data.setMergedCell(
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
      this.spreadsheet.data.setCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        existingTopLeftCell
      )
    }

    this.sheets.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress

    this.spreadsheet.render()
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const sheet = rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet
    const mergedCells = this.spreadsheet.data.spreadsheetData.mergedCells

    if (
      this.spreadsheet.data.getIsCellAMergedCell(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      )
    ) {
      const cell =
        this.spreadsheet.data.spreadsheetData.cells?.[
          rangeSimpleCellAddress.topLeftSimpleCellAddress.toCellId()
        ]

      if (cell) {
        this.spreadsheet.hyperformula.batch(() => {
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

              this.spreadsheet.data.setCell(associatedSimpleCellAddress, cell)
            }
          }
        })
      }
    }

    this.sheets.cells.cellsMap.forEach((cell, cellId) => {
      const simpleCellAddress = SimpleCellAddress.cellIdToAddress(cellId)

      if (
        this.spreadsheet.data.getIsCellAMergedCell(simpleCellAddress) &&
        mergedCells
      ) {
        const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
          rangeSimpleCellAddress,
          cell.rangeSimpleCellAddress
        )

        if (areMergedCellsOverlapping) {
          this.spreadsheet.data.deleteMergedCell(simpleCellAddress)
        }
      }
    })

    this.spreadsheet.render()
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
    const selectedCells = this.sheets.selector.selectedCells

    if (!selectedCells.length) return

    const rangeSimpleCellAddress =
      this.sheets.getMinMaxRangeSimpleCellAddress(selectedCells)

    this.spreadsheet.pushToHistory(() => {
      this.addMergedCells(rangeSimpleCellAddress)
    })
  }

  unMergeSelectedCells() {
    const selectedCells = this.sheets.selector.selectedCells

    if (!selectedCells.length) return

    const rangeSimpleCellAddress =
      this.sheets.getMinMaxRangeSimpleCellAddress(selectedCells)

    this.spreadsheet.pushToHistory(() => {
      this.removeMergedCells(rangeSimpleCellAddress)
    })
  }
}

export default Merger
