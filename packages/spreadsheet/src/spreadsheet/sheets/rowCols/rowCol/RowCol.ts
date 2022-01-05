import { Group } from 'konva/lib/Group'
import { Line } from 'konva/lib/shapes/Line'
import { Rect } from 'konva/lib/shapes/Rect'
import { Text } from 'konva/lib/shapes/Text'
import { isNil } from 'lodash'
import Spreadsheet from '../../../Spreadsheet'
import RowCols, { IRowColFunctions, RowColType } from '../RowCols'
import Sheets from '../../Sheets'
import RowColAddress from '../../cells/cell/RowColAddress'
import { centerRectTwoInRectOne, getColumnHeader } from '../../../utils'
import { Util } from 'konva/lib/Util'

class RowCol {
  headerRect: Rect
  headerText: Text
  resizeLine: Line
  rowColAddress: RowColAddress
  private _type: RowColType
  private _isCol: boolean
  private _functions: IRowColFunctions
  private _sheets: Sheets
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(
    /**
     * @internal
     */
    public _rowCols: RowCols,
    public index: number,
    public headerGroup: Group,
    public gridLine: Line
  ) {
    this._sheets = _rowCols._sheets
    this._spreadsheet = this._sheets._spreadsheet
    this._type = _rowCols._type
    this._isCol = _rowCols._isCol
    this._functions = _rowCols._functions
    this.headerRect = this.headerGroup.findOne('.headerRect')
    this.headerText = this.headerGroup.findOne('.headerText')
    this.resizeLine = this.headerGroup.findOne('.resizeLine')

    this.rowColAddress = new RowColAddress(
      this._sheets.activeSheetId,
      this.index
    )

    this.resizeLine.on('mouseover', this._resizeLineOnMouseOver)
    this.resizeLine.on('mouseout', this._resizeLineOnMouseOut)

    this._update()
  }

  private _resizeLineOnMouseOver = () => {
    this._rowCols.resizer._setCursor()

    this._rowCols.resizer.showResizeMarker(this.index)
  }

  private _resizeLineOnMouseOut = () => {
    this._rowCols.resizer._resetCursor()

    this._rowCols.resizer.hideResizeMarker()
  }

  private _getHeaderTextContent() {
    if (this._isCol) {
      return getColumnHeader(this.index + 1)
    } else {
      return (this.index + 1).toString()
    }
  }

  private _update() {
    const gridLineAxis =
      this._rowCols.getAxis(this.index) +
      this._rowCols.getSize(this.index) -
      this._sheets._getViewportVector()[this._functions.axis]

    this.headerGroup[this._functions.axis](this._rowCols.getAxis(this.index))
    this.headerRect[this._functions.size](this._rowCols.getSize(this.index))
    this.headerText.text(this._getHeaderTextContent())

    const headerTextMidPoints = centerRectTwoInRectOne(
      this.headerRect.getClientRect(),
      this.headerText.getClientRect()
    )

    this.headerText.position(headerTextMidPoints)

    this.resizeLine[this._functions.axis](this._rowCols.getSize(this.index))

    const sheetName = this._sheets.getActiveSheetName()

    const {
      frozenRow,
      frozenCol
    } = this._spreadsheet.data._spreadsheetData.uiSheets[sheetName]

    const frozenRowCol = this._type === 'row' ? frozenRow : frozenCol

    this.gridLine[this._functions.axis](gridLineAxis)

    this._sheets.scrollGroups.main.rowColGroup.add(this.gridLine)
    if (this._isCol) {
      this._sheets.scrollGroups.ySticky.headerGroup.add(this.headerGroup)
    } else {
      this._sheets.scrollGroups.xSticky.headerGroup.add(this.headerGroup)
    }

    if (!isNil(frozenRowCol)) {
      if (this.index <= frozenRowCol) {
        this._sheets.scrollGroups.xySticky.headerGroup.add(this.headerGroup)
      }
    }
  }

  /**
   * @internal
   */
  _getIsOutsideSheet() {
    const clientRect = this.headerGroup.getClientRect({
      skipStroke: true
    })
    const sheetRect = this._sheets.sheet.getClientRect()
    const sizeUpToFrozenRowCol = this._rowCols._getSizeUpToFrozenRowCol()

    sheetRect[this._functions.size] -= sizeUpToFrozenRowCol
    sheetRect[this._functions.axis] += sizeUpToFrozenRowCol

    const isShapeOutsideSheet =
      !Util.haveIntersection(sheetRect, {
        ...clientRect,
        [this._functions.axis]: clientRect[this._functions.axis] - 0.001
      }) && !this._rowCols.getIsFrozen(this.index)

    return isShapeOutsideSheet
  }

  /**
   * @internal
   */
  _destroy() {
    this.resizeLine.off('mouseover', this._resizeLineOnMouseOver)
    this.resizeLine.off('mouseup', this._resizeLineOnMouseOut)

    this.headerGroup.destroy()
    this.gridLine.destroy()
  }

  delete(amount: number) {
    if (this._isCol) {
      this._spreadsheet.hyperformula.removeColumns(this._sheets.activeSheetId, [
        this.index,
        amount
      ])
    } else {
      this._spreadsheet.hyperformula.removeRows(this._sheets.activeSheetId, [
        this.index,
        amount
      ])
    }

    this._spreadsheet.render()
  }

  insert(amount: number) {
    if (this._isCol) {
      this._spreadsheet.hyperformula.addColumns(this._sheets.activeSheetId, [
        this.index,
        amount
      ])
    } else {
      this._spreadsheet.hyperformula.addRows(this._sheets.activeSheetId, [
        this.index,
        amount
      ])
    }

    this._spreadsheet.render()
  }
}

export default RowCol
