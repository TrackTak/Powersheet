import {
  CellReference,
  EqualsOp,
  RangeSeparator
  // @ts-ignore
} from '@tracktak/hyperformula/es/parser/LexerConfig'
import { isStringAFormula, prefix } from '../utils'
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import RangeSimpleCellAddress from '../sheets/cells/cell/RangeSimpleCellAddress'
import { IToken } from 'chevrotain'
import styles from './CellHighlighter.module.scss'
import Sheets from '../sheets/Sheets'
import { Rect } from 'konva/lib/shapes/Rect'
import { getInnerRectConfig } from '../sheets/cells/cell/getInnerRectConfig'
import { Group } from 'konva/lib/Group'
import { IGroupedCells } from '../sheets/cells/Cells'
import HighlightedCell from '../sheets/cells/cell/HighlightedCell'

export interface ICellReferenceToken {
  startOffset: number
  endOffset: number
  referenceText: string
  color: string
  type: 'simpleCellString' | 'rangeCellString'
}

export interface ICellHighlightedArea {
  rect: Rect
  innerRect: Rect
}

export interface IGroupedCellHighlightedArea {
  main?: ICellHighlightedArea
  xSticky?: ICellHighlightedArea
  ySticky?: ICellHighlightedArea
  xySticky?: ICellHighlightedArea
}

class CellHighlighter {
  groupedCellHighlightedAreas: IGroupedCellHighlightedArea[] = []
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
   * Alias for `destroyHighlightedArea()`.
   */
  _destroy() {
    this.destroyHighlightedArea()
  }

  /**
   * Destroys all of the highlighted rects.
   */
  destroyHighlightedArea() {
    this.groupedCellHighlightedAreas.forEach(groups => {
      Object.values(groups).forEach(({ rect, innerRect }) => {
        rect.destroy()
        innerRect.destroy()
      })
    })
    this.groupedCellHighlightedAreas = []
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
    if (!this._sheets.cellEditor.currentCell) {
      return []
    }

    const sheet = this._sheets.cellEditor.currentCell.simpleCellAddress.sheet

    const { goldenRatio } = this._spreadsheet.options.cellHighlight

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

    this.destroyHighlightedArea()

    cellReferenceTokens.forEach(({ referenceText, type, color }) => {
      let rangeSimpleCellAddress

      if (type === 'simpleCellString') {
        const precedentSimpleCellAddress = this._spreadsheet.hyperformula.simpleCellAddressFromString(
          referenceText,
          sheet
        )!

        const simpleCellAddress = new SimpleCellAddress(
          precedentSimpleCellAddress.sheet,
          precedentSimpleCellAddress.row,
          precedentSimpleCellAddress.col
        )

        rangeSimpleCellAddress = new RangeSimpleCellAddress(
          simpleCellAddress,
          simpleCellAddress
        )
      } else {
        const precedentSimpleCellRange = this._spreadsheet.hyperformula.simpleCellRangeFromString(
          referenceText,
          sheet
        )!

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

        rangeSimpleCellAddress = new RangeSimpleCellAddress(
          startSimpleCellAddress,
          endSimpleCellAddress
        )
      }

      // Only highlight cells from correct sheet
      if (rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet === sheet) {
        const cells = rangeSimpleCellAddress.getCellsBetweenRange(
          this._sheets,
          simpleCellAddress => {
            return new HighlightedCell(this._sheets, simpleCellAddress)
          }
        )

        const groupedCells = this._sheets.cells._getGroupedCellsByStickyGroup(
          cells
        )

        const groupedCellHighlightedArea: IGroupedCellHighlightedArea = {}

        Object.keys(groupedCells).forEach(key => {
          const type = key as keyof IGroupedCells
          const cells = groupedCells![type]

          if (cells.length) {
            const topLeftCellClientRect = cells[0]._getClientRectWithoutStroke()

            const size = this._sheets._getSizeFromCells(cells)

            const sheetGroup = this._sheets.scrollGroups[type].sheetGroup

            const group = new Group({
              ...topLeftCellClientRect
            })

            const rect = new Rect({
              ...this._spreadsheet.styles.highlightedCell.rect,
              name: 'highlightedRect',
              stroke: undefined,
              fill: color,
              width: size.width,
              height: size.height
            })

            const innerRectConfig = getInnerRectConfig(
              {
                ...this._sheets._spreadsheet.styles.highlightedCell.innerRect,
                name: 'highlightedInnerRect',
                stroke: color
              },
              rect.size()
            )

            const innerRect = new Rect(innerRectConfig)

            groupedCellHighlightedArea[type] = {
              rect,
              innerRect
            }

            group.add(rect, innerRect)

            sheetGroup.add(group)
          }
        })

        this.groupedCellHighlightedAreas.push(groupedCellHighlightedArea)
      }
    })

    this.resetCurrentHue()

    return cellReferenceTokens
  }

  getStyledTokens(text: string) {
    const isFormula = isStringAFormula(text)

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
  _createHighlightedAreaFromCurrentSelection() {
    const rangeSimpleCellAddress = this._sheets.selector._getSelectionAreaFromRangeSimpleCellAddress()
    const cells = rangeSimpleCellAddress.getCellsBetweenRange(
      this._sheets,
      simpleCellAddress => {
        return new HighlightedCell(this._sheets, simpleCellAddress)
      }
    )

    this.destroyHighlightedArea()

    const groupedCells = this._sheets.cells._getGroupedCellsByStickyGroup(cells)

    const groupedCellHighlightedArea: IGroupedCellHighlightedArea = {}

    Object.keys(groupedCells).forEach(key => {
      const type = key as keyof IGroupedCells
      const cells = groupedCells![type]

      if (cells.length) {
        const topLeftCellClientRect = cells[0]._getClientRectWithoutStroke()

        const size = this._sheets._getSizeFromCells(cells)

        const sheetGroup = this._sheets.scrollGroups[type].sheetGroup

        const group = new Group({
          ...topLeftCellClientRect
        })

        const rect = new Rect({
          ...this._spreadsheet.styles.highlightedCell.rect,
          name: 'highlightedRect',
          stroke: undefined,
          fill: this.getCurrentColor(),
          width: size.width,
          height: size.height
        })

        const innerRectConfig = getInnerRectConfig(
          {
            ...this._sheets._spreadsheet.styles.highlightedCell.innerRect,
            name: 'highlightedInnerRect',
            stroke: this.getCurrentColor()
          },
          rect.size()
        )

        const innerRect = new Rect(innerRectConfig)

        groupedCellHighlightedArea[type] = {
          rect,
          innerRect
        }

        group.add(rect, innerRect)

        sheetGroup.add(group)
      }
    })

    const startCellReferenceString = rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()
    const endCellReferenceString = rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()

    const cellReference =
      startCellReferenceString === endCellReferenceString
        ? startCellReferenceString
        : `${startCellReferenceString}:${endCellReferenceString}`

    this._sheets.cellEditor.replaceCellReferenceTextAtCaretPosition(
      cellReference
    )

    this.groupedCellHighlightedAreas.push(groupedCellHighlightedArea)
  }
}

export default CellHighlighter
