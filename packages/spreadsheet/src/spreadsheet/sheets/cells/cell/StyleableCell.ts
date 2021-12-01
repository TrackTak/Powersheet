import { Line } from 'konva/lib/shapes/Line'
import { Text } from 'konva/lib/shapes/Text'
import Sheets from '../../Sheets'
import FontStyle from './FontStyle'
import TextDecoration from './TextDecoration'
import { format } from 'numfmt'
import Cell from './Cell'
import SimpleCellAddress from './SimpleCellAddress'
import {
  BorderStyle,
  HorizontalTextAlign,
  TextWrap,
  VerticalTextAlign
} from '../../Data'
import { CellValue, CellValueType, DetailedCellError } from '@tracktak/hyperformula'
import { Group } from 'konva/lib/Group'
import { isNil } from 'lodash'

/**
 * @internal
 */
class StyleableCell extends Cell {
  text: Text
  commentMarker: Line
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

  private _setBottomBorder(borders?: BorderStyle[]) {
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

  private _setRightBorder(borders?: BorderStyle[]) {
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

  private _setTopBorder(borders?: BorderStyle[]) {
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

  private _setLeftBorder(borders?: BorderStyle[]) {
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

  private _setTextWrap(textWrap?: TextWrap) {
    this.text.wrap(textWrap ?? this._sheets._spreadsheet.styles.cell.text.wrap!)
  }

  private _setBackgroundColor(backgroundColor?: string) {
    this.rect.fill(
      backgroundColor ?? this._sheets._spreadsheet.styles.cell.rect.fill!
    )
  }

  private _setFontColor(fontColor?: string) {
    this.text.fill(fontColor ?? this._sheets._spreadsheet.styles.cell.text.fill!)
  }

  private _setFontSize(fontSize?: number) {
    this.text.fontSize(
      fontSize ?? this._sheets._spreadsheet.styles.cell.text.fontSize!
    )
  }

  private _setBold(bold?: boolean) {
    const italic =
      this._sheets._spreadsheet.data._spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.italic ?? false
    const fontStyle = new FontStyle(this.text, bold ?? false, italic)

    fontStyle.setStyle()
  }

  private _setItalic(italic?: boolean) {
    const bold =
      this._sheets._spreadsheet.data._spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.bold ?? false
    const fontStyle = new FontStyle(this.text, bold, italic ?? false)

    fontStyle.setStyle()
  }

  private _setStrikeThrough(strikeThrough?: boolean) {
    const underline =
      this._sheets._spreadsheet.data._spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.underline ?? false
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough ?? false,
      underline
    )

    textDecoration.setStyle()
  }

  private _setUnderline(underline?: boolean) {
    const strikeThrough =
      this._sheets._spreadsheet.data._spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.strikeThrough ?? false
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough,
      underline ?? false
    )

    textDecoration.setStyle()
  }

  private _setHorizontalTextAlign(horizontalTextAlign?: HorizontalTextAlign) {
    this.text.align(
      horizontalTextAlign ?? this._sheets._spreadsheet.styles.cell.text.align!
    )
  }

  private _setVerticalTextAlign(verticalTextAlign?: VerticalTextAlign) {
    this.text.verticalAlign(
      verticalTextAlign ??
        this._sheets._spreadsheet.styles.cell.text.verticalAlign!
    )
  }

  private _setCellCommentMarker(comment?: string) {
    if (comment) {
      const width = this.rect.width()

      this.commentMarker.x(width - 1)
      this.commentMarker.y(this.commentMarker.height() + 1)

      this.commentMarker.show()
    } else {
      this.commentMarker.hide()
    }
  }

  private _setCellTextValue(cellValue?: string, textFormatPattern?: string) {
    let value: CellValue | undefined =
      this._sheets._spreadsheet.hyperformula.getCellValue(this.simpleCellAddress)

    if (this._sheets._spreadsheet.data._spreadsheetData.showFormulas) {
      value = cellValue
    }

    if (!isNil(value)) {
      const width = this.rect.width()

      let text = value

      const cellType = this._sheets._spreadsheet.hyperformula.getCellValueType(
        this.simpleCellAddress
      )

      if (cellType === CellValueType.ERROR) {
        value = (value as DetailedCellError).value
      }  else if (
        textFormatPattern &&
        cellType !== CellValueType.STRING &&
        cellType !== CellValueType.BOOLEAN &&
        !this._sheets._spreadsheet.data._spreadsheetData.showFormulas
      ) {
        try {
          text = format(textFormatPattern, Number(text))
        } catch (e) {
          text = e as string
        }

        try {
          text = format(textFormatPattern, text)
        } catch (e) {
          text = e as string
        }
      }

      this.text.text(text.toString())
      // Only set the width for text wrapping to work
      this.text.width(width)
      this.text.show()
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
    const cellId = this.simpleCellAddress.toCellId()
    const cell = this._sheets._spreadsheet.data._spreadsheetData.cells?.[cellId]

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
      value
    } = cell ?? {}

    this._setCellTextValue(value, textFormatPattern)
    this._setCellCommentMarker(comment)
    this._setBackgroundColor(backgroundColor)
    this._setTextWrap(textWrap)
    this._setFontSize(fontSize)
    this._setFontColor(fontColor)
    this._setBold(bold)
    this._setItalic(italic)
    this._setStrikeThrough(strikeThrough)
    this._setUnderline(underline)
    this._setHorizontalTextAlign(horizontalTextAlign)
    this._setVerticalTextAlign(verticalTextAlign)
    this._setCellTextHeight()
    this._setLeftBorder(borders)
    this._setTopBorder(borders)
    this._setRightBorder(borders)
    this._setBottomBorder(borders)

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
