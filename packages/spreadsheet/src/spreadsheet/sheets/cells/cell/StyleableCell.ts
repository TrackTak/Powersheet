import { Line } from 'konva/lib/shapes/Line'
import { Text } from 'konva/lib/shapes/Text'
import Sheets from '../../Sheets'
import FontStyle from './FontStyle'
import TextDecoration from './TextDecoration'
import { format, isPercent } from 'numfmt'
import Cell from './Cell'
import SimpleCellAddress from './SimpleCellAddress'
import {
  BorderStyle,
  HorizontalTextAlign,
  ICellMetadata,
  TextWrap,
  VerticalTextAlign
} from '../../Data'
import {
  CellValue,
  CellValueDetailedType,
  DetailedCellError,
  lexerConfig,
  RawCellContent
} from '@tracktak/hyperformula'
import { Group } from 'konva/lib/Group'
import { isNil } from 'lodash'
import { IToken } from 'chevrotain'

export interface ITextFormatPatternCellReference {
  startOffset: number
  endOffset: number
  cellValue: string
}

/**
 * @internal
 */
class StyleableCell extends Cell {
  text: Text
  commentMarker: Line
  errorMarker: Line
  borders: Record<BorderStyle, Line>

  constructor(
    protected _sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public group: Group,
    public bordersGroup: Group
  ) {
    super(_sheets, simpleCellAddress, group)

    bordersGroup.position(group.position())

    this.text = group.children!.find(x => x.name() === 'text') as Text
    this.commentMarker = group.children!.find(
      x => x.name() === 'commentMarker'
    ) as Line

    this.errorMarker = group.children!.find(
      x => x.name() === 'errorMarker'
    ) as Line

    const borders = bordersGroup.children!.filter(
      x => x.name() === 'borderLine'
    ) as Line[]

    this.borders = {
      borderLeft: borders[0],
      borderRight: borders[1],
      borderBottom: borders[2],
      borderTop: borders[3]
    }

    this._updateStyles()
  }

  private _setBottomBorder(borders: undefined | BorderStyle[]) {
    const border = this.borders.borderBottom

    if (borders?.includes('borderBottom')) {
      const { width, height } = this.rect.size()
      const points = [0, 0, width, 0]

      border.y(height)
      border.points(points)

      border.show()
    } else {
      border.hide()
    }
  }

  private _setRightBorder(borders: undefined | BorderStyle[]) {
    const border = this.borders.borderRight

    if (borders?.includes('borderRight')) {
      const { width, height } = this.rect.size()
      const points = [0, 0, 0, height]

      border.x(width)
      border.points(points)

      border.show()
    } else {
      border.hide()
    }
  }

  private _setTopBorder(borders: undefined | BorderStyle[]) {
    const border = this.borders.borderTop

    if (borders?.includes('borderTop')) {
      const { width } = this.rect.size()
      const points = [0, 0, width, 0]

      border.points(points)
      border.show()
    } else {
      border.hide()
    }
  }

  private _setLeftBorder(borders: undefined | BorderStyle[]) {
    const border = this.borders.borderLeft

    if (borders?.includes('borderLeft')) {
      const { height } = this.rect.size()
      const points = [0, 0, 0, height]

      border.points(points)
      border.show()
    } else {
      border.hide()
    }
  }

  private _setTextWrap(textWrap: undefined | TextWrap) {
    this.text.wrap(textWrap ?? this._sheets._spreadsheet.styles.cell.text.wrap!)
  }

  private _setBackgroundColor(backgroundColor: undefined | string) {
    this.rect.fill(
      backgroundColor ?? this._sheets._spreadsheet.styles.cell.rect.fill!
    )
  }

  private _setFontColor(fontColor: undefined | string) {
    this.text.fill(
      fontColor ?? this._sheets._spreadsheet.styles.cell.text.fill!
    )
  }

  private _setFontSize(fontSize: undefined | number) {
    this.text.fontSize(
      fontSize ?? this._sheets._spreadsheet.styles.cell.text.fontSize!
    )
  }

