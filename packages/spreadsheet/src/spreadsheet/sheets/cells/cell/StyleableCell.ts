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
import { CellValue, DetailedCellError } from 'hyperformula'
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
    protected sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public group: Group,
    public bordersGroup: Group
  ) {
    super(sheets, simpleCellAddress, group)

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

    this.updateStyles()
  }

  private setBottomBorder(borders?: BorderStyle[]) {
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

  private setRightBorder(borders?: BorderStyle[]) {
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

  private setTopBorder(borders?: BorderStyle[]) {
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

  private setLeftBorder(borders?: BorderStyle[]) {
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

  private setTextWrap(textWrap?: TextWrap) {
    this.text.wrap(textWrap ?? this.sheets.spreadsheet.styles.cell.text.wrap!)
  }

  private setBackgroundColor(backgroundColor?: string) {
    this.rect.fill(
      backgroundColor ?? this.sheets.spreadsheet.styles.cell.rect.fill!
    )
  }

  private setFontColor(fontColor?: string) {
    this.text.fill(fontColor ?? this.sheets.spreadsheet.styles.cell.text.fill!)
  }

  private setFontSize(fontSize?: number) {
    this.text.fontSize(
      fontSize ?? this.sheets.spreadsheet.styles.cell.text.fontSize!
    )
  }

  private setBold(bold?: boolean) {
    const italic =
      this.sheets.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.italic ?? false
    const fontStyle = new FontStyle(this.text, bold ?? false, italic)

    fontStyle.setStyle()
  }

  private setItalic(italic?: boolean) {
    const bold =
      this.sheets.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.bold ?? false
    const fontStyle = new FontStyle(this.text, bold, italic ?? false)

    fontStyle.setStyle()
  }

  private setStrikeThrough(strikeThrough?: boolean) {
    const underline =
      this.sheets.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.underline ?? false
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough ?? false,
      underline
    )

    textDecoration.setStyle()
  }

  private setUnderline(underline?: boolean) {
    const strikeThrough =
      this.sheets.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.strikeThrough ?? false
    const textDecoration = new TextDecoration(
      this.text,
      strikeThrough,
      underline ?? false
    )

    textDecoration.setStyle()
  }

  private setHorizontalTextAlign(horizontalTextAlign?: HorizontalTextAlign) {
    this.text.align(
      horizontalTextAlign ?? this.sheets.spreadsheet.styles.cell.text.align!
    )
  }

  private setVerticalTextAlign(verticalTextAlign?: VerticalTextAlign) {
    this.text.verticalAlign(
      verticalTextAlign ??
        this.sheets.spreadsheet.styles.cell.text.verticalAlign!
    )
  }

  private setCellCommentMarker(comment?: string) {
    if (comment) {
      const width = this.rect.width()

      this.commentMarker.x(width - 1)
      this.commentMarker.y(this.commentMarker.height() + 1)

      this.commentMarker.show()
    } else {
      this.commentMarker.hide()
    }
  }

  private setCellTextValue(cellValue?: string, textFormatPattern?: string) {
    let value: CellValue | undefined =
      this.sheets.spreadsheet.hyperformula.getCellValue(this.simpleCellAddress)

    if (this.sheets.spreadsheet.data.spreadsheetData.showFormulas) {
      value = cellValue
    }

    if (!isNil(value)) {
      const width = this.rect.width()

      let text = value

      const cellType = this.sheets.spreadsheet.hyperformula.getCellValueType(
        this.simpleCellAddress
      )

      if (cellType === 'ERROR') {
        value = (value as DetailedCellError).value
      } else if (
        textFormatPattern &&
        !this.sheets.spreadsheet.data.spreadsheetData.showFormulas
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

  private setCellTextHeight() {
    const height = this.sheets.rows.getSize(this.simpleCellAddress.row)

    if (this.text.wrap() === 'none') {
      this.text.height(height)
    } else {
      // @ts-ignore
      this.text.height('auto')
    }
  }

  private updateStyles() {
    const cellId = this.simpleCellAddress.toCellId()
    const cell = this.sheets.spreadsheet.data.spreadsheetData.cells?.[cellId]

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

    this.setCellTextValue(value, textFormatPattern)
    this.setCellCommentMarker(comment)
    this.setBackgroundColor(backgroundColor)
    this.setTextWrap(textWrap)
    this.setFontSize(fontSize)
    this.setFontColor(fontColor)
    this.setBold(bold)
    this.setItalic(italic)
    this.setStrikeThrough(strikeThrough)
    this.setUnderline(underline)
    this.setHorizontalTextAlign(horizontalTextAlign)
    this.setVerticalTextAlign(verticalTextAlign)
    this.setCellTextHeight()
    this.setLeftBorder(borders)
    this.setTopBorder(borders)
    this.setRightBorder(borders)
    this.setBottomBorder(borders)

    const stickyGroup = this.getStickyGroupCellBelongsTo()

    if (!this.group.parent) {
      this.sheets.scrollGroups[stickyGroup].cellGroup.add(this.group)
    }

    if (!this.bordersGroup.parent) {
      this.sheets.scrollGroups[stickyGroup].cellBorders.add(this.bordersGroup)
    }
  }

  override destroy() {
    super.destroy()

    this.bordersGroup.destroy()
  }
}

export default StyleableCell
