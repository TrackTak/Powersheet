import { Line } from 'konva/lib/shapes/Line'
import { Vector2d } from 'konva/lib/types'

import ScrollBar from './scrollBars/ScrollBar'
import Spreadsheet from '../../Spreadsheet'

import { isNil } from 'lodash'
import RowCol from './rowCol/RowCol'
import Resizer from './rowCol/Resizer'
import RowColAddress, { SheetRowColId } from '../cells/cell/RowColAddress'
import { Rect } from 'konva/lib/shapes/Rect'
import { Text } from 'konva/lib/shapes/Text'
import { Group } from 'konva/lib/Group'
import Sheets from '../Sheets'

export type RowColType = 'row' | 'col'
export type RowColsType = 'rows' | 'cols'

export interface IRowColFunctions {
  axis: 'y' | 'x'
  size: 'height' | 'width'
}

export type HeaderGroupId = number

export type RowColId = number

class RowCols {
  scrollBar: ScrollBar
  frozenLine: Line
  resizer: Resizer
  rowColMap: Map<RowColId, RowCol>
  /**
   * @internal
   */
  _totalSize: number
  /**
   * @internal
   */
  _functions: IRowColFunctions
  /**
   * @internal
   */
  _oppositeFunctions: IRowColFunctions
  /**
   * @internal
   */
  _isCol: boolean
  /**
   * @internal
   */
  _pluralType: RowColsType
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(
    /**
     * @internal
     */
    public _type: RowColType,
    /**
     * @internal
     */
    public _sheets: Sheets
  ) {
    this._isCol = this._type === 'col'
    this._spreadsheet = this._sheets._spreadsheet
    this.rowColMap = new Map()

    this._totalSize = 0

    if (this._isCol) {
      this._functions = {
        axis: 'x',
        size: 'width'
      }
      this._oppositeFunctions = {
        axis: 'y',
        size: 'height'
      }
    } else {
      this._functions = {
        axis: 'y',
        size: 'height'
      }
      this._oppositeFunctions = {
        axis: 'x',
        size: 'width'
      }
    }
    this._pluralType = `${this._type}s`

    this.resizer = new Resizer(this)
    this.scrollBar = new ScrollBar(this)

    this.frozenLine = new Line({
      name: 'frozenLine'
    })

    this._sheets.scrollGroups.xySticky.sheetGroup.add(this.frozenLine)

    this._updateViewportSize()
  }

  private _cloneGroupsAndPush() {
    const headerRect = new Rect({
      ...this._spreadsheet.styles[this._type].headerRect,
      name: 'headerRect',
      [this._functions.size]: this._spreadsheet.options[this._type].defaultSize
    })

    const headerText = new Text({
      ...this._spreadsheet.styles[this._type].headerText,
      name: 'headerText'
    })

    const resizeLine = new Line({
      ...this._spreadsheet.styles[this._type].resizeLine,
      name: 'resizeLine',
      points: this._isCol
        ? [0, 0, 0, this._sheets._getViewportVector().y]
        : [0, 0, this._sheets._getViewportVector().x, 0]
    })

    const headerGroup = new Group({
      name: 'headerGroup'
    })

    headerGroup.add(headerRect, headerText, resizeLine)

    const gridLine = new Line({
      ...this._spreadsheet.styles[this._type].gridLine,
      points: this._getLinePoints(this._getSheetSize()),
      name: 'gridLine'
    })

    this._sheets._cachedGroups[this._pluralType].headerGroups.push(headerGroup)
    this._sheets._cachedGroups[this._pluralType].gridLines.push(gridLine)
  }

  private _updateFrozenRowCols(frozenRowCol?: number) {
    if (!isNil(frozenRowCol)) {
      for (let index = 0; index <= frozenRowCol; index++) {
        const rowColAddress = new RowColAddress(
          this._sheets.activeSheetId,
          index
        )

        this._updateRowCol(rowColAddress)
      }
    }
  }

  private _updateRowCol(rowColAddress: RowColAddress) {
    const rowCol = this.rowColMap.get(rowColAddress.rowCol)

    if (!rowCol) {
      this._setRowCol(rowColAddress)
    }
  }