  private _setBold(bold: undefined | boolean, italic: undefined | boolean) {
    const fontStyle = new FontStyle(this.text, bold ?? false, italic)

    fontStyle.setStyle()
  }

  private _setItalic(italic: undefined | boolean, bold: undefined | boolean) {
    const fontStyle = new FontStyle(this.text, bold, italic ?? false)

    fontStyle.setStyle()
  }

  private _setStrikeThrough(strikeThrough: undefined | boolean, underline: undefined | boolean) {
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough ?? false,
      underline
    )

    textDecoration.setStyle()
  }

  private _setUnderline(underline: undefined | boolean, strikeThrough: undefined | boolean) {
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough,
      underline ?? false
    )

    textDecoration.setStyle()
  }

  private _setHorizontalTextAlign(horizontalTextAlign: undefined | HorizontalTextAlign) {
    this.text.align(
      horizontalTextAlign ?? this._sheets._spreadsheet.styles.cell.text.align!
    )
  }

  private _setVerticalTextAlign(verticalTextAlign: undefined | VerticalTextAlign) {
    this.text.verticalAlign(
      verticalTextAlign ??
        this._sheets._spreadsheet.styles.cell.text.verticalAlign!
    )
  }

  private _setCellCommentMarker(comment: undefined | string) {
    if (comment) {
      const width = this.rect.width()

      this.commentMarker.x(width - 1)
      this.commentMarker.y(this.commentMarker.height() + 1)

      this.commentMarker.show()
    } else {
      this.commentMarker.hide()
    }
  }

  private _setCellErrorMarker(hasError: undefined | boolean) {
    if (hasError) {
      const width = this.rect.width()

      this.errorMarker.x(width - 1)
      this.errorMarker.y(this.errorMarker.height() + 1)

      this.errorMarker.show()
    } else {
      this.errorMarker.hide()
    }
  }

  private _formatTextOnPattern(text: string, textFormatPattern: string) {
    let newText = text

    try {
      newText = format(textFormatPattern, Number(newText))
    } catch (e) {
      newText = e as string
    }

    try {
      newText = format(textFormatPattern, newText)
    } catch (e) {
      newText = e as string
    }

    return newText
  }

  private _parseDynamicTextFormatPattern(textFormatPattern: string) {
    if (textFormatPattern.charAt(0) !== "=") {
      return textFormatPattern
    }

    // @ts-ignore
    const lexer = this._sheets._spreadsheet.hyperformula._parser.lexer
    const tokens = lexer.tokenizeFormula(textFormatPattern).tokens as IToken[]
    const cellReferenceValues: ITextFormatPatternCellReference[] = []

    tokens.forEach((token) => {
      if (token.tokenType.name === lexerConfig.CellReference.name) {
        const address = this._sheets._spreadsheet.hyperformula.simpleCellAddressFromString(token.image, this._sheets.activeSheetId)

        if (address) {
          const cellValue = this._sheets._spreadsheet.hyperformula.getCellValue(address)

          if (cellValue && !Array.isArray(cellValue) && !(cellValue instanceof DetailedCellError) && token.endOffset) {
            // -1 & +1 offset to remove square braces
            cellReferenceValues.push({
              cellValue: cellValue.cellValue as string,
              startOffset: token.startOffset - 1,
              endOffset: token.endOffset + 1
            })
          }
        }
      }
    })

    const initialCharsLength = textFormatPattern.length
    let offsetDifference = 0

    cellReferenceValues.forEach(({ cellValue, startOffset, endOffset }) => {
      const chars = textFormatPattern.split("")
      const start = startOffset + offsetDifference
      const deleteCount = endOffset + offsetDifference - start + 1

      chars.splice(start, deleteCount, cellValue)

      offsetDifference += chars.length - initialCharsLength

      textFormatPattern = chars.join("")
    })

    textFormatPattern = textFormatPattern.slice(1)

    return textFormatPattern
  }

  private _setCellTextValue(cellValueSerialized: undefined | RawCellContent, textFormatPattern: undefined | string) {
    const { cellValue }  =
      this._sheets._spreadsheet.hyperformula.getCellValue(
        this.simpleCellAddress
      )
    const width = this.rect.width()

    let value: undefined | CellValue | RawCellContent = cellValue

    if (this._sheets._spreadsheet.spreadsheetData.showFormulas) {
      this.text.width(width)
      this.text.show()
      this.text.text(cellValueSerialized?.toString() ?? '')

      return
    }

    if (!isNil(value)) {
      let text = value

      const detailedCellType = this._sheets._spreadsheet.hyperformula.getCellValueDetailedType(
        this.simpleCellAddress
      )

      // Only set the width for text wrapping to work
      this.text.width(width)
      this.text.show()

      if (detailedCellType === CellValueDetailedType.ERROR) {
        text = (value as DetailedCellError).value

        this.text.text(text)

        return
      }

      if (
        textFormatPattern &&
        detailedCellType !== CellValueDetailedType.STRING &&
        detailedCellType !== CellValueDetailedType.BOOLEAN
      ) {
        textFormatPattern = this._parseDynamicTextFormatPattern(textFormatPattern)

        text = this._formatTextOnPattern(text.toString(), textFormatPattern)
      }

      if (detailedCellType === CellValueDetailedType.NUMBER_PERCENT && !isPercent(text)) {
        text = ((text as number) * 100).toFixed(2) + "%"
      }

      if (detailedCellType === CellValueDetailedType.NUMBER_CURRENCY && !isPercent(textFormatPattern)) {
        const currencySymbol = this._sheets._spreadsheet.hyperformula.getCellValueFormat(this.simpleCellAddress)!
        const currencySymbols = this._sheets._spreadsheet.hyperformula.getConfig().currencySymbol

        if (currencySymbols.every(symbol => textFormatPattern?.charAt(0) !== symbol)) {
          text = currencySymbol + text
        }
      }

      this.text.text(text.toString())
    } else {
      this.text.hide()
    }
  }

  private _setCellTextHeight() {
    const height = this._sheets.rows.getSize(this.simpleCellAddress.row)

    if (this.text.wrap() === 'none') {
      this.text.height(height)
    } else {
      // @ts-ignore
      this.text.height('auto')
    }
  }

  private _updateStyles() {
    const { cellValue, metadata } = this._sheets._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(this.simpleCellAddress)

    const {
      textWrap,
      fontSize,
      borders,
      backgroundColor,
      fontColor,
      bold,
      italic,
      strikeThrough,
      underline,
      horizontalTextAlign,
      verticalTextAlign,
      textFormatPattern,
      comment,
    } = metadata ?? {}

    this._setCellTextValue(cellValue, textFormatPattern)
    this._setCellCommentMarker(comment)
    this._setBackgroundColor(backgroundColor)
    this._setTextWrap(textWrap)
    this._setFontSize(fontSize)
    this._setFontColor(fontColor)
    this._setBold(bold, italic)
    this._setItalic(italic, bold)
    this._setStrikeThrough(strikeThrough, underline)
    this._setUnderline(underline, strikeThrough)
    this._setHorizontalTextAlign(horizontalTextAlign)
    this._setVerticalTextAlign(verticalTextAlign)
    this._setCellTextHeight()
    this._setLeftBorder(borders)
    this._setTopBorder(borders)
    this._setRightBorder(borders)
    this._setBottomBorder(borders)

    let cellType

    // TODO: Add logic to not throw in hyperformula if a cell is missing
    try {
      cellType = this._sheets._spreadsheet.hyperformula.getCellValueDetailedType(
        this.simpleCellAddress
      )
    } catch (error) {}

    this._setCellErrorMarker(CellValueDetailedType.ERROR === cellType)

    const stickyGroup = this.getStickyGroupCellBelongsTo()

    if (!this.group.parent) {
      this._sheets.scrollGroups[stickyGroup].cellGroup.add(this.group)
    }

    if (!this.bordersGroup.parent) {
      this._sheets.scrollGroups[stickyGroup].cellBorders.add(this.bordersGroup)
    }
  }

  override _destroy() {
    super._destroy()

    this.bordersGroup.destroy()
  }
}

export default StyleableCell
