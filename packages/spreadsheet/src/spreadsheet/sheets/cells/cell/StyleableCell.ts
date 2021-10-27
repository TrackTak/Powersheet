import { Line } from 'konva/lib/shapes/Line';
import { Text } from 'konva/lib/shapes/Text';
import Sheets from '../../Sheets';
import FontStyle from './FontStyle';
import TextDecoration from './TextDecoration';
import { format } from 'numfmt';
import Cell from './Cell';
import SimpleCellAddress from './SimpleCellAddress';
import {
  BorderStyle,
  HorizontalTextAlign,
  TextWrap,
  VerticalTextAlign,
} from '../../Data';
import { CellValue } from 'hyperformula';
import { Group } from 'konva/lib/Group';

class StyleableCell extends Cell {
  text: Text;
  commentMarker: Line;
  borders: Record<BorderStyle, Line>;

  constructor(
    public sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public group: Group
  ) {
    super(sheets, simpleCellAddress, group);

    this.text = group.findOne('.text');
    this.commentMarker = group.findOne<Line>('.commentMarker');

    const borders = group.find<Line>('.borderLine');

    this.borders = {
      borderLeft: borders[0],
      borderRight: borders[1],
      borderBottom: borders[2],
      borderTop: borders[3],
    };

    this.updateStyles();
  }

  setBottomBorder(borders?: BorderStyle[]) {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderBottom;

    if (borders?.includes('borderBottom')) {
      border.y(clientRect.height);
      border.points([0, 0, clientRect.width, 0]);
      border.show();
    } else {
      border.hide();
    }
  }

  setRightBorder(borders?: BorderStyle[]) {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderRight;

    if (borders?.includes('borderRight')) {
      border.x(clientRect.width);
      border.points([0, 0, 0, clientRect.height]);
      border.show();
    } else {
      border.hide();
    }
  }

  setTopBorder(borders?: BorderStyle[]) {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderTop;

    if (borders?.includes('borderTop')) {
      border.points([0, 0, clientRect.width, 0]);
      border.show();
    } else {
      border.hide();
    }
  }

  setLeftBorder(borders?: BorderStyle[]) {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderLeft;

    if (borders?.includes('borderLeft')) {
      border.points([0, 0, 0, clientRect.height]);
      border.show();
    } else {
      border.hide();
    }
  }

  setTextWrap(textWrap?: TextWrap) {
    if (textWrap) {
      this.text.wrap(textWrap);
    }
  }

  setBackgroundColor(backgroundColor?: string) {
    if (backgroundColor) {
      this.rect.fill(backgroundColor);
    }
  }

  setFontColor(fontColor?: string) {
    if (fontColor) {
      this.text.fill(fontColor);
    }
  }

  setFontSize(fontSize?: number) {
    if (fontSize) {
      this.text.fontSize(fontSize);
    }
  }

  setBold(bold?: boolean) {
    if (bold) {
      const italic =
        this.spreadsheet.data.spreadsheetData.cells?.[
          this.simpleCellAddress.toCellId()
        ]?.italic ?? false;
      const fontStyle = new FontStyle(this.text, bold, italic);

      fontStyle.setStyle();
    }
  }

  setItalic(italic?: boolean) {
    if (italic) {
      const bold =
        this.spreadsheet.data.spreadsheetData.cells?.[
          this.simpleCellAddress.toCellId()
        ]?.bold ?? false;
      const fontStyle = new FontStyle(this.text, bold, italic);

      fontStyle.setStyle();
    }
  }

  setStrikeThrough(strikeThrough?: boolean) {
    if (strikeThrough) {
      const underline =
        this.spreadsheet.data.spreadsheetData.cells?.[
          this.simpleCellAddress.toCellId()
        ]?.underline ?? false;
      const textDecoration = new TextDecoration(
        this.text,
        strikeThrough,
        underline
      );

      textDecoration.setStyle();
    }
  }

  setUnderline(underline?: boolean) {
    if (underline) {
      const strikeThrough =
        this.spreadsheet.data.spreadsheetData.cells?.[
          this.simpleCellAddress.toCellId()
        ]?.strikeThrough ?? false;
      const textDecoration = new TextDecoration(
        this.text,
        strikeThrough,
        underline
      );

      textDecoration.setStyle();
    }
  }

  setHorizontalTextAlign(horizontalTextAlign?: HorizontalTextAlign) {
    if (horizontalTextAlign) {
      this.text.align(horizontalTextAlign);
    }
  }

  setVerticalTextAlign(verticalTextAlign?: VerticalTextAlign) {
    if (verticalTextAlign) {
      this.text.verticalAlign(verticalTextAlign);
    }
  }

  setCellCommentMarker(comment?: string) {
    if (comment) {
      const clientRect = this.getClientRectWithoutStroke();

      this.commentMarker.x(clientRect.width - 1);
      this.commentMarker.y(this.commentMarker.height() + 1);

      this.commentMarker.show();
    } else {
      this.commentMarker.hide();
    }
  }

  setCellTextValue(value?: CellValue, textFormatPattern?: string) {
    const { width } = this.getClientRectWithoutStroke();
    let text = value;

    if (
      textFormatPattern &&
      !this.spreadsheet.data.spreadsheetData.showFormulas
    ) {
      try {
        text = format(textFormatPattern, Number(text));
      } catch (e) {
        text = e as string;
      }

      try {
        text = format(textFormatPattern, text);
      } catch (e) {
        text = e as string;
      }
    }

    if (text) {
      this.text.text(text.toString());
      // Only set the width for text wrapping to work
      this.text.width(width);
      this.text.show();
    } else {
      this.text.hide();
    }
  }

  setCellTextHeight() {
    const height = this.sheets.rows.getSize(this.simpleCellAddress.row);

    if (this.text.wrap() === 'none') {
      this.text.height(height);
    } else {
      // @ts-ignore
      this.text.height('auto');
    }
  }

  updateStyles() {
    const cellId = this.simpleCellAddress.toCellId();
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];

    const stickyGroup = this.getStickyGroupCellBelongsTo();

    this.sheets.scrollGroups[stickyGroup].cellGroup.add(this.group);

    let value: CellValue | undefined =
      this.spreadsheet.hyperformula.getCellValue(this.simpleCellAddress);

    if (this.spreadsheet.data.spreadsheetData.showFormulas) {
      value = cell?.value;
    }

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
    } = cell ?? {};

    this.setCellCommentMarker(comment);
    this.setTextWrap(textWrap);
    this.setFontSize(fontSize);
    this.setBackgroundColor(backgroundColor);
    this.setFontColor(fontColor);
    this.setBold(bold);
    this.setItalic(italic);
    this.setStrikeThrough(strikeThrough);
    this.setUnderline(underline);
    this.setHorizontalTextAlign(horizontalTextAlign);
    this.setVerticalTextAlign(verticalTextAlign);
    this.setCellTextValue(value, textFormatPattern);
    this.setCellTextHeight();
    this.setLeftBorder(borders);
    this.setTopBorder(borders);
    this.setRightBorder(borders);
    this.setBottomBorder(borders);
  }
}

export default StyleableCell;
