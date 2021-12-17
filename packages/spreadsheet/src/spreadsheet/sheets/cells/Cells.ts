import Spreadsheet from '../../Spreadsheet'
import SimpleCellAddress, { CellId } from './cell/SimpleCellAddress'
import StyleableCell from './cell/StyleableCell'
import Sheets from '../Sheets'
import { Rect } from 'konva/lib/shapes/Rect'
import { Group } from 'konva/lib/Group'
import { Text } from 'konva/lib/shapes/Text'
import { Line } from 'konva/lib/shapes/Line'
import { isNil } from 'lodash'
import RowColAddress from './cell/RowColAddress'

class Cells {
  cellsMap: Map<CellId, StyleableCell>
  private _spreadsheet: Spreadsheet

  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
    this.cellsMap = new Map()
  }

  private _getHasCellData(simpleCellAddress: SimpleCellAddress) {
    const cellId = simpleCellAddress.toCellId()
    const cell = this._spreadsheet.data._spreadsheetData.cells?.[cellId]
    // Need to check hyperformula value too because some
    // functions spill values into adjacent cells
    const cellSerializedValueExists = !isNil(
      this._spreadsheet.hyperformula.getCellValue(simpleCellAddress)
    )
    const hasCellData = !!(
      cell ||
      cellSerializedValueExists ||
      this._spreadsheet.data.getIsCellAMergedCell(simpleCellAddress)
    )

    return hasCellData
  }

  private _updateFrozenCells(frozenRow?: number, frozenCol?: number) {
    if (!isNil(frozenRow)) {
      for (let ri = 0; ri <= frozenRow; ri++) {
        for (const ci of this._sheets.cols.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            ri,
            ci
          )

          this._updateCell(simpleCellAddress, true)
        }
      }
    }

    if (!isNil(frozenCol)) {
      for (let ci = 0; ci <= frozenCol; ci++) {
        for (const ri of this._sheets.rows.rowColMap.keys()) {
          const simpleCellAddress = new SimpleCellAddress(
            this._sheets.activeSheetId,
            ri,
            ci
          )

          this._updateCell(simpleCellAddress, true)
        }
      }
    }
  }

  private _getCellGroup() {
    const cellGroup = new Group({
      name: 'stylableCellGroup'
    })
    const cellRect = new Rect({
      ...this._spreadsheet.styles.cell.rect,
      ...this._getDefaultCellRectAttrs(),
      name: 'rect'
    })
    const borderLine = new Line({
      ...this._spreadsheet.styles.cell.borderLine,
      name: 'borderLine'
    })
    const commentMarker = new Line({
      ...this._spreadsheet.styles.cell.commentMarker,
      name: 'commentMarker'
    })
    const errorMarker = new Line({
      ...this._spreadsheet.styles.cell.errorMarker,
      name: 'errorMarker'
    })
    const cellText = new Text({
      name: 'text',
      ...this._spreadsheet.styles.cell.text
    })

    const borderLines = [
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone(),
      borderLine.clone()
    ]

    // Cell borders must be in a seperate group as they
    // need to take precedent over all cell strokes in their zIndex
    const cellBordersGroup = new Group({
      name: 'stylableCellBordersGroup'
    })

    cellBordersGroup.add(...borderLines)

    cellGroup.add(cellRect, cellText, commentMarker, errorMarker)

    return {
      cellGroup,
      cellBordersGroup
    }
  }

  /**
   * @internal
   */
  _getDefaultCellRectAttrs() {
    return {
      width: this._spreadsheet.options.col.defaultSize,
      height: this._spreadsheet.options.row.defaultSize
    }
  }

  /**
   * @internal
   */
  _cacheOutOfViewportCells() {
    this.cellsMap.forEach((cell, cellId) => {
      if (!cell.group.isClientRectOnScreen()) {
        cell.group.remove()
        cell.bordersGroup.remove()

        this.cellsMap.delete(cellId)
        this._sheets._cachedGroups.cells.push({
          group: cell.group,
          borderGroup: cell.bordersGroup
        })
      }
    })
  }

  /**
   * @internal
   */
  _destroy() {
    this.cellsMap.forEach(cell => {
      const { cellGroup, cellBordersGroup } = this._getCellGroup()

      cell._destroy()

      this._sheets._cachedGroups.cells.push({
        group: cellGroup,
        borderGroup: cellBordersGroup
      })
    })
  }

  /**
   * @internal
   */
  _setCachedCells() {
    // TODO: Remove * 2 and measure the
    // outOfViewport for freeze correctly instead
    const currentNumberOfCachedCells =
      this._sheets._cachedGroupsNumber.rows *
      this._sheets._cachedGroupsNumber.cols *
      2

    for (
      let index = this._sheets._cachedGroupsNumber.cells;
      index < currentNumberOfCachedCells;
      index++
    ) {
      const { cellGroup, cellBordersGroup } = this._getCellGroup()

      this._sheets._cachedGroups.cells.push({
        group: cellGroup,
        borderGroup: cellBordersGroup
      })
    }

    this._sheets._cachedGroupsNumber.cells = currentNumberOfCachedCells
  }

  /**
   * @internal
   */
  _resetCachedCells() {
    this.cellsMap.forEach((cell, cellId) => {
      cell.group.remove()
      cell.bordersGroup.remove()

      this.cellsMap.delete(cellId)
      this._sheets._cachedGroups.cells.push({
        group: cell.group,
        borderGroup: cell.bordersGroup
      })
    })
  }

  /**
   * @internal
   */
  _render() {
    const frozenCells =
      this._spreadsheet.data._spreadsheetData.frozenCells?.[
        this._sheets.activeSheetId
      ]
    const frozenRow = frozenCells?.row
    const frozenCol = frozenCells?.col

    this._updateFrozenCells(frozenRow, frozenCol)

    for (const ri of this._sheets.rows.scrollBar._sheetViewportPosition.iterateFromXToY()) {
      for (const ci of this._sheets.cols.scrollBar._sheetViewportPosition.iterateFromXToY()) {
        const simpleCellAddress = new SimpleCellAddress(
          this._sheets.activeSheetId,
          ri,
          ci
        )

        this._updateCell(simpleCellAddress, false)
      }
    }
  }

  /**
   * @internal
   */
  _setStyleableCell(simpleCellAddress: SimpleCellAddress) {
    const { group, borderGroup } = this._sheets._cachedGroups.cells.pop() ?? {}

    if (!group || !borderGroup) return

    const styleableCell = new StyleableCell(
      this._sheets,
      simpleCellAddress,
      group,
      borderGroup
    )

    const cellId = simpleCellAddress.toCellId()

    this.cellsMap.set(cellId, styleableCell)

    if (
      !this._spreadsheet.sheets.merger.getIsCellPartOfMerge(simpleCellAddress)
    ) {
      const height = this._sheets.rows.getSize(simpleCellAddress.row)
      const cellHeight = Math.max(
        styleableCell.rect.height(),
        styleableCell.text.height()
      )

      if (cellHeight > height) {
        this._spreadsheet.data.setRowCol(
          'rows',
          new RowColAddress(this._sheets.activeSheetId, simpleCellAddress.row),
          {
            size: cellHeight
          }
        )

        this._spreadsheet.render()
      }
    }
  }

  /**
   * @internal
   */
  _updateCell(simpleCellAddress: SimpleCellAddress, isOnFrozenRowCol = false) {
    const cellId = simpleCellAddress.toCellId()
    const mergedCellId =
      this._spreadsheet.sheets.merger.associatedMergedCellAddressMap[cellId]

    const sheetName =
      this._spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ?? ''

    if (!this._spreadsheet.hyperformula.doesSheetExist(sheetName)) {
      return
    }

    if (mergedCellId) {
      const mergedCell = this.cellsMap.get(mergedCellId)

      if (!mergedCell) {
        this._setStyleableCell(SimpleCellAddress.cellIdToAddress(mergedCellId))
      }
      return
    }

    // We always render frozenRowCol cells so they hide the cells beneath it
    if (!this._getHasCellData(simpleCellAddress) && !isOnFrozenRowCol) return

    const cellExists = this.cellsMap.has(cellId)

    if (!cellExists) {
      this._setStyleableCell(simpleCellAddress)
    }
  }
}

export default Cells
