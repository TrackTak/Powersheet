import { Layer } from 'konva/lib/Layer'
import { Rect } from 'konva/lib/shapes/Rect'
import { Group } from 'konva/lib/Group'
import { Vector2d } from 'konva/lib/types'
import Selector from './Selector'
import RowCols, { RowColType } from './rowCols/RowCols'
import CellEditor from './cellEditor/CellEditor'
import RightClickMenu from './rightClickMenu/RightClickMenu'
import { Stage } from 'konva/lib/Stage'
import Spreadsheet from '../Spreadsheet'
import { prefix, reverseVectorsIfStartBiggerThanEnd } from '../utils'
import styles from './Sheets.module.scss'
import { KonvaEventObject } from 'konva/lib/Node'
import Comment from './comment/Comment'
import { debounce, DebouncedFunc, throttle } from 'lodash'
import SimpleCellAddress from './cells/cell/SimpleCellAddress'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
import Cell from './cells/cell/Cell'
import Cells from './cells/Cells'
import { ISheetData } from './Data'
import Merger from './Merger'
import Clipboard from '../Clipboard'
import { Line } from 'konva/lib/shapes/Line'
import CellError from './cellError/CellError'
import { DetailedCellError } from '@tracktak/hyperformula'

export interface IDimensions {
  width: number
  height: number
}

export type SheetId = number

interface IScrollGroup {
  group: Group
  sheetGroup: Group
  cellGroup: Group
  cellBorders: Group
  rowColGroup: Group
  headerGroup: Group
}

export const scrollGroups = ['main', 'xSticky', 'ySticky', 'xySticky']

export interface IScrollGroups {
  main: IScrollGroup
  xSticky: IScrollGroup
  ySticky: IScrollGroup
  xySticky: IScrollGroup
}

export interface ICustomSizes {
  size: number
}

export interface ICachedRowColGroups {
  headerGroups: Group[]
  gridLines: Line[]
}

export interface ICachedCellGroups {
  group: Group
  borderGroup: Group
}

export interface ICachedGroups {
  cells: ICachedCellGroups[]
  rows: ICachedRowColGroups
  cols: ICachedRowColGroups
}

export interface ICachedGroupsNumber {
  cells: number
  rows: number
  cols: number
}

class Sheets {
  /**
   * The different scroll groups determine which shapes are stickied to
   * either the X, Y, both or no axis.
   */
  scrollGroups!: IScrollGroups
  sheetIds: SheetId[] = []
  sheetEl: HTMLDivElement
  /**
   * For the comment with tippy so tippy does not throw warnings
   */
  sheetElContainer: HTMLDivElement
  stage: Stage
  layer: Layer
  sheet: Rect
  topLeftRect!: Rect
  cols: RowCols
  rows: RowCols
  clipboard: Clipboard
  merger: Merger
  selector: Selector
  cells: Cells
  sheetDimensions: IDimensions = {
    width: 0,
    height: 0
  }
  cellEditor: CellEditor
  rightClickMenu: RightClickMenu
  comment: Comment
  cellError: CellError
  activeSheetId = 0
  totalSheetCount = 0
  /**
   * @internal
   */
  _cachedGroups: ICachedGroups = {
    cells: [],
    rows: {
      headerGroups: [],
      gridLines: []
    },
    cols: {
      headerGroups: [],
      gridLines: []
    }
  }
  /**
   * @internal
   */
  _cachedGroupsNumber: ICachedGroupsNumber = {
    cells: 0,
    rows: 0,
    cols: 0
  }
  private _previousSheetClickTime = 0
  private _sheetClickTime = 0
  private _debouncedResize: DebouncedFunc<(e: Event) => void>
  private _throttledSheetMove: DebouncedFunc<
    (e: KonvaEventObject<MouseEvent>) => void
  >

