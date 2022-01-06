import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import Sheets from './Sheets'
import { ICellMetadata } from './Data'

class Merger {
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
  }

  /**
   * @internal
   */
  *_iterateMergedCellWidthHeight(
    simpleCellAddress: SimpleCellAddress,
    width: number | undefined = 1,
    height: number | undefined = 1
  ) {
    for (let index = 0; index < width; index++) {
      const col = simpleCellAddress.col + index

      for (let index = 0; index < height; index++) {
        const row = simpleCellAddress.row + index
        const address = {
          sheet: simpleCellAddress.sheet,
          row,
          col
        }

        if (row === simpleCellAddress.row && col === simpleCellAddress.col) {
          continue
        }

        yield address
      }
    }
  }

  getTopLeftMergedCellAddressFromOffsets(
    simpleCellAddress: SimpleCellAddress,
    topLeftMergedCellRowOffset: number | undefined,
    topLeftMergedCellColOffset: number | undefined
  ) {
    if (
      topLeftMergedCellRowOffset === undefined ||
      topLeftMergedCellColOffset === undefined
    ) {
      throw new Error('offsets cannot be undefined')
    }

    const row = simpleCellAddress.row - topLeftMergedCellRowOffset
    const col = simpleCellAddress.col - topLeftMergedCellColOffset

    const newSimpleCellAddress = new SimpleCellAddress(
      simpleCellAddress.sheet,
      row,
      col
    )

    return newSimpleCellAddress
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  getIsCellTopLeftMergedCell(simpleCellAddress: SimpleCellAddress) {
    const { metadata } =
      this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        simpleCellAddress
      ) ?? {}

    return metadata?.width !== undefined || metadata?.height !== undefined
  }

  /**
   * @returns If the cell is part of the merged cell.
   */
  getIsCellPartOfMerge(simpleCellAddress: SimpleCellAddress) {
    const { metadata } =
      this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        simpleCellAddress
      ) ?? {}

    return (
      metadata?.topLeftMergedCellRowOffset !== undefined ||
      metadata?.topLeftMergedCellColOffset !== undefined
    )
  }

  addMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const { cellValue, metadata } =
      this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      ) ?? {}

    const width = rangeSimpleCellAddress.width()
    const height = rangeSimpleCellAddress.height()

    this._spreadsheet.hyperformula.batch(() => {
      for (const address of this._iterateMergedCellWidthHeight(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        width,
        height
      )) {
        const topLeftMergedCellRowOffset =
          address.row - rangeSimpleCellAddress.topLeftSimpleCellAddress.row
        const topLeftMergedCellColOffset =
          address.col - rangeSimpleCellAddress.topLeftSimpleCellAddress.col

        this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(address, {
          cellValue: undefined,
          metadata: {
            topLeftMergedCellRowOffset,
            topLeftMergedCellColOffset
          }
        })
      }
      this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
        {
          ...rangeSimpleCellAddress.topLeftSimpleCellAddress
        },
        {
          cellValue,
          metadata: {
            ...metadata,
            height,
            width
          }
        }
      )
    })

    this._sheets.selector.selectedSimpleCellAddress =
      rangeSimpleCellAddress.topLeftSimpleCellAddress

    this._spreadsheet.render()
  }

  removeMergedCells(rangeSimpleCellAddress: RangeSimpleCellAddress) {
    const { cellValue, metadata } =
      this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        rangeSimpleCellAddress.topLeftSimpleCellAddress
      ) ?? {}

    const { width, height, ...otherMetadata } = metadata ?? {}

    this._spreadsheet.hyperformula.batch(() => {
      for (const address of this._iterateMergedCellWidthHeight(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        width,
        height
      )) {
        this._spreadsheet.hyperformula.setCellContents(address, {
          cellValue,
          metadata: otherMetadata
        })
      }

      this._spreadsheet.hyperformula.setCellContents(
        rangeSimpleCellAddress.topLeftSimpleCellAddress,
        {
          cellValue,
          metadata: otherMetadata
        }
      )
    })

    // this._sheets.cells.cellsMap.forEach(cell => {
    //   const { cellValue, metadata } =
    //     this._spreadsheet.hyperformula.getCellSerialized(
    //       cell.simpleCellAddress
    //     ) ?? {}
    //   const { width, height, ...otherMetadata } = metadata ?? {}

    //   if (width > 1 && height > 1) {
    //     const areMergedCellsOverlapping = this.getAreMergedCellsOverlapping(
    //       rangeSimpleCellAddress,
    //       cell.rangeSimpleCellAddress
    //     )

    //     if (areMergedCellsOverlapping) {
    //       this._spreadsheet.hyperformula.setCellContents(
    //         rangeSimpleCellAddress.topLeftSimpleCellAddress,
    //         {
    //           cellValue,
    //           metadata: otherMetadata
    //         }
    //       )
    //     }
    //   }
    // })

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

    const rangeSimpleCellAddress = this._sheets._getMinMaxRangeSimpleCellAddress(
      selectedCells
    )

    this.addMergedCells(rangeSimpleCellAddress)
  }

  unMergeSelectedCells() {
    const selectedCells = this._sheets.selector.selectedCells

    if (!selectedCells.length) return

    const rangeSimpleCellAddress = this._sheets._getMinMaxRangeSimpleCellAddress(
      selectedCells
    )

    this._spreadsheet.pushToHistory(() => {
      this.removeMergedCells(rangeSimpleCellAddress)
    })
  }
}

export default Merger