  private _getSheetSize() {
    return this._sheets.sheetDimensions[this._oppositeFunctions.size]
  }

  private _getLinePoints = (size: number) => {
    return this._isCol ? [0, 0, 0, size] : [0, 0, size, 0]
  }

  private *_getSizeForFrozenCell() {
    const { frozenCells } = this._spreadsheet.data._spreadsheetData
    const frozenCell = frozenCells?.[this._sheets.activeSheetId]?.[this._type]

    if (isNil(frozenCell)) return null

    let size = 0

    for (let index = 0; index <= frozenCell; index++) {
      size += this.getSize(index)

      yield { size, index }
    }

    return size
  }

  /**
   * @internal
   */
  _cacheOutOfViewportRowCols() {
    this.rowColMap.forEach((rowCol, index) => {
      if (rowCol._getIsOutsideSheet()) {
        this.rowColMap.delete(index)
        this._sheets._cachedGroups[this._pluralType].headerGroups.push(
          rowCol.headerGroup
        )
        this._sheets._cachedGroups[this._pluralType].gridLines.push(
          rowCol.gridLine
        )
      }
    })
  }

  /**
   * @internal
   */
  _setCachedRowCols() {
    const numberOfCachedRowCols = this._sheets._cachedGroupsNumber[
      this._pluralType
    ]

    const maxNumberOfCachedRoCols = Math.max(
      this._sheets.stage[this._functions.size]() /
        this._spreadsheet.options[this._type].minSize,
      this._sheets._cachedGroupsNumber[this._pluralType]
    )

    this._sheets._cachedGroupsNumber[this._pluralType] = maxNumberOfCachedRoCols

    for (
      let index = numberOfCachedRowCols;
      index < maxNumberOfCachedRoCols;
      index++
    ) {
      this._cloneGroupsAndPush()
    }
  }

  /**
   * @internal
   */
  _clearAll() {
    this.rowColMap.forEach((rowCol, rowColId) => {
      this._cloneGroupsAndPush()

      rowCol._destroy()

      this.rowColMap.delete(rowColId)
    })
  }

  /**
   * @internal
   */
  _render() {
    this.frozenLine.setAttrs({
      ...this._spreadsheet.styles[this._type].frozenLine,
      visible: false
    })

    const frozenCells = this._spreadsheet.data._spreadsheetData.frozenCells?.[
      this._sheets.activeSheetId
    ]
    const frozenRowCol = frozenCells?.[this._type]

    this._updateFrozenRowCols(frozenRowCol)

    // Backwards so we ignore frozen row/cols
    // when they don't exist in the cache
    for (const index of this.scrollBar._sheetViewportPosition.iterateFromYToX()) {
      const rowColAddress = new RowColAddress(this._sheets.activeSheetId, index)

      this._updateRowCol(rowColAddress)
    }

    if (!isNil(frozenRowCol)) {
      this.frozenLine[this._functions.axis](
        this.getAxis(frozenRowCol) +
          this.getSize(frozenRowCol) -
          this._sheets._getViewportVector()[this._functions.axis]
      )
      this.frozenLine.points(
        this._getLinePoints(
          this._isCol
            ? this._sheets.sheetDimensions.height
            : this._sheets.sheetDimensions.width
        )
      )
      this.frozenLine.show()
    }
  }

  /**
   * @internal
   */
  _setRowCol(rowColAddress: RowColAddress) {
    const cachedHeaderGroup = this._sheets._cachedGroups[
      this._pluralType
    ].headerGroups.pop()!
    const cachedGridLine = this._sheets._cachedGroups[
      this._pluralType
    ].gridLines.pop()!

    if (!cachedHeaderGroup) return

    const rowCol = new RowCol(
      this,
      rowColAddress.rowCol,
      cachedHeaderGroup,
      cachedGridLine
    )

    this.rowColMap.set(rowColAddress.rowCol, rowCol)
  }

  /**
   * @internal
   */
  _destroy() {
    this._clearAll()
    this.scrollBar._destroy()
    this.frozenLine.destroy()
    this.resizer._destroy()
  }