  /**
   * @internal
   */
  constructor(
    /**
     * @internal
     */
    public _spreadsheet: Spreadsheet
  ) {
    this.sheetElContainer = document.createElement('div')
    this.sheetElContainer.classList.add(
      `${prefix}-sheet-container`,
      styles.sheetContainer
    )

    this.sheetEl = document.createElement('div')
    this.sheetEl.classList.add(`${prefix}-sheet`, styles.sheet)

    this.sheetElContainer.appendChild(this.sheetEl)
    this._spreadsheet.spreadsheetEl.appendChild(this.sheetElContainer)

    this._debouncedResize = debounce(this._onResize, 50)
    this._throttledSheetMove = throttle(this._onSheetMouseMove, 35)

    this.sheet = new Rect({
      name: 'sheet',
      listening: true,
      opacity: 0
    })

    this.stage = new Stage({
      container: this.sheetEl
    })

    this.layer = new Layer()

    this.layer.add(this.sheet)

    this.stage.add(this.layer)

    scrollGroups.forEach(key => {
      const type = key as keyof IScrollGroups

      const group = new Group({
        name: 'scrollGroup'
      })

      const sheetGroup = new Group({
        name: 'sheetGroup',
        listening: true
      })

      const cellGroup = new Group({
        name: 'cellGroup',
        listening: false
      })

      const cellBorders = new Group({
        name: 'cellBorders',
        listening: false
      })

      const rowColGroup = new Group({
        name: 'rowColGroup'
      })

      const headerGroup = new Group({
        name: 'headerGroup',
        listening: true
      })

      // The order added here matters as it determines the zIndex for konva
      sheetGroup.add(rowColGroup, cellGroup, cellBorders)
      group.add(sheetGroup, headerGroup)

      this.layer.add(group)

      this.sheet.moveToTop()

      this.scrollGroups = {
        ...this.scrollGroups,
        [type]: {
          ...this.scrollGroups?.[type],
          group,
          sheetGroup,
          cellGroup,
          cellBorders,
          rowColGroup,
          headerGroup
        }
      }
    })

    this.clipboard = new Clipboard(this)
    this.merger = new Merger(this)
    this.cells = new Cells(this)
    this.cols = new RowCols('col', this)
    this.rows = new RowCols('row', this)

    this.selector = new Selector(this)
    this.rightClickMenu = new RightClickMenu(this)
    this.comment = new Comment(this)
    this.cellError = new CellError(this)

    this.stage.on('contextmenu', this._onContextMenu)
    this.stage.on('mousedown', this._stageOnMousedown)
    this.stage.on('click', this._stageOnClick)
    this.stage.on('wheel', this._onWheel)
    this.sheet.on('click', this._sheetOnClick)
    this.sheet.on('mousedown', this._onSheetMouseDown)
    this.sheet.on('mousemove', this._throttledSheetMove)
    this.sheet.on('mouseup', this._onSheetMouseUp)

    this.sheet.on('touchstart', this._sheetOnTouchStart)
    this.sheet.on('touchmove', this._sheetOnTouchMove)
    this.sheet.on('tap', this._sheetOnTap)

    this.sheetEl.tabIndex = 1
    this.sheetEl.addEventListener('keydown', this._keyHandler)

    window.addEventListener('resize', this._debouncedResize)

    this._updateSheetDimensions()

    this.sheet.setPosition(this._getViewportVector())

    // TODO: use scrollBar size instead of hardcoded value
    this.rows.scrollBar.scrollBarEl.style.bottom = `${16}px`

    this.cellEditor = new CellEditor(this)

    this._drawTopLeftOffsetRect()
  }

  private _drawTopLeftOffsetRect() {
    this.topLeftRect = new Rect({
      ...this._spreadsheet.styles.topLeftRect,
      width: this._getViewportVector().x,
      height: this._getViewportVector().y
    })
    this.scrollGroups.xySticky.group.add(this.topLeftRect)

    this.topLeftRect.moveToTop()
  }

  private _onResize = () => {
    this._updateSize()
  }

  private _onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    this.cols.scrollBar.scrollBarEl.scrollBy(e.evt.deltaX, 0)
    this.rows.scrollBar.scrollBarEl.scrollBy(0, e.evt.deltaY)

