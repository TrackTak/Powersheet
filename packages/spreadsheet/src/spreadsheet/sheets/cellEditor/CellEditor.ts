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
import FunctionSummaryHelper from '../../functionHelper/functionSummaryHelper/FunctionSummaryHelper'
import { TokenType, IToken } from 'chevrotain'

export interface ICurrentScroll {
  row: number
  col: number
}

const PLACEHOLDER_WHITELIST = [
  'WhiteSpace',
  'PlusOp',
  'MinusOp',
  'TimesOp',
  'DivOp',
  'PowerOp',
  'EqualsOp',
  'NotEqualOp',
  'PercentOp',
  'GreaterThanOrEqualOp',
  'LessThanOrEqualOp',
  'GreaterThanOp',
  'LessThanOp',
  'LParen',
  'ArrayLParen',
  'ArrayRParen',
  'OffsetProcedureName',
  'ProcedureName',
  'ConcatenateOp',
  'AdditionOp',
  'MultiplicationOp',
  'ArrayRowSep',
  'ArrayColSep'
]

class CellEditor {
  cellEditorContainerEl: HTMLDivElement
  cellEditorEl: HTMLDivElement
  cellTooltip: DelegateInstance
  formulaHelper?: FormulaHelper
  functionSummaryHelper: FunctionSummaryHelper
  cellHighlighter: CellHighlighter
  currentCell: Cell | null = null
  currentScroll: ICurrentScroll | null = null
  currentCaretPosition: number | null = null
  currentCellText: string | null = null
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheet: Sheet) {
    this._spreadsheet = this._sheet._spreadsheet

    this.cellHighlighter = new CellHighlighter(this._spreadsheet)

    this.cellEditorEl = document.createElement('div')
    this.cellEditorEl.contentEditable = 'true'
    this.cellEditorEl.spellcheck = false

    const cellEditorClassName = `${prefix}-cell-editor`

    // Do not add local classes to this element. Tippy throws
    // an error due to invalid selector
    this.cellEditorEl.classList.add(cellEditorClassName)

    this.cellEditorContainerEl = document.createElement('div')
    this.cellEditorContainerEl.classList.add(
      `${prefix}-cell-editor-container`,
      styles.cellEditorContainer
    )
    this.cellEditorContainerEl.appendChild(this.cellEditorEl)
    this.cellTooltip = delegate(this.cellEditorEl, {
      target: cellEditorClassName,
      arrow: false,
      trigger: 'manual',
      hideOnClick: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5]
    })
    this._sheet.sheetEl.appendChild(this.cellEditorContainerEl)

    this.cellEditorEl.addEventListener('input', this._onInput)
    this.cellEditorEl.addEventListener('keydown', this._onKeyDown)

    this.cellEditorContainerEl.style.display = 'none'

    this.formulaHelper = new FormulaHelper(
      HyperFormula.getRegisteredFunctionNames('enGB'),
      this._onItemClick
    )
    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl)
    this.functionSummaryHelper = new FunctionSummaryHelper(this._spreadsheet)
    this.cellEditorContainerEl.appendChild(
      this.functionSummaryHelper.functionSummaryHelperEl
    )
  }

  private _onItemClick = (suggestion: string) => {
    const value = `=${suggestion}()`

    this.setContentEditable(value)

    this.cellEditorEl.focus()
    this.formulaHelper?.hide()

    setCaretToEndOfElement(this.cellEditorEl)
  }

  private _onKeyDown = (e: KeyboardEvent) => {
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

  private _nodesToText = (nodes: HTMLCollectionOf<Element>): string =>
    Array.from(nodes).reduce((acc, node) => {
      return acc + node.textContent
    }, '')

  private _onInput = (e: Event) => {
    const target = e.target as HTMLDivElement
    const tokens = target.getElementsByClassName('powersheet-token')
    const textContent = tokens.length
      ? this._nodesToText(tokens)
      : target.textContent

    const restoreCaretPosition = saveCaretPosition(this.cellEditorEl)

    this.setContentEditable(textContent ?? null)

    restoreCaretPosition()

    const isFormulaInput = textContent?.startsWith('=')

    if (isFormulaInput) {
      this.cellEditorEl.classList.add(styles.formulaInput)
      this._spreadsheet.formulaBar?.editableContent.classList.add(
        styles.formulaInput
      )
      let functionName = textContent?.slice(1) ?? ''
      const hasOpenBracket = functionName.includes('(')
      const input = functionName.split('(')
      functionName = hasOpenBracket ? input[0] : functionName
      const parameters = input[1]

      if (hasOpenBracket) {
        this.formulaHelper?.hide()
        this.functionSummaryHelper.show(functionName, parameters)
      } else {
        this.formulaHelper?.show(functionName)
        this.functionSummaryHelper.hide()
      }
    } else {
      this.cellEditorEl.classList.remove(styles.formulaInput)
      this.formulaHelper?.formulaHelperEl.classList.remove(styles.formulaInput)
      this.formulaHelper?.hide()
      this.functionSummaryHelper.hide()
    }
  }

  private _setCellValue(simpleCellAddress: SimpleCellAddress) {
    const serializedValue = this._spreadsheet.hyperformula.getCellSerialized(
      simpleCellAddress
    )

    this.setContentEditable(serializedValue?.toString() ?? null)

    this.cellEditorEl.focus()
  }

  /**
   * Should be called when the `currentCellText` is ready to be
   * persisted.
   */
  saveContentToCell() {
    const simpleCellAddress = this.currentCell!.simpleCellAddress
    const cell = this._spreadsheet.data._spreadsheetData.cells?.[
      simpleCellAddress.toCellId()
    ]
    const cellValue =
      this._spreadsheet.hyperformula
        .getCellSerialized(simpleCellAddress)
        ?.toString() ?? undefined

    this._spreadsheet.pushToHistory(() => {
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

        this._spreadsheet.data.setCell(simpleCellAddress, newCell)
      }
    })
  }

  /**
   * @internal
   */
  _destroy() {
    this.cellTooltip.destroy()
    this.cellHighlighter.destroy()
    this.cellEditorContainerEl.remove()
    this.cellEditorEl.removeEventListener('input', this._onInput)
    this.cellEditorEl.removeEventListener('keydown', this._onKeyDown)
    this.formulaHelper?._destroy()
    this.functionSummaryHelper._destroy()
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
    this._spreadsheet.formulaBar?.clear()

    this.currentCellText = text

    const {
      cellReferenceParts
    } = this.cellHighlighter.getHighlightedCellReferenceSections(
      this.currentCellText ?? ''
    )

    this.cellHighlighter.setHighlightedCells(cellReferenceParts)

    const tokenParts = this._getStyledFormula(text ?? '')
    tokenParts.forEach(part => {
      this.cellEditorEl.appendChild(part)

      this._spreadsheet.formulaBar?.editableContent.appendChild(
        part.cloneNode(true)
      )
    })

    this._spreadsheet.eventEmitter.emit('cellEditorChange', text)
  }

  private _getStyledFormula(formula: string) {
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const { tokens } = lexer.tokenizeFormula(formula)
    const tokenParts = []
    const tokenIndexes = tokens.reduce(
      (acc: Record<number, IToken>, token: IToken) => ({
        ...acc,
        [token.startOffset]: token
      }),
      {}
    )

    for (let i = 0; i < formula.length; i++) {
      let subString = ''
      const token = tokenIndexes[i]
      const span = document.createElement('span')
      span.classList.add(`${prefix}-token`)
      tokenParts.push(span)
      if (token) {
        subString = formula.slice(i, token.endOffset + 1)
        i = token.endOffset
        if (token.image === 'TRUE' || token.image === 'FALSE') {
          span.classList.add(styles.BooleanOp)
        }
        span.classList.add(styles[token.tokenType.name])
        if (
          i === formula.length - 1 &&
          PLACEHOLDER_WHITELIST.includes(token.tokenType.name)
        ) {
          const placeholderEl = document.createElement('span')
          placeholderEl.classList.add(styles.placeholder)
          tokenParts.push(placeholderEl)
        }
      } else {
        subString = formula[i]
      }
      span.textContent = subString
    }
    return tokenParts
  }

  /**
   * Shows the CellEditor and sets the value of it to the passed
   * in cell.
   *
   * @param cell - The cell which the CellEditor should be shown on.
   */
  showAndSetValue(cell: Cell) {
    this.show(cell)
    this._setCellValue(cell.simpleCellAddress)

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
      row: this._sheet.rows.scrollBar._scroll,
      col: this._sheet.cols.scrollBar._scroll
    }

    this.clear()
    this.cellEditorContainerEl.style.display = 'block'

    this.setCellEditorElPosition(cell._getClientRectWithoutStroke())
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
    this._sheet.sheetEl.focus()

    this._spreadsheet.render()
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
