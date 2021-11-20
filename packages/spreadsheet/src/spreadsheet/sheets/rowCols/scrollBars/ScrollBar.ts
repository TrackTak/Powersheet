import { DebouncedFunc, throttle } from 'lodash'
import { prefix } from '../../../utils'
import Sheets from '../../Sheets'
import RowCols, { IRowColFunctions, RowColsType, RowColType } from '../RowCols'
import styles from './ScrollBar.module.scss'
import Spreadsheet from '../../../Spreadsheet'
import ViewportPosition from './ViewportPosition'
import RowColAddress from '../../cells/cell/RowColAddress'

export type ScrollBarType = 'horizontal' | 'vertical'

class ScrollBar {
  scrollBarEl: HTMLDivElement
  scrollEl: HTMLDivElement
  /**
   * @internal
   */
  scroll = 0
  /**
   * @internal
   */
  previousTouchMovePosition = 0
  /**
   * @internal
   */
  sheetViewportPosition = new ViewportPosition()
  private totalPreviousCustomSizeDifferences = 0
  private previousSheetViewportPosition = new ViewportPosition()
  private scrollType: ScrollBarType
  private throttledScroll: DebouncedFunc<(e: Event) => void>
  private type: RowColType
  private isCol: boolean
  private functions: IRowColFunctions
  private pluralType: RowColsType
  private spreadsheet: Spreadsheet
  private sheets: Sheets

  /**
   * @internal
   */
  constructor(public rowCols: RowCols) {
    this.sheets = this.rowCols.sheets
    this.type = this.rowCols.type
    this.pluralType = this.rowCols.pluralType
    this.spreadsheet = this.sheets.spreadsheet
    this.isCol = this.rowCols.isCol
    this.scrollType = this.isCol ? 'horizontal' : 'vertical'
    this.functions = this.rowCols.functions

    this.scrollBarEl = document.createElement('div')
    this.scrollEl = document.createElement('div')

    this.scrollBarEl.classList.add(
      `${prefix}-scroll-bar`,
      this.scrollType,
      styles[`${this.scrollType}ScrollBar`]
    )

    this.scrollEl.classList.add(
      `${prefix}-scroll`,
      styles[`${this.scrollType}Scroll`]
    )

    this.scrollBarEl.appendChild(this.scrollEl)

    // FPS chrome reports incorrect values for setTimeout with scroll
    // 60 fps: (1000ms / 60fps = 16ms);
    this.throttledScroll = throttle(this.onScroll, 16)

    this.scrollBarEl.addEventListener('scroll', this.throttledScroll)

    this.sheets.sheetEl.appendChild(this.scrollBarEl)

    this.setScrollSize()
    this.moveScrollGroups(0)
  }

  private moveScrollGroups(scroll: number) {
    if (this.isCol) {
      this.sheets.scrollGroups.ySticky.group.x(scroll)
    } else {
      this.sheets.scrollGroups.xSticky.group.y(scroll)
    }

    this.sheets.scrollGroups.main.group[this.functions.axis](scroll)
  }

  private getNewScrollAmount(start: number, end: number) {
    const data = this.spreadsheet.data._spreadsheetData
    const defaultSize = this.spreadsheet.options[this.type].defaultSize

    let newScrollAmount = 0
    let totalCustomSizeDifferencs = 0

    for (let i = start; i < end; i++) {
      const rowCollAddress = new RowColAddress(this.sheets.activeSheetId, i)
      const size =
        data[this.pluralType]?.[rowCollAddress.toSheetRowColId()]?.size

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

  private onScroll = (e: Event) => {
    e.preventDefault()

    const event = e.target! as any
    const scroll = this.isCol ? event.scrollLeft : event.scrollTop
    const scrollSize = this.isCol ? event.scrollWidth : event.scrollHeight

    const scrollPercent = scroll / scrollSize

    this.sheetViewportPosition.x = Math.trunc(
      (this.spreadsheet.options[this.type].amount + 1) * scrollPercent
    )

    let newScroll = Math.abs(this.scroll)

    const scrollAmount = this.getNewScrollAmount(
      this.previousSheetViewportPosition.x,
      this.sheetViewportPosition.x
    )

    const scrollReverseAmount = this.getNewScrollAmount(
      this.sheetViewportPosition.x,
      this.previousSheetViewportPosition.x
    )

    scrollReverseAmount.newScrollAmount *= -1
    scrollReverseAmount.totalCustomSizeDifferencs *= -1

    const totalPreviousCustomSizeDifferences =
      this.totalPreviousCustomSizeDifferences +
      scrollAmount.totalCustomSizeDifferencs +
      scrollReverseAmount.totalCustomSizeDifferencs

    newScroll +=
      scrollAmount.newScrollAmount + scrollReverseAmount.newScrollAmount

    newScroll *= -1

    this.moveScrollGroups(newScroll)

    this.previousSheetViewportPosition.x = this.sheetViewportPosition.x
    this.previousSheetViewportPosition.y = this.sheetViewportPosition.y
    this.scroll = newScroll
    this.totalPreviousCustomSizeDifferences = totalPreviousCustomSizeDifferences

    this.setYIndex()

    this.rowCols.cacheOutOfViewportRowCols()
    this.rowCols.render()
    this.sheets.cells.cacheOutOfViewportCells()
    this.sheets.cells.render()

    if (this.sheets.cellEditor.currentScroll?.[this.type] !== this.scroll) {
      this.sheets.cellEditor.showCellTooltip()
    } else {
      this.sheets.cellEditor.hideCellTooltip()
    }

    this.spreadsheet.eventEmitter.emit(
      this.isCol ? 'scrollHorizontal' : 'scrollVertical',
      e,
      newScroll
    )
  }

  /**
   * @internal
   */
  setScrollSize() {
    const scrollSize =
      this.sheets.sheetDimensions[this.functions.size] +
      this.sheets._getViewportVector()[this.functions.axis]

    this.scrollEl.style[this.functions.size] = `${scrollSize}px`
  }

  /**
   * @internal
   */
  setYIndex() {
    const xIndex = this.sheetViewportPosition.x
    const stageSize =
      this.sheets.stage[this.functions.size]() -
      this.sheets._getViewportVector()[this.functions.axis]

    const yIndex = this.rowCols.calculateSheetViewportEndPosition(
      stageSize,
      xIndex
    )

    this.sheetViewportPosition.y = yIndex
  }

  /**
   * @internal
   */
  destroy() {
    this.scrollBarEl.removeEventListener('scroll', this.throttledScroll)
  }
}

export default ScrollBar
