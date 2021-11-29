import { IRect } from 'konva/lib/types'
import Sheet from '../Sheets'
import styles from './CellEditor.module.scss'
import { DelegateInstance, delegate } from 'tippy.js'
import FormulaHelper from '../../formulaHelper/FormulaHelper'
import Spreadsheet from '../../Spreadsheet'
import Cell from '../cells/cell/Cell'
import { prefix, saveCaretPosition, setCaretToEndOfElement } from '../../utils'
import { HyperFormula } from '@tracktak/hyperformula'
import { isPercent } from 'numfmt'
import { ICellData } from '../Data'
import SimpleCellAddress from '../cells/cell/SimpleCellAddress'
import CellHighlighter from '../../cellHighlighter/CellHighlighter'

export interface ICurrentScroll {
  row: number
  col: number
}

class CellEditor {
  cellEditorContainerEl: HTMLDivElement
  cellEditorEl: HTMLDivElement
  cellTooltip: DelegateInstance
  formulaHelper?: FormulaHelper
  cellHighlighter: CellHighlighter
  currentCell: Cell | null = null
  currentScroll: ICurrentScroll | null = null
  currentCaretPosition: number | null = null
  currentCellText: string | null = null
  private spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private sheet: Sheet) {
    this.spreadsheet = this.sheet.spreadsheet

    this.cellHighlighter = new CellHighlighter(this.spreadsheet)

    this.cellEditorEl = document.createElement('div')
    this.cellEditorEl.contentEditable = 'true'
    this.cellEditorEl.spellcheck = false
    this.cellEditorEl.classList.add(`${prefix}-cell-editor`, styles.cellEditor)

    this.cellEditorContainerEl = document.createElement('div')
    this.cellEditorContainerEl.classList.add(
      `${prefix}-cell-editor-container`,
      styles.cellEditorContainer
    )
    this.cellEditorContainerEl.appendChild(this.cellEditorEl)
    this.cellTooltip = delegate(this.cellEditorEl, {
      target: styles.cellEditor,
      arrow: false,
      trigger: 'manual',
      hideOnClick: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5]
    })
    this.sheet.sheetEl.appendChild(this.cellEditorContainerEl)

    this.cellEditorEl.addEventListener('input', this.onInput)
    this.cellEditorEl.addEventListener('keydown', this.onKeyDown)

    this.cellEditorContainerEl.style.display = 'none'

    this.formulaHelper = new FormulaHelper(
      HyperFormula.getRegisteredFunctionNames('enGB'),
      this.onItemClick
    )

    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl)
  }

  private onItemClick = (suggestion: string) => {
    const value = `=${suggestion}()`

    this.setContentEditable(value)

    this.cellEditorEl.focus()
    this.formulaHelper?.hide()

    setCaretToEndOfElement(this.cellEditorEl)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()

    switch (e.key) {
      case 'Escape': {
        this.hide()
        break
      }
      case 'Enter': {
        this.hideAndSave()
        break
      }
    }
  }

  private onInput = (e: Event) => {
    const target = e.target as HTMLDivElement
    const textContent = target.textContent

    const restoreCaretPosition = saveCaretPosition(this.cellEditorEl)

    this.setContentEditable(textContent ?? null)

    restoreCaretPosition()

    const isFormulaInput = textContent?.startsWith('=')

    if (isFormulaInput) {
      this.formulaHelper?.show(textContent?.slice(1))
    } else {
      this.formulaHelper?.hide()
    }
  }

  private setCellValue(simpleCellAddress: SimpleCellAddress) {
    const serializedValue =
      this.spreadsheet.hyperformula.getCellSerialized(simpleCellAddress)

    this.setContentEditable(serializedValue?.toString() ?? null)

    this.cellEditorEl.focus()
  }

  /**
   * Should be called when the `currentCellText` is ready to be
   * persisted.
   */
  saveContentToCell() {
    const simpleCellAddress = this.currentCell!.simpleCellAddress
    const cell =
      this.spreadsheet.data._spreadsheetData.cells?.[
        simpleCellAddress.toCellId()
      ]
    const cellValue =
      this.spreadsheet.hyperformula
        .getCellSerialized(simpleCellAddress)
        ?.toString() ?? undefined

    this.spreadsheet.pushToHistory(() => {
      const value = this.currentCellText ? this.currentCellText : undefined

      if (cellValue !== value) {
        const newCell: Omit<ICellData, 'id'> = {
          value
        }

        if (isPercent(value)) {
          if (!isPercent(cell?.textFormatPattern)) {
            newCell.textFormatPattern = '0.00%'
          }
        } else if (!isPercent(value) && isPercent(cell?.textFormatPattern)) {
          newCell.value += '%'
        }

        this.spreadsheet.data.setCell(simpleCellAddress, newCell)
      }
    })
  }

  /**
   * @internal
   */
  destroy() {
    this.cellTooltip.destroy()
    this.cellHighlighter.destroy()
    this.cellEditorContainerEl.remove()
    this.cellEditorEl.removeEventListener('input', this.onInput)
    this.cellEditorEl.removeEventListener('keydown', this.onKeyDown)
    this.formulaHelper?._destroy()
  }

  /**
   * @returns If the CellEditor is showing or not
   */
  getIsHidden() {
    return this.cellEditorContainerEl.style.display === 'none'
  }

  /**
   * Parses the string to find any cell references
   * and highlights them.
   *
   * @param text The text to set in the CellEditor
   */
  setContentEditable(text: string | null) {
    this.clear()
    this.spreadsheet.formulaBar?.clear()

    this.currentCellText = text

    const { tokenParts, cellReferenceParts } =
      this.cellHighlighter.getHighlightedCellReferenceSections(
        this.currentCellText ?? ''
      )

    this.cellHighlighter.setHighlightedCells(cellReferenceParts)

    tokenParts.forEach(part => {
      this.cellEditorEl.appendChild(part)
      this.spreadsheet.formulaBar?.editableContent.appendChild(
        part.cloneNode(true)
      )
    })

    this.spreadsheet.eventEmitter.emit('cellEditorChange', text)
  }

  /**
   * Shows the CellEditor and sets the value of it to the passed
   * in cell.
   *
   * @param cell - The cell which the CellEditor should be shown on.
   */
  showAndSetValue(cell: Cell) {
    this.show(cell)
    this.setCellValue(cell.simpleCellAddress)

    setCaretToEndOfElement(this.cellEditorEl)
  }

  /**
   * Shows the CellEditor and clears the text.
   *
   * @param cell - The cell which the CellEditor should be shown on.
   */
  show(cell: Cell) {
    this.currentCell = cell
    this.currentScroll = {
      row: this.sheet.rows.scrollBar.scroll,
      col: this.sheet.cols.scrollBar.scroll
    }

    this.clear()
    this.cellEditorContainerEl.style.display = 'block'

    this.setCellEditorElPosition(cell.getClientRectWithoutStroke())
  }

  /**
   * Clears the CellEditor text and highlighted cells.
   */
  clear() {
    this.currentCellText = null
    this.cellEditorEl.textContent = null
    this.cellHighlighter.destroyHighlightedCells()
  }

  /**
   * Hides the CellEditor and saves the text to the cell.
   */
  hideAndSave() {
    if (!this.getIsHidden()) {
      this.saveContentToCell()
      this.hide()
    }
  }

  /**
   * Hides the CellEditor and clears the value.
   */
  hide() {
    this.clear()

    this.currentCell = null
    this.currentScroll = null
    this.cellTooltip.hide()

    this.cellEditorContainerEl.style.display = 'none'

    this.cellEditorEl.blur()
    this.sheet.sheetEl.focus()

    this.spreadsheet.render()
  }

  /**
   * Sets the CellEditor position to the passed in rect's dimensions.
   *
   * @param rect - The dimensions to set the CellEditor to.
   */
  setCellEditorElPosition = (rect: IRect) => {
    this.cellEditorContainerEl.style.top = `${rect.y}px`
    this.cellEditorContainerEl.style.left = `${rect.x}px`
    this.cellEditorContainerEl.style.minWidth = `${rect.width + 1}px`
    this.cellEditorContainerEl.style.height = `${rect.height + 1}px`
  }

  /**
   * Hides the cell tooltip.
   */
  hideCellTooltip = () => {
    this.cellTooltip.hide()
  }

  /**
   * Shows the cell tooltip and sets the text of it to be
   * the current cells value.
   */
  showCellTooltip = () => {
    if (this.currentCell) {
      const simpleCellAddress = this.currentCell.simpleCellAddress

      this.cellTooltip.setContent(simpleCellAddress.addressToString())
      this.cellTooltip.show()
    }
  }
}

export default CellEditor
