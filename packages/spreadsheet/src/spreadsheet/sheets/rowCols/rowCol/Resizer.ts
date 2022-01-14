import { KonvaEventObject } from 'konva/lib/Node'
import { Line } from 'konva/lib/shapes/Line'
import { Rect } from 'konva/lib/shapes/Rect'
import Sheets from '../../Sheets'
import Spreadsheet from '../../../Spreadsheet'
import RowCols from '../RowCols'
import { SetColSizeCommand, SetRowSizeCommand } from '../../../Commands'
import { SetColSizeUndoEntry, SetRowSizeUndoEntry } from '../../../UIUndoRedo'

class Resizer {
  resizeMarker: Rect
  resizeGuideLine: Line
  currentIndex = 0
  private _spreadsheet: Spreadsheet
  private _sheets: Sheets

  /**
   * @internal
   */
  constructor(
    /**
     * @internal
     */
    public _rowCols: RowCols
  ) {
    this._sheets = this._rowCols._sheets
    this._spreadsheet = this._sheets._spreadsheet

    const size = this._rowCols._sheets._getViewportVector()[
      this._rowCols._oppositeFunctions.axis
    ]
    this.resizeMarker = new Rect({
      ...this._spreadsheet.styles[this._rowCols._type].resizeMarker,
      name: 'resizeMarker',
      [this._rowCols._oppositeFunctions.size]: size
    })
    this.resizeGuideLine = new Line({
      ...this._spreadsheet.styles[this._rowCols._type].resizeGuideLine,
      name: 'resizeGuideLine',
      [this._rowCols._oppositeFunctions.size]: size
    })

    this.resizeMarker.on('mouseover', this._resizeMarkerOnMouseOver)
    this.resizeMarker.on('mouseout', this._resizeMarkerOnMouseOut)
    this.resizeMarker.on('dragstart', this._resizeLineDragStart)
    this.resizeMarker.on('dragmove', this._resizeLineDragMove)
    this.resizeMarker.on('dragend', this._resizeLineDragEnd)

    this._sheets.layer.add(this.resizeMarker, this.resizeGuideLine)
  }

  private _getPosition() {
    return (
      this._rowCols.getAxis(this.currentIndex) + this._rowCols.scrollBar._scroll
    )
  }

  private _resizeMarkerOnMouseOver = () => {
    this._setCursor()

    this.showResizeMarker(this.currentIndex!)
  }

  private _resizeMarkerOnMouseOut = () => {
    this._resetCursor()

    this.hideResizeMarker()
  }

  private _resizeLineDragStart = (e: KonvaEventObject<DragEvent>) => {
    this._spreadsheet.eventEmitter.emit(
      this._rowCols._isCol ? 'resizeColStart' : 'resizeRowStart',
      e
    )
  }

  private _resizeLineDragMove = (e: KonvaEventObject<DragEvent>) => {
    const target = e.target as Line
    const position = target.getPosition()
    const minAxis =
      this._getPosition() +
      this._spreadsheet.options[this._rowCols._type].minSize
    let newAxis = position[this._rowCols._functions.axis]

    const getNewPosition = () => {
      const newPosition = {
        ...position,
        [this._rowCols._functions.axis]: newAxis
      }

      return newPosition
    }

    if (newAxis <= minAxis) {
      newAxis = minAxis

      target.setPosition(getNewPosition())
    }

    this.showGuideLine()

    this._spreadsheet.eventEmitter.emit(
      this._rowCols._isCol ? 'resizeColMove' : 'resizeRowMove',
      e,
      newAxis
    )
  }

  private _resizeLineDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const newSize =
      e.target.getPosition()[this._rowCols._functions.axis] -
      this._getPosition()

    const oldSize = this._rowCols.getSize(this.currentIndex)

    this.hideResizeMarker()
    this.hideGuideLine()

    if (this._rowCols._type === 'row') {
      this._spreadsheet.operations.setRowSize(
        this._sheets.activeSheetId,
        this.currentIndex,
        newSize
      )

      const command = new SetRowSizeCommand(
        this._sheets.activeSheetId,
        this.currentIndex,
        oldSize,
        newSize
      )

      this._spreadsheet.uiUndoRedo.saveOperation(
        new SetRowSizeUndoEntry(this._spreadsheet.hyperformula, command)
      )
    } else {
      this._spreadsheet.operations.setColSize(
        this._sheets.activeSheetId,
        this.currentIndex,
        newSize
      )

      const command = new SetColSizeCommand(
        this._sheets.activeSheetId,
        this.currentIndex,
        oldSize,
        newSize
      )

      this._spreadsheet.uiUndoRedo.saveOperation(
        new SetColSizeUndoEntry(this._spreadsheet.hyperformula, command)
      )
    }
    this._spreadsheet.hyperformula.clearRedoStack()

    this._spreadsheet.persistData()
    this._spreadsheet.render()

    this._spreadsheet.eventEmitter.emit(
      this._rowCols._isCol ? 'resizeColEnd' : 'resizeRowEnd',
      e,
      newSize
    )
  }

  /**
   * @internal
   */
  _setCursor() {
    document.body.style.cursor = this._rowCols._isCol
      ? 'col-resize'
      : 'row-resize'
  }

  /**
   * @internal
   */
  _resetCursor() {
    document.body.style.cursor = 'default'
  }

  /**
   * @internal
   */
  _destroy() {
    this.resizeMarker.destroy()
    this.resizeGuideLine.destroy()

    this.resizeMarker.off('mouseover', this._resizeMarkerOnMouseOver)
    this.resizeMarker.off('mouseout', this._resizeMarkerOnMouseOut)
    this.resizeMarker.off('dragstart', this._resizeLineDragStart)
    this.resizeMarker.off('dragmove', this._resizeLineDragMove)
    this.resizeMarker.off('dragend', this._resizeLineDragEnd)
  }

  showResizeMarker(index: number) {
    this.currentIndex = index

    this.resizeMarker[this._rowCols._functions.axis](
      this._getPosition() + this._rowCols.getSize(this.currentIndex)
    )

    this.resizeMarker.show()
    this.resizeMarker.moveToTop()
  }

  hideResizeMarker() {
    this.resizeMarker.hide()
  }

  showGuideLine() {
    this.resizeGuideLine[this._rowCols._functions.axis](
      this.resizeMarker[this._rowCols._functions.axis]()
    )
    this.resizeGuideLine.points(
      this._rowCols._isCol
        ? [
            0,
            this._sheets._getViewportVector().y,
            0,
            this._sheets.stage.height()
          ]
        : [
            this._sheets._getViewportVector().x,
            0,
            this._sheets.stage.width(),
            0
          ]
    )

    this.resizeGuideLine.show()
    this.resizeGuideLine.moveToTop()
  }

  hideGuideLine() {
    this.resizeGuideLine.hide()
  }
}

export default Resizer
