import { SimpleCellRange as HFSimpleCellRange } from '@tracktak/hyperformula'
// @ts-ignore
import { isSimpleCellAddress } from '@tracktak/hyperformula/es/Cell'
import { isEmpty } from 'lodash'
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress'
import SimpleCellAddress from './sheets/cells/cell/SimpleCellAddress'
import Sheets from './sheets/Sheets'
import Spreadsheet from './Spreadsheet'

class Clipboard {
  /**
   * The range of cells for the copy or the cut
   */
  sourceRange: RangeSimpleCellAddress | null = null
  isCut = false
  private _spreadsheet: Spreadsheet

  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
  }

  private async _writeToClipboard(source: HFSimpleCellRange) {
    const rangeData = this._spreadsheet.hyperformula.getRangeSerialized(source)

    let clipboardText = ''

    rangeData.forEach(rowData => {
      rowData.forEach(value => {
        clipboardText += value ?? ''
      })
    })

    await navigator.clipboard.writeText(clipboardText)
  }

  private _getCellRangeForSelection(
    isPasting = false
  ): RangeSimpleCellAddress | null {
    const selectedCells = this._sheets.selector.selectedCells

    if (isEmpty(selectedCells) || (isPasting && !this.sourceRange)) {
      return null
    }

    const firstSelectedCell = selectedCells![0]
    const lastSelectedCell = selectedCells![selectedCells!.length - 1]

    const topLeftSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      firstSelectedCell.simpleCellAddress.row,
      firstSelectedCell.simpleCellAddress.col
    )

    const bottomRightSimpleCellAddress = new SimpleCellAddress(
      this._sheets.activeSheetId,
      lastSelectedCell.simpleCellAddress.row,
      lastSelectedCell.simpleCellAddress.col
    )

    const setCellRangeForMerges = () => {
      selectedCells.forEach(cell => {
        if (
          this._sheets.merger.getIsCellTopLeftMergedCell(cell.simpleCellAddress)
        ) {
          const cellId = cell.simpleCellAddress.toCellId()
          const sheetName = this._spreadsheet.hyperformula.getSheetName(
            cell.simpleCellAddress.sheet
          )!
          const mergedCell = this._spreadsheet.data._spreadsheetData.uiSheets[
            sheetName
          ].mergedCells[cellId]

          bottomRightSimpleCellAddress.col += mergedCell.width - 1
          bottomRightSimpleCellAddress.row += mergedCell.height - 1
        }
      })
    }

    if (isPasting) {
      const sourceRangeColSize =
        this.sourceRange!.bottomRightSimpleCellAddress.col -
        this.sourceRange!.topLeftSimpleCellAddress.col

      const sourceRangeRowSize =
        this.sourceRange!.bottomRightSimpleCellAddress.row -
        this.sourceRange!.topLeftSimpleCellAddress.row

      const targetRangeColSize =
        bottomRightSimpleCellAddress.col - topLeftSimpleCellAddress.col
      const targetRangeRowSize =
        bottomRightSimpleCellAddress.row - topLeftSimpleCellAddress.row

      if (this.isCut || targetRangeColSize < sourceRangeColSize) {
        bottomRightSimpleCellAddress.col =
          topLeftSimpleCellAddress.col + sourceRangeColSize
      }
      if (this.isCut || targetRangeRowSize < sourceRangeRowSize) {
        bottomRightSimpleCellAddress.row =
          topLeftSimpleCellAddress.row + sourceRangeRowSize
      }

      if (selectedCells.length !== 1) {
        setCellRangeForMerges()
      }
    } else {
      setCellRangeForMerges()
    }

    return new RangeSimpleCellAddress(
      topLeftSimpleCellAddress,
      bottomRightSimpleCellAddress
    )
  }

  async cut() {
    const cellRange = this._getCellRangeForSelection()
    if (!cellRange) {
      return
    }

    this.sourceRange = cellRange

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress
    }

    this._spreadsheet.hyperformula.cut(source)
    this.isCut = true

    await this._writeToClipboard(source)
  }

  async copy() {
    const cellRange = this._getCellRangeForSelection()
    if (!cellRange) {
      return
    }

    this.sourceRange = cellRange

    const source = {
      start: cellRange.topLeftSimpleCellAddress,
      end: cellRange.bottomRightSimpleCellAddress
    }

    this._spreadsheet.hyperformula.copy(source)

    await this._writeToClipboard(source)
  }

  paste() {
    const targetRange = this._getCellRangeForSelection(true)
    const sourceRange = this.sourceRange

    if (!targetRange || !sourceRange) {
      return
    }

    this._spreadsheet.hyperformula.paste({
      sheet: targetRange.topLeftSimpleCellAddress.sheet,
      col: targetRange.topLeftSimpleCellAddress.col,
      row: targetRange.topLeftSimpleCellAddress.row
    })

    // if (this.isCut) {
    //   const sourceCellAddresses = sourceRange.getArrayOfAddresses()

    //   sourceCellAddresses.forEach(simplesCellAddresses => {
    //     simplesCellAddresses.forEach(address => {
    //       this._spreadsheet.data.deleteCell(
    //         address,
    //         false,
    //         true
    //       )
    //     })
    //   })
    // }

    // const targetCellAddresses = targetRange.getArrayOfAddresses()

    // targetCellAddresses.forEach(simplesCellAddresses => {
    //   simplesCellAddresses.forEach(address => {
    //     const hfSimpleCellAddress = {
    //       sheet: address.sheet,
    //       col: address.col,
    //       row: address.row
    //     }
    //     const {
    //       cellValue,
    //       metadata
    //     } = this._spreadsheet.hyperformula.getCellSerialized(
    //       hfSimpleCellAddress
    //     ) as {
    //       cellValue: RawCellContent
    //       metadata?: CellMetadata
    //     }

    //     this._spreadsheet.data.setCell(
    //       address,
    //       {
    //         ...metadata,
    //         value: cellValue
    //       },
    //       false
    //     )
    //   })
    // })

    // const rangeData = this._spreadsheet.hyperformula.getFillRangeData(
    //   {
    //     start: sourceRange.topLeftSimpleCellAddress,
    //     end: sourceRange.bottomRightSimpleCellAddress
    //   },
    //   {
    //     start: targetRange.topLeftSimpleCellAddress,
    //     end: targetRange.bottomRightSimpleCellAddress
    //   },
    //   true
    // )

    if (this.isCut) {
      // const allCellDependents: (
      //   | HFSimpleCellRange
      //   | HFSimpleCellAddress
      // )[][] = []
      // We must update spreadsheet data to keep in sync with hf values
      // TODO: Find a better way of keeping our data in sync with hyperformula values
      // such as an event from hyperformula
      // for (const ri of sourceRange.iterateFromTopToBottom('row')) {
      //   const rowDependents: (HFSimpleCellRange | HFSimpleCellAddress)[] = []
      //   for (const ci of sourceRange.iterateFromTopToBottom('col')) {
      //     const cellDependents = this._spreadsheet.hyperformula.getCellDependents(
      //       {
      //         sheet: sourceRange.topLeftSimpleCellAddress.sheet,
      //         col: ci,
      //         row: ri
      //       }
      //     )
      //     rowDependents.push(...cellDependents)
      //   }
      //   allCellDependents.push(rowDependents)
      // }
      // Because the source data changes then the formulas
      // can also change so we must paste to update dependent formulas
      // allCellDependents.forEach(rowData => {
      //   rowData.forEach(value => {
      //     if (isSimpleCellAddress(value)) {
      //       const hfSimpleCelladdress = value as HFSimpleCellAddress
      //       const simpleCellAddress = new SimpleCellAddress(
      //         hfSimpleCelladdress.sheet,
      //         hfSimpleCelladdress.row,
      //         hfSimpleCelladdress.col
      //       )
      //       const cellId = simpleCellAddress.toCellId()
      //       const cellSerializedValue = getCellDataValue(this._spreadsheet.hyperformula.getCellSerialized(
      //         hfSimpleCelladdress
      //       ))
      //       const cell = this._spreadsheet.data._spreadsheetData.cells?.[
      //         cellId
      //       ]
      //       if (cell?.value !== cellSerializedValue) {
      //         this._spreadsheet.data.setCell(
      //           simpleCellAddress,
      //           {
      //             value: cellSerializedValue
      //           },
      //         )
      //       }
      //     }
      //   })
      // })
    }

    // We must split out the logic for setting/deleting the cells
    // because otherwise it will affect the next loop iteration
    // const cachedCells: IClipboardCachedCells[] = []

    // rangeData.forEach((rowData, ri) => {
    //   rowData.forEach((_, ci) => {
    //     let { row, col } = this.sourceRange!.topLeftSimpleCellAddress

    //     row += ri % this.sourceRange!.height()
    //     col += ci % this.sourceRange!.width()

    //     const soureSimpleCellAddress = new SimpleCellAddress(
    //       this.sourceRange!.topLeftSimpleCellAddress.sheet,
    //       row,
    //       col
    //     )

    //     const targetSimpleCellAddress = new SimpleCellAddress(
    //       targetRange.topLeftSimpleCellAddress.sheet,
    //       targetRange.topLeftSimpleCellAddress.row + ri,
    //       targetRange.topLeftSimpleCellAddress.col + ci
    //     )

    //     const sourceCellId = soureSimpleCellAddress.toCellId()
    //     const data = this._spreadsheet.data._spreadsheetData
    //     const cell = data.cells?.[sourceCellId]
    //     const mergedCell = data.mergedCells?.[sourceCellId]

    //     cachedCells.push({
    //       targetSimpleCellAddress,
    //       cell,
    //       mergedCell
    //     })

    //     if (this.isCut) {
    //       this._spreadsheet.data.deleteCell(soureSimpleCellAddress)
    //     }
    //   })
    // })

    // cachedCells.forEach(({ targetSimpleCellAddress, cell, mergedCell }) => {
    //   if (rangeData.length !== 1 || rangeData[0]?.length !== 1) {
    //     this._spreadsheet.data.deleteMergedCell(targetSimpleCellAddress)
    //   }

    //   this._spreadsheet.data.deleteCell(targetSimpleCellAddress, true, false)

    //   if (mergedCell) {
    //     const newMergedCell = {
    //       ...mergedCell,
    //       row: {
    //         x: targetSimpleCellAddress.row,
    //         y:
    //           targetSimpleCellAddress.row +
    //           (mergedCell.row.y - mergedCell.row.x)
    //       },
    //       col: {
    //         x: targetSimpleCellAddress.col,
    //         y:
    //           targetSimpleCellAddress.col +
    //           (mergedCell.col.y - mergedCell.col.x)
    //       }
    //     }

    //     this._spreadsheet.data.setMergedCell(
    //       targetSimpleCellAddress,
    //       newMergedCell
    //     )
    //   }

    //   if (cell) {
    //     this._spreadsheet.data.setCell(targetSimpleCellAddress, cell)
    //   }
    // })

    this._spreadsheet.render()

    if (this.isCut) {
      this.sourceRange = null
      this.isCut = false
    }
  }
}

export default Clipboard