    this._spreadsheet.eventEmitter.emit('scrollVerticalWheel', e)
  }

  private _sheetOnTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0]
    const touch2 = e.evt.touches[1]

    if (touch1 && touch2) return

    const { clientX, clientY } = touch1

    this.cellEditor.hideAndSave()

    this.cols.scrollBar._previousTouchMovePosition = clientX
    this.rows.scrollBar._previousTouchMovePosition = clientY
  }

  private _sheetOnTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0]
    const touch2 = e.evt.touches[1]

    if (touch1 && touch2) return

    const { clientX, clientY } = touch1

    const deltaX =
      (this.cols.scrollBar._previousTouchMovePosition - clientX) *
      this._spreadsheet.options.touchScrollSpeed

    const deltaY =
      (this.rows.scrollBar._previousTouchMovePosition - clientY) *
      this._spreadsheet.options.touchScrollSpeed

    this.cols.scrollBar.scrollBarEl.scrollBy(deltaX, 0)
    this.rows.scrollBar.scrollBarEl.scrollBy(0, deltaY)

    this.cols.scrollBar._previousTouchMovePosition = clientX
    this.rows.scrollBar._previousTouchMovePosition = clientY
  }

  private _onContextMenu = (e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault()
  }

  private _onSheetMouseDown = () => {
    const vector = this.sheet.getRelativePointerPosition()

    this.selector.startSelection(vector)
  }

  private _onSheetMouseMove = () => {
    this.selector.moveSelection()
  }

  private _onSheetMouseUp = () => {
    this.selector.endSelection()
  }

  private _stageOnClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      this.rightClickMenu.hide()
    }

    if (e.evt.button === 2) {
      if (this.rightClickMenu.dropdown.state.isShown) {
        this.rightClickMenu.hide()
      } else {
        this.rightClickMenu.show()
      }
    }
  }

  private _stageOnMousedown = () => {
    this.cellEditor.hideAndSave()
  }

  private _setCellOnAction() {
    const selectedFirstcell = this.selector.selectedCell!
    const simpleCellAddress = selectedFirstcell.simpleCellAddress
    const cellId = simpleCellAddress.toCellId()

    if (this._hasDoubleClickedOnCell()) {
      this.cellEditor.showAndSetValue(selectedFirstcell)
    }

    if (this._spreadsheet.data._spreadsheetData.cells?.[cellId]?.comment) {
      this.comment.show(simpleCellAddress)
    }

    const cellValue =
      this._spreadsheet.hyperformula.getCellValue(simpleCellAddress)
    if (cellValue instanceof DetailedCellError) {
      this.cellError.show(cellValue.message || cellValue.type)
    }
  }

  private _sheetOnTap = () => {
    const vector = this.sheet.getRelativePointerPosition()

    this.selector.startSelection(vector)
    this.selector.endSelection()

    this._setCellOnAction()
  }

  private _sheetOnClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      this._setCellOnAction()
    }
  }

  private _hasDoubleClickedOnCell() {
    this._previousSheetClickTime = this._sheetClickTime

    this._sheetClickTime = new Date().getTime()
    const delayTimeMilliseconds = 300

    return (
      !this.selector.hasChangedCellSelection() &&
      this._sheetClickTime <=
        this._previousSheetClickTime + delayTimeMilliseconds
    )
  }

  private _keyHandler = (e: KeyboardEvent) => {
    e.stopPropagation()

    new Promise(resolve => {
      switch (e.key) {
        case 'Escape': {
          break
        }
        case 'Delete': {
          this._spreadsheet.hyperformula.batch(() => {
            this._spreadsheet.pushToHistory(() => {
              this.selector.selectedCells.forEach(cell => {
                const simpleCellAddress = cell.simpleCellAddress

                this._spreadsheet.data.setCell(simpleCellAddress, {
                  value: undefined
                })
              })
            })
          })
          break
        }
        case e.ctrlKey && 'z': {
          e.preventDefault()

          this._spreadsheet.undo()
          break
        }
        case e.ctrlKey && 'y': {
          this._spreadsheet.redo()
          break
        }
        case e.ctrlKey && 'x': {
          this.clipboard.cut()
          break
        }
        case e.ctrlKey && 'c': {
          this.clipboard.copy()
          break
        }
        case e.ctrlKey && 'v': {
          this.clipboard.paste()
          break
        }
        default:
          if (this.cellEditor.getIsHidden() && !e.ctrlKey) {
            const selectedCell = this.selector.selectedCell!
            const serializedValue =
              this._spreadsheet.hyperformula.getCellSerialized(
                selectedCell.simpleCellAddress
              )

            if (serializedValue) {
              this.cellEditor.clear()
              this.cellEditor.show(selectedCell)

              this.cellEditor.cellEditorEl.focus()
            } else {
              this.cellEditor.showAndSetValue(selectedCell)
            }
          }
      }

      resolve(undefined)
    }).then(() => {
      this._spreadsheet.render()
    })
  }

  private _updateSheetDimensions() {
    this.sheetDimensions.width = this.cols._getTotalSize()
    this.sheetDimensions.height = this.rows._getTotalSize()
  }

  deleteSheet(sheetId: SheetId) {
    if (this.activeSheetId === sheetId) {
      const currentIndex = this.sheetIds.indexOf(sheetId)

      if (currentIndex === 0) {
        this.switchSheet(this.sheetIds[1])
      } else {
        this.switchSheet(this.sheetIds[currentIndex - 1])
      }
    }

    this._spreadsheet.data.deleteSheet(sheetId)

    delete this.sheetIds[sheetId]

    this._spreadsheet.render()
  }

  switchSheet(sheetId: SheetId) {
    this.cells._destroy()
    this.rows._destroy()
    this.cols._destroy()
    this.selector._destroy()

    this.activeSheetId = sheetId

    this.merger = new Merger(this)
    this.cells = new Cells(this)
    this.cols = new RowCols('col', this)
    this.rows = new RowCols('row', this)
    this.selector = new Selector(this)

    this._spreadsheet.render()
  }

  renameSheet(sheetId: SheetId, sheetName: string) {
    this._spreadsheet.data.setSheet(sheetId, {
      sheetName
    })
    this._spreadsheet.hyperformula.renameSheet(sheetId, sheetName)

    this._spreadsheet.render()
  }

  createNewSheet(data: ISheetData) {
    this._spreadsheet.data.setSheet(data.id, data)
    this._spreadsheet.hyperformula.addSheet(data.sheetName)

    this.totalSheetCount++

    this.sheetIds[data.id] = data.id

    this._spreadsheet.render()
  }

  getSheetName() {
    return `Sheet${this.totalSheetCount + 1}`
  }

  /**
   * @internal
   */
  _updateSize() {
    // 16 is scrollbar
    this.stage.width(this.sheetEl.offsetWidth - 16)
    this.stage.height(this.sheetEl.offsetHeight - 16)

    this.sheet.width(this.stage.width() - this._getViewportVector().x)
    this.sheet.height(this.stage.height() - this._getViewportVector().y)

    this.rows._updateViewportSize()
    this.cols._updateViewportSize()

    const context = this.layer.canvas.getContext()

    // We reset the translate each time and then
    // translate 0.5 for crisp lines.
    context.reset()
    context.translate(0.5, 0.5)

    this.rows._setCachedRowCols()
    this.cols._setCachedRowCols()
    this.cells._setCachedCells()

    this._spreadsheet.render()
  }

  /**
   * @internal
   */
  _getMinMaxRangeSimpleCellAddress(cells: Cell[]) {
    const getMin = (type: RowColType) =>
      Math.min(
        ...cells.map(
          cell => cell.rangeSimpleCellAddress.topLeftSimpleCellAddress[type]
        )
      )
    const getMax = (type: RowColType) =>
      Math.max(
        ...cells.map(
          cell => cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress[type]
        )
      )

    return new RangeSimpleCellAddress(
      new SimpleCellAddress(this.activeSheetId, getMin('row'), getMin('col')),
      new SimpleCellAddress(this.activeSheetId, getMax('row'), getMax('col'))
    )
  }

  /**
   * @internal
   */
  _getViewportVector() {
    return {
      x: this._spreadsheet.styles.row.headerRect.width!,
      y: this._spreadsheet.styles.col.headerRect.height!
    }
  }

  /**
   * @internal
   */
  _convertVectorsToRangeSimpleCellAddress(start: Vector2d, end: Vector2d) {
    const { start: newStart, end: newEnd } = reverseVectorsIfStartBiggerThanEnd(
      start,
      end
    )

    const rowIndexes = this.rows._getTopBottomIndexFromPosition({
      x: newStart.y,
      y: newEnd.y
    })

    const colIndexes = this.cols._getTopBottomIndexFromPosition({
      x: newStart.x,
      y: newEnd.x
    })

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(
        this.activeSheetId,
        rowIndexes.topIndex,
        colIndexes.topIndex
      ),
      new SimpleCellAddress(
        this.activeSheetId,
        rowIndexes.bottomIndex,
        colIndexes.bottomIndex
      )
    )

    for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
      for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
        const simpleCellAddress = new SimpleCellAddress(
          this.activeSheetId,
          ri,
          ci
        )
        const cellId = simpleCellAddress.toCellId()
        const mergedCellId = this.merger.associatedMergedCellAddressMap[cellId]

        if (mergedCellId) {
          const mergedCell =
            this._spreadsheet.data._spreadsheetData.mergedCells![mergedCellId]
          const existingRangeSimpleCellAddress =
            RangeSimpleCellAddress.mergedCellToAddress(mergedCell)

          rangeSimpleCellAddress.limitTopLeftAddressToAnotherRange(
            'col',
            existingRangeSimpleCellAddress
          )
          rangeSimpleCellAddress.limitTopLeftAddressToAnotherRange(
            'row',
            existingRangeSimpleCellAddress
          )
          rangeSimpleCellAddress.limitBottomRightAddressToAnotherRange(
            'col',
            existingRangeSimpleCellAddress
          )
          rangeSimpleCellAddress.limitBottomRightAddressToAnotherRange(
            'row',
            existingRangeSimpleCellAddress
          )
        }
      }
    }

    return rangeSimpleCellAddress
  }

  /**
   * @internal
   */
  _getStickyGroupType(isOnFrozenRow: boolean, isOnFrozenCol: boolean) {
    if (isOnFrozenRow && isOnFrozenCol) {
      return 'xySticky'
    } else if (isOnFrozenRow) {
      return 'ySticky'
    } else if (isOnFrozenCol) {
      return 'xSticky'
    } else {
      return 'main'
    }
  }

  /**
   * @internal
   */
  _destroy() {
    this.stage.off('contextmenu', this._onContextMenu)
    this.stage.off('mousedown', this._stageOnMousedown)
    this.stage.off('click', this._stageOnClick)
    this.stage.off('wheel', this._onWheel)
    this.sheet.off('click', this._sheetOnClick)
    this.sheet.off('mousedown', this._onSheetMouseDown)
    this.sheet.off('mousemove', this._throttledSheetMove)
    this.sheet.off('mouseup', this._onSheetMouseUp)

    this.sheet.off('touchstart', this._sheetOnTouchStart)
    this.sheet.off('touchmove', this._sheetOnTouchMove)
    this.sheet.off('tap', this._sheetOnTap)

    this.sheetEl.removeEventListener('keydown', this._keyHandler)

    window.removeEventListener('resize', this._debouncedResize)

    this.sheetEl.remove()
    this.stage.destroy()
    this.cols._destroy()
    this.rows._destroy()
    this.cellEditor?._destroy()
    this.comment._destroy()
    this.cellError._destroy()
    this.rightClickMenu._destroy()
  }

  /**
   * @internal
   */
  _render() {
    Object.keys(this.scrollGroups).forEach(key => {
      const type = key as keyof IScrollGroups

      const scrollGroup = this.scrollGroups[type]

      scrollGroup.sheetGroup.setAttrs(this._getViewportVector())
    })

    this._updateSheetDimensions()

    this.cells._resetCachedCells()
    this.cells._render()

    this.rows._clearAll()
    this.rows._render()

    this.cols._clearAll()
    this.cols._render()

    this.selector._render()
  }
}

export default Sheets
