import Spreadsheet from '../../Spreadsheet'
import SimpleCellAddress, { SheetCellId } from './cell/SimpleCellAddress'
import StyleableCell from './cell/StyleableCell'
import Sheets from '../Sheets'
import { Rect } from 'konva/lib/shapes/Rect'
import { Group } from 'konva/lib/Group'
import { Text } from 'konva/lib/shapes/Text'
import { Line } from 'konva/lib/shapes/Line'
import { isNil } from 'lodash'
import Cell from './cell/Cell'
import { ICellMetadata, ISheetMetadata } from '../Data'
import Merger from '../Merger'
import { addressToSheetCellId, sheetCellIdToAddress } from '../../utils'

export interface IGroupedCells {
  main: Cell[]
  xSticky: Cell[]
  ySticky: Cell[]
  xySticky: Cell[]
}

class Cells {
  cellsMap: Map<SheetCellId, StyleableCell>
  private _spreadsheet: Spreadsheet

  constructor(private _sheets: Sheets, private _merger: Merger) {
    this._spreadsheet = this._sheets._spreadsheet
    this.cellsMap = new Map()
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
      name: 'stylableCellGroup',
      listening: false
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
      name: 'stylableCellBordersGroup',
      listening: false
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
    const { frozenRow, frozenCol } =
      this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
        this._sheets.activeSheetId
      )

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

    const sheetCellId = addressToSheetCellId(simpleCellAddress)

    this.cellsMap.set(sheetCellId, styleableCell)

    if (
      !this._spreadsheet.merger.getIsCellTopLeftMergedCell(simpleCellAddress) &&
      !this._spreadsheet.merger.getIsCellPartOfMerge(simpleCellAddress)
    ) {
      const { metadata } =
        this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
          simpleCellAddress
        )
      const currentRowHeight = this._sheets.rows.getSize(simpleCellAddress.row)
      const cellTextHeight = styleableCell.text.height()
      const isTextWrapped = metadata?.textWrap === 'wrap'

      if (isTextWrapped && cellTextHeight > currentRowHeight) {
        this._spreadsheet.operations.setRowSize(
          this._sheets.activeSheetId,
          simpleCellAddress.row,
          cellTextHeight
        )

        this._spreadsheet.render()
      }
    }
  }

  /**
   * @internal
   */
  _updateCell(simpleCellAddress: SimpleCellAddress, isOnFrozenRowCol = false) {
    const sheetCellId = addressToSheetCellId(simpleCellAddress)

    const sheetName =
      this._spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ?? ''

    if (!this._spreadsheet.hyperformula.doesSheetExist(sheetName)) {
      return
    }

    const cell =
      this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        simpleCellAddress
      )

    // We always render frozenRowCol cells so they hide the cells beneath it
    if (!cell && !isOnFrozenRowCol) return

    if (this._merger.getIsCellPartOfMerge(simpleCellAddress)) {
      const mergedCellId =
        this._merger.associatedMergedCellAddressMap[sheetCellId]
      const mergedCellAddress = sheetCellIdToAddress(mergedCellId)
      const mergedCell = this.cellsMap.get(mergedCellId)

      if (!mergedCell) {
        this._setStyleableCell(
          new SimpleCellAddress(
            mergedCellAddress.sheet,
            mergedCellAddress.row,
            mergedCellAddress.col
          )
        )
      }
      return
    }

    const cellExists = this.cellsMap.has(sheetCellId)

    if (!cellExists) {
      if (isOnFrozenRowCol || cell.cellValue || cell.metadata) {
        this._setStyleableCell(simpleCellAddress)
      }
    }
  }

  /**
   * @internal
   */
  _getGroupedCellsByStickyGroup(cells: Cell[]) {
    const groupedCells: IGroupedCells = {
      main: [],
      xSticky: [],
      ySticky: [],
      xySticky: []
    }

    cells.forEach(cell => {
      const stickyGroup = cell.getStickyGroupCellBelongsTo()

      groupedCells![stickyGroup].push(cell)
    })

    return groupedCells
  }
}

export default Cells