  getAxis(index: number) {
    const data = this._spreadsheet.data._spreadsheetData
    const defaultSize = this._spreadsheet.options[this._type].defaultSize
    const rowCols =
      data.sheets?.[this._sheets.activeSheetId][this._pluralType] ?? {}

    let totalPreviousCustomSizeDifferences = 0

    Object.keys(rowCols).forEach(key => {
      const sheetRowColId = key as SheetRowColId
      const sheetRowColAddress = RowColAddress.sheetRowColIdToAddress(
        sheetRowColId
      )
      const rowCol = data[this._pluralType]![sheetRowColId]

      if (sheetRowColAddress.rowCol >= index) return

      totalPreviousCustomSizeDifferences += rowCol?.size - defaultSize
    })

    const axis =
      defaultSize * index +
      totalPreviousCustomSizeDifferences +
      this._sheets._getViewportVector()[this._functions.axis]

    return axis
  }

  getSize(index: number) {
    const sheetRowColId = new RowColAddress(
      this._sheets.activeSheetId,
      index
    ).toSheetRowColId()
    const data = this._spreadsheet.data._spreadsheetData
    const size = data[this._pluralType]?.[sheetRowColId]?.size

    return size ?? this._spreadsheet.options[this._type].defaultSize
  }

  getIsFrozen(index: number) {
    const data = this._spreadsheet.data._spreadsheetData
    const frozenCell =
      data.frozenCells?.[this._sheets.activeSheetId]?.[this._type]

    return isNil(frozenCell) ? false : index <= frozenCell
  }

  /**
   * @internal
   */
  _updateViewportSize() {
    this.scrollBar._setYIndex()

    let sumOfSizes = 0

    for (const index of this.scrollBar._sheetViewportPosition.iterateFromXToY()) {
      sumOfSizes += this.getSize(index)
    }

    this._totalSize = sumOfSizes
    this.scrollBar._setScrollSize()
  }

  /**
   * @internal
   */
  _calculateSheetViewportEndPosition = (
    sheetViewportDimensionSize: number,
    sheetViewportStartYIndex: number
  ) => {
    let sumOfSizes = 0
    let i = sheetViewportStartYIndex

    const getSize = () => {
      return this.getSize(i)
    }

    while (sumOfSizes + getSize() < sheetViewportDimensionSize) {
      sumOfSizes += getSize()
      i += 1
    }

    return i
  }

  /**
   * @internal
   */
  _getTotalSize() {
    const rowCols = Object.keys(
      this._spreadsheet.data._spreadsheetData[this._pluralType] ?? {}
    )

    const totalSizeDifference = rowCols.reduce((currentSize, key) => {
      const sheetRowColId = key as SheetRowColId
      const rowColAddress = RowColAddress.sheetRowColIdToAddress(sheetRowColId)
      const size = this.getSize(rowColAddress.rowCol)

      return (
        size - this._spreadsheet.options[this._type].defaultSize + currentSize
      )
    }, 0)

    const totalSize =
      (this._spreadsheet.options[this._type].amount + 1) *
        this._spreadsheet.options[this._type].defaultSize +
      totalSizeDifference

    return totalSize
  }

  /**
   * @internal
   */
  _getSizeUpToFrozenRowCol() {
    let size = 0

    for (const value of this._getSizeForFrozenCell()) {
      size = value.size
    }
    return size
  }

  /**
   * @internal
   */
  _getTopBottomIndexFromPosition(position: Vector2d) {
    const sheetViewportStartYIndex = this.scrollBar._sheetViewportPosition.x

    let topIndex = null
    let bottomIndex = null

    for (const { size, index } of this._getSizeForFrozenCell()) {
      if (topIndex === null && position.x <= size) {
        topIndex = index
      }

      if (bottomIndex === null && position.y <= size) {
        bottomIndex = index
      }
    }

    if (topIndex === null) {
      topIndex = this._calculateSheetViewportEndPosition(
        position.x,
        sheetViewportStartYIndex
      )
    }

    if (bottomIndex === null) {
      bottomIndex = this._calculateSheetViewportEndPosition(
        position.y,
        sheetViewportStartYIndex
      )
    }

    return {
      topIndex,
      bottomIndex
    }
  }
}

export default RowCols
