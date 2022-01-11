import { DebouncedFunc, throttle } from 'lodash'
import { prefix } from '../../../utils'
import Sheets from '../../Sheets'
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols'
import styles from './ScrollBar.module.scss'
import Spreadsheet from '../../../Spreadsheet'
import ViewportPosition from './ViewportPosition'
import RowColAddress from '../../cells/cell/RowColAddress'
import { ISheetMetadata } from '../../Data'

export type ScrollBarType = 'horizontal' | 'vertical'

class ScrollBar {
  scrollBarEl: HTMLDivElement
  scrollEl: HTMLDivElement
  /**
   * @internal
   */
  _scroll = 0
  /**
   * @internal
   */
  _previousTouchMovePosition = 0
  /**
   * @internal
   */
  _sheetViewportPosition = new ViewportPosition()
  private _totalPreviousCustomSizeDifferences = 0
  private _previousSheetViewportPosition = new ViewportPosition()
  private _scrollType: ScrollBarType
  private _throttledScroll: DebouncedFunc<(e: Event) => void>
  private _type: RowColType
  private _isCol: boolean
  private _functions: IRowColFunctions
  private _pluralType: RowColsType
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
    this._type = this._rowCols._type
    this._pluralType = this._rowCols._pluralType
    this._spreadsheet = this._sheets._spreadsheet
    this._isCol = this._rowCols._isCol
    this._scrollType = this._isCol ? 'horizontal' : 'vertical'
    this._functions = this._rowCols._functions

    this.scrollBarEl = document.createElement('div')
    this.scrollEl = document.createElement('div')

    this.scrollBarEl.classList.add(
      `${prefix}-scroll-bar`,
      this._scrollType,
      styles[`${this._scrollType}ScrollBar`]
    )

    this.scrollEl.classList.add(
      `${prefix}-scroll`,
      styles[`${this._scrollType}Scroll`]
    )

    this.scrollBarEl.appendChild(this.scrollEl)

    // FPS chrome reports incorrect values for setTimeout with scroll
    // 60 fps: (1000ms / 60fps = 16ms);
    this._throttledScroll = throttle(this._onScroll, 16)

    this.scrollBarEl.addEventListener('scroll', this._throttledScroll)

    this._sheets.sheetEl.appendChild(this.scrollBarEl)

    this._setScrollSize()
    this._moveScrollGroups(0)
  }

  private _moveScrollGroups(scroll: number) {
    if (this._isCol) {
      this._sheets.scrollGroups.ySticky.group.x(scroll)
    } else {
      this._sheets.scrollGroups.xSticky.group.y(scroll)
    }

    this._sheets.scrollGroups.main.group[this._functions.axis](scroll)
  }

  private _getNewScrollAmount(start: number, end: number) {
    const sheetMetadata = this._sheets._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
      this._sheets.activeSheetId
    )
    const defaultSize = this._spreadsheet.options[this._type].defaultSize

    let newScrollAmount = 0
    let totalCustomSizeDifferencs = 0

    for (let i = start; i < end; i++) {
      const rowCollAddress = new RowColAddress(this._sheets.activeSheetId, i)
      const size =
        this._pluralType === 'rows'
          ? sheetMetadata.rowSizes[rowCollAddress.rowCol]
          : sheetMetadata.colSizes[rowCollAddress.rowCol]

      if (size) {
        totalCustomSizeDifferencs += size - defaultSize
        newScrollAmount += size
      } else {
        newScrollAmount += defaultSize
      }
    }

    return {
      newScrollAmount,
      totalCustomSizeDifferencs
    }
  }

  private _onScroll = (e: Event) => {
    e.preventDefault()

    const event = e.target! as any
    const scroll = this._isCol ? event.scrollLeft : event.scrollTop
    const scrollSize = this._isCol ? event.scrollWidth : event.scrollHeight

    const scrollPercent = scroll / scrollSize

    this._sheetViewportPosition.x = Math.trunc(
      (this._spreadsheet.options[this._type].amount + 1) * scrollPercent
    )

    let newScroll = Math.abs(this._scroll)

    const scrollAmount = this._getNewScrollAmount(
      this._previousSheetViewportPosition.x,
      this._sheetViewportPosition.x
    )

    const scrollReverseAmount = this._getNewScrollAmount(
      this._sheetViewportPosition.x,
      this._previousSheetViewportPosition.x
    )

    scrollReverseAmount.newScrollAmount *= -1
    scrollReverseAmount.totalCustomSizeDifferencs *= -1

    const totalPreviousCustomSizeDifferences =
      this._totalPreviousCustomSizeDifferences +
      scrollAmount.totalCustomSizeDifferencs +
      scrollReverseAmount.totalCustomSizeDifferencs

    newScroll +=
      scrollAmount.newScrollAmount + scrollReverseAmount.newScrollAmount

    newScroll *= -1

    this._moveScrollGroups(newScroll)

    this._previousSheetViewportPosition.x = this._sheetViewportPosition.x
    this._previousSheetViewportPosition.y = this._sheetViewportPosition.y
    this._scroll = newScroll
    this._totalPreviousCustomSizeDifferences = totalPreviousCustomSizeDifferences

    this._setYIndex()

    this._rowCols._cacheOutOfViewportRowCols()
    this._rowCols._render()
    this._sheets.cells._cacheOutOfViewportCells()
    this._sheets.cells._render()

    if (this._sheets.cellEditor.currentScroll?.[this._type] !== this._scroll) {
      this._sheets.cellEditor.showCellTooltip()
    } else {
      this._sheets.cellEditor.hideCellTooltip()
    }

    this._spreadsheet.sheets.cellError.hide()
    this._spreadsheet.sheets.comment.hide()

    this._spreadsheet.eventEmitter.emit(
      this._isCol ? 'scrollHorizontal' : 'scrollVertical',
      e,
      newScroll
    )
  }

  /**
   * @internal
   */
  _setScrollSize() {
    const scrollSize =
      this._sheets.sheetDimensions[this._functions.size] +
      this._sheets._getViewportVector()[this._functions.axis]

    this.scrollEl.style[this._functions.size] = `${scrollSize}px`
  }

  /**
   * @internal
   */
  _setYIndex() {
    const xIndex = this._sheetViewportPosition.x
    const stageSize =
      this._sheets.stage[this._functions.size]() -
      this._sheets._getViewportVector()[this._functions.axis]

    const yIndex = this._rowCols._calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    )

    this._sheetViewportPosition.y = yIndex
  }

  /**
   * @internal
   */
  _destroy() {
    this.scrollBarEl.removeEventListener('scroll', this._throttledScroll)
  }
}

export default ScrollBar
