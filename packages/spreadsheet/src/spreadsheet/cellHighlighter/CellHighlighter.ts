import {
  CellReference,
  EqualsOp,
  RangeSeparator
  // @ts-ignore
} from 'hyperformula/es/parser/LexerConfig'
import { prefix } from '../utils'
import HighlightedCell from '../sheets/cells/cell/HighlightedCell'
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import RangeSimpleCellAddress from '../sheets/cells/cell/RangeSimpleCellAddress'

export interface ICellReferencePart {
  startOffset: number
  endOffset: number
  referenceText: string
  color: string
  type: 'simpleCellString' | 'rangeCellString'
}

class CellHighlighter {
  highlightedCells: HighlightedCell[] = []

  /**
   * @internal
   */
  constructor(private _spreadsheet: Spreadsheet) {}

  /**
   * Alias for `destroyHighlightedCells()`.
   */
  destroy() {
    this.destroyHighlightedCells()
  }

  /**
   * Destroys all of the highlighted cells.
   */
  destroyHighlightedCells() {
    this.highlightedCells.forEach(cell => cell._destroy())
  }

  /**
   *
   * @param text - Any text to search for cell references to return.
   * @returns Information needed to highlight the relevant cells.
   */
  getHighlightedCellReferenceSections(text: string) {
    if (!text) {
      return {
        tokenParts: [],
        cellReferenceParts: []
      }
    }

    const {
      hue: defaultHue,
      saturation,
      lightness,
      alpha,
      goldenRatio
    } = this._spreadsheet.options.cellHighlight

    let hue = defaultHue

    const getSyntaxColor = () => {
      const color = `hsla(${Math.floor(
        hue * 360
      )}, ${saturation}, ${lightness}, ${alpha})`

      hue += goldenRatio
      hue %= 1

      return color
    }

    // TODO: Remove all this when https://github.com/handsontable/hyperformula/issues/854 is done
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer

    const { tokens } = lexer.tokenizeFormula(text)

    const cellReferenceParts: ICellReferencePart[] = []
    const tokenParts = []

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
          const startCellReference = cellReferenceParts.pop()!
          const rangeSeperator = tokens[index - 1]
          const endCellReference = token

          hue -= goldenRatio

          cellReferenceParts.push({
            startOffset: startCellReference.startOffset,
            endOffset: endCellReference.endOffset,
            referenceText:
              startCellReference.referenceText +
              rangeSeperator.image +
              endCellReference.image,
            color: getSyntaxColor(),
            type: 'rangeCellString'
          })
        } else {
          cellReferenceParts.push({
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            referenceText: token.image,
            color: getSyntaxColor(),
            type: 'simpleCellString'
          })
        }
      }
    }

    const setNonReferenceSlicedSpan = (start: number, end?: number) => {
      const slicedString = text.slice(start, end)
      const span = document.createElement('span')

      if (!slicedString.length) return

      span.classList.add(`${prefix}-token`)

      span.textContent = slicedString

      tokenParts.push(span)
    }

    if (cellReferenceParts.length && text.length) {
      let prevIndex = 0

      cellReferenceParts.forEach(
        ({ startOffset, endOffset, referenceText, color }) => {
          setNonReferenceSlicedSpan(prevIndex, startOffset)

          const formulaTokenSpan = document.createElement('span')

          formulaTokenSpan.textContent = referenceText
          formulaTokenSpan.classList.add(`${prefix}-formula-token`)
          formulaTokenSpan.style.color = color

          tokenParts.push(formulaTokenSpan)

          prevIndex = endOffset + 1
        }
      )

      setNonReferenceSlicedSpan(
        cellReferenceParts[cellReferenceParts.length - 1].endOffset + 1
      )
    } else {
      const span = document.createElement('span')

      span.classList.add(`${prefix}-token`)

      span.textContent = text

      tokenParts.push(span)
    }

    return {
      tokenParts,
      cellReferenceParts
    }
  }

  /**
   *
   * @param cellReferenceParts - The parts returned from `getHighlightedCellReferenceSections()`.
   */
  setHighlightedCells(cellReferenceParts: ICellReferencePart[]) {
    const sheet = this._spreadsheet.sheets.cellEditor.currentCell!
      .simpleCellAddress.sheet

    this.destroyHighlightedCells()

    cellReferenceParts.forEach(({ referenceText, type, color }) => {
      let highlightedCell

      if (type === 'simpleCellString') {
        const precedentSimpleCellAddress = this._spreadsheet.hyperformula.simpleCellAddressFromString(
          referenceText,
          sheet
        )!

        // Don't highlight cells if cell reference is another sheet
        if (sheet === precedentSimpleCellAddress.sheet) {
          highlightedCell = new HighlightedCell(
            this._spreadsheet.sheets,
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
            this._spreadsheet.sheets,
            startSimpleCellAddress,
            color
          )

          highlightedCell._setRangeCellAddress(rangeSimpleCellAddress)
        }
      }
      if (highlightedCell) {
        const stickyGroup = highlightedCell.getStickyGroupCellBelongsTo()
        const sheetGroup = this._spreadsheet.sheets.scrollGroups[stickyGroup]
          .sheetGroup

        sheetGroup.add(highlightedCell.group)

        this.highlightedCells.push(highlightedCell)
      }
    })
  }
}

export default CellHighlighter
