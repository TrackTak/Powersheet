import {
  CellReference,
  EqualsOp,
  RangeSeparator
  // @ts-ignore
} from '@tracktak/hyperformula/es/parser/LexerConfig'
import { prefix } from '../utils'
import HighlightedCell from '../sheets/cells/cell/HighlightedCell'
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import RangeSimpleCellAddress from '../sheets/cells/cell/RangeSimpleCellAddress'
import { IToken } from 'chevrotain'
import styles from './CellHighlighter.module.scss'
import Sheets from '../sheets/Sheets'

export interface ICellReferenceToken {
  startOffset: number
  endOffset: number
  referenceText: string
  color: string
  type: 'simpleCellString' | 'rangeCellString'
}

class CellHighlighter {
  highlightedCells: HighlightedCell[] = []
  currentHighlightedCell: HighlightedCell | null = null
  currentHue: number
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
    this.currentHue = this._spreadsheet.options.cellHighlight.hue
  }

  /**
   * @internal
   * Alias for `destroyHighlightedCells()`.
   */
  _destroy() {
    this.destroyHighlightedCells()
  }

  /**
   * Destroys all of the highlighted cells.
   */
  destroyHighlightedCells() {
    this.highlightedCells.forEach(cell => cell._destroy())
  }

  getCurrentColor() {
    const {
      saturation,
      lightness,
      alpha
    } = this._spreadsheet.options.cellHighlight

    return `hsla(${Math.floor(
      this.currentHue * 360
    )}, ${saturation}, ${lightness}, ${alpha})`
  }

  generateNewSyntaxColor() {
    const { goldenRatio } = this._spreadsheet.options.cellHighlight

    const color = this.getCurrentColor()

    this.currentHue += goldenRatio
    this.currentHue %= 1

    return color
  }

  resetCurrentHue() {
    this.currentHue = this._spreadsheet.options.cellHighlight.hue
  }

  /**
   *
   * @param text - Any text to search for cell references to return.
   * @returns Information needed to highlight the relevant cells.
   */
  textToHighlightedCellReferenceToken(text: string) {
    const { goldenRatio } = this._spreadsheet.options.cellHighlight

    // TODO: Remove all this when https://github.com/handsontable/hyperformula/issues/854 is done
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer

    const { tokens } = lexer.tokenizeFormula(text)

    const cellReferenceTokens: ICellReferenceToken[] = []

    this.resetCurrentHue()

    for (const [index, token] of tokens.entries()) {
      if (index === 0 && token.tokenType.name !== EqualsOp.name) {
        break
      }

      if (token.tokenType.name === CellReference.name) {
        // Handles ranges, e.g. A2:B2
        if (
          tokens[index - 2]?.tokenType.name === CellReference.name &&
          tokens[index - 1]?.tokenType.name === RangeSeparator.name
        ) {
          const startCellReference = cellReferenceTokens.pop()!
          const rangeSeperator = tokens[index - 1]
          const endCellReference = token

          this.currentHue -= goldenRatio

          cellReferenceTokens.push({
            type: 'rangeCellString',
            startOffset: startCellReference.startOffset,
            endOffset: endCellReference.endOffset,
            referenceText:
              startCellReference.referenceText +
              rangeSeperator.image +
              endCellReference.image,
            color: this.generateNewSyntaxColor()
          })
        } else {
          cellReferenceTokens.push({
            type: 'simpleCellString',
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            referenceText: token.image,
            color: this.generateNewSyntaxColor()
          })
        }
      }
    }

    const sheet = this._sheets.cellEditor.currentCell!.simpleCellAddress.sheet

    this.destroyHighlightedCells()

    cellReferenceTokens.forEach(({ referenceText, type, color }) => {
      let highlightedCell

      if (type === 'simpleCellString') {
        const precedentSimpleCellAddress = this._spreadsheet.hyperformula.simpleCellAddressFromString(
          referenceText,
          sheet
        )!

        // Don't highlight cells if cell reference is another sheet
        if (sheet === precedentSimpleCellAddress.sheet) {
          highlightedCell = new HighlightedCell(
            this._sheets,
            new SimpleCellAddress(
              precedentSimpleCellAddress.sheet,
              precedentSimpleCellAddress.row,
              precedentSimpleCellAddress.col
            ),
            color
          )
        }
      } else {
        const precedentSimpleCellRange = this._spreadsheet.hyperformula.simpleCellRangeFromString(
          referenceText,
          sheet
        )!

        // Don't highlight cells if cell reference is another sheet
        if (sheet === precedentSimpleCellRange.start.sheet) {
          const startSimpleCellAddress = new SimpleCellAddress(
            precedentSimpleCellRange.start.sheet,
            precedentSimpleCellRange.start.row,
            precedentSimpleCellRange.start.col
          )
          const endSimpleCellAddress = new SimpleCellAddress(
            precedentSimpleCellRange.end.sheet,
            precedentSimpleCellRange.end.row,
            precedentSimpleCellRange.end.col
          )

          const rangeSimpleCellAddress = new RangeSimpleCellAddress(
            startSimpleCellAddress,
            endSimpleCellAddress
          )

          highlightedCell = new HighlightedCell(
            this._sheets,
            startSimpleCellAddress,
            color
          )

          highlightedCell._setRangeCellAddress(rangeSimpleCellAddress)
        }
      }
      if (highlightedCell) {
        const stickyGroup = highlightedCell.getStickyGroupCellBelongsTo()
        const sheetGroup = this._sheets.scrollGroups[stickyGroup].sheetGroup

        sheetGroup.add(highlightedCell.group)

        this.highlightedCells.push(highlightedCell)
      }
    })

    this.resetCurrentHue()

    return cellReferenceTokens
  }

  getStyledTokens(text: string) {
    const isFormula = text?.startsWith('=')

    if (!isFormula) {
      const span = document.createElement('span')

      span.textContent = text

      return [span]
    }

    const cellReferenceTokens = this.textToHighlightedCellReferenceToken(text)
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const { tokens } = lexer.tokenizeFormula(text)
    const tokenParts = []
    const tokenIndexes = tokens.reduce(
      (acc: Record<number, IToken>, token: IToken) => ({
        ...acc,
        [token.startOffset]: token
      }),
      {}
    )

    const cellReferenceIndexes = cellReferenceTokens.reduce(
      (
        acc: Record<number, ICellReferenceToken>,
        cellReference: ICellReferenceToken
      ) => {
        if (cellReference.type === 'rangeCellString') {
          const cell = cellReference.referenceText.split(':')
          return {
            ...acc,
            [cellReference.startOffset]: cellReference,
            [cellReference.endOffset - cell[1].length + 1]: cellReference
          }
        }

        return {
          ...acc,
          [cellReference.startOffset]: cellReference
        }
      },
      {}
    )

    for (let i = 0; i < text.length; i++) {
      let subString = ''
      const token = tokenIndexes[i]
      const span = document.createElement('span')
      span.classList.add(`${prefix}-token`)
      tokenParts.push(span)
      if (token) {
        subString = text.slice(i, token.endOffset + 1)
        i = token.endOffset
        if (token.image === 'TRUE' || token.image === 'FALSE') {
          span.classList.add(styles.BooleanOp)
        }
        const cellReference = cellReferenceIndexes[token.startOffset]
        if (cellReference) {
          span.style.color = cellReference.color
        } else {
          span.classList.add(styles[token.tokenType.name])
        }
      } else {
        subString = text[i]
      }
      span.textContent = subString
    }
    return tokenParts
  }

  /**
   * @internal
   */
  _createNewHighlightedCellsFromCurrentSelection() {
    const rangeSimpleCellAddress = this._sheets.selector._convertSelectionAreaToRangeSimpleCellAddress()

    const highlightedCell = new HighlightedCell(
      this._sheets,
      rangeSimpleCellAddress.topLeftSimpleCellAddress,
      this.getCurrentColor()
    )

    highlightedCell._setRangeCellAddress(rangeSimpleCellAddress)

    if (highlightedCell) {
      const stickyGroup = highlightedCell.getStickyGroupCellBelongsTo()
      const sheetGroup = this._sheets.scrollGroups[stickyGroup].sheetGroup

      sheetGroup.add(highlightedCell.group)

      this.currentHighlightedCell = highlightedCell

      this.highlightedCells.push(highlightedCell)
    }
  }

  /**
   * @internal
   */
  _updateCurrentHighlightedCell() {
    if (!this.currentHighlightedCell) {
      return
    }

    const rangeSimpleCellAddress = this._sheets.selector._convertSelectionAreaToRangeSimpleCellAddress()

    this.currentHighlightedCell._setRangeCellAddress(rangeSimpleCellAddress)
  }
}

export default CellHighlighter
