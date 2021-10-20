import { Line } from 'konva/lib/shapes/Line';
import { Text } from 'konva/lib/shapes/Text';
import Sheet from '../../Sheet';
import Border from './Border';
import FontStyle from './FontStyle';
import TextDecoration from './TextDecoration';
import { format } from 'numfmt';
import { rotateAroundCenter } from '../../../utils';
import Cell from './Cell';
import SimpleCellAddress from './SimpleCellAddress';
import {
  BorderStyle,
  HorizontalTextAlign,
  TextWrap,
  VerticalTextAlign,
} from '../../Data';
import RowColAddress from './RowColAddress';
import { CellValue } from 'hyperformula';
import { Group } from 'konva/lib/Group';

class StyleableCell extends Cell {
  text?: Text;
  borders = new Map<BorderStyle, Border>();

  constructor(
    public sheet: Sheet,
    public simpleCellAddress: SimpleCellAddress,
    public group: Group
  ) {
    super(sheet, simpleCellAddress, group);

    this.update();
  }

  private getBorder(type: BorderStyle) {
    const border = new Border(this, type);

    this.borders.set(type, border);

    return border;
  }

  setBottomBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.getBorder('borderBottom');

    border.line.y(clientRect.height);
    border.line.points([0, 0, clientRect.width, 0]);
  }

  setRightBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.getBorder('borderRight');

    border.line.x(clientRect.width);
    border.line.points([0, 0, 0, clientRect.height]);
  }

  setTopBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.getBorder('borderTop');

    border.line.points([0, 0, clientRect.width, 0]);
  }

  setLeftBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.getBorder('borderLeft');

    border.line.points([0, 0, 0, clientRect.height]);
  }

  setTextWrap(textWrap: TextWrap) {
    this.text?.wrap(textWrap);
  }

  setBackgroundColor(backgroundColor: string) {
    this.rect.fill(backgroundColor);
  }

  setFontColor(fontColor: string) {
    this.text?.fill(fontColor);
  }

  setFontSize(fontSize: number) {
    this.text?.fontSize(fontSize);
  }

  setBold(bold: boolean) {
    const italic =
      this.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.italic ?? false;
    const fontStyle = new FontStyle(this.text, bold, italic);

    fontStyle.setStyle();
  }

  setItalic(italic: boolean) {
    const bold =
      this.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ]?.bold ?? false;
    const fontStyle = new FontStyle(this.text, bold, italic);

    fontStyle.setStyle();
  }

  setStrikeThrough(strikeThrough: boolean) {
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

  setUnderline(underline: boolean) {
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

  setHorizontalTextAlign(horizontalTextAlign: HorizontalTextAlign) {
    this.text?.align(horizontalTextAlign);
  }

  setVerticalTextAlign(verticalTextAlign: VerticalTextAlign) {
    this.text?.verticalAlign(verticalTextAlign);
  }

  setTextFormat(textFormatPattern: string) {
    if (this.text && !this.spreadsheet.data.spreadsheetData.showFormulas) {
      let text = this.text.text();

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

      this.text.text(text);
    }
  }

  setCellCommentMarker() {
    const clientRect = this.getClientRectWithoutStroke();
    const commentMarker = new Line({
      ...this.spreadsheet.styles.commentMarker,
      x: clientRect.width,
    });

    this.group.add(commentMarker);

    rotateAroundCenter(commentMarker, 180);
  }

  setCellTextHeight() {
    const { height } = this.getClientRectWithoutStroke();

    if (this.text?.wrap() !== 'wrap') {
      this.text?.height(height);
    }
  }

  setCellTextValue(value: string) {
    const { width } = this.getClientRectWithoutStroke();

    this.text = new Text({
      ...this.spreadsheet.styles.cell.text,
      text: value,
      // Only set the width for text wrapping to work
      width,
    });

    this.group.add(this.text);
  }

  update() {
    const cell =
      this.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ];

    let value: CellValue | undefined =
      this.spreadsheet.hyperformula.getCellValue(this.simpleCellAddress);

    if (this.spreadsheet.data.spreadsheetData.showFormulas) {
      value = cell?.value;
    }

    if (value) {
      this.setCellTextValue(value?.toString());
    }

    if (cell?.comment) {
      this.setCellCommentMarker();
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
    } = cell ?? {};

    if (textWrap) {
      this.setTextWrap(textWrap);
    }

    if (fontSize) {
      this.setFontSize(fontSize);
    }

    if (backgroundColor) {
      this.setBackgroundColor(backgroundColor);
    }

    if (fontColor) {
      this.setFontColor(fontColor);
    }

    if (bold) {
      this.setBold(bold);
    }

    if (italic) {
      this.setItalic(italic);
    }

    if (strikeThrough) {
      this.setStrikeThrough(strikeThrough);
    }

    if (underline) {
      this.setUnderline(underline);
    }

    if (horizontalTextAlign) {
      this.setHorizontalTextAlign(horizontalTextAlign);
    }

    if (verticalTextAlign) {
      this.setVerticalTextAlign(verticalTextAlign);
    }

    if (textFormatPattern) {
      this.setTextFormat(textFormatPattern);
    }

    if (borders) {
      borders.forEach((borderType) => {
        switch (borderType) {
          case 'borderLeft':
            this.setLeftBorder();
            break;
          case 'borderTop':
            this.setTopBorder();
            break;
          case 'borderRight':
            this.setRightBorder();
            break;
          case 'borderBottom':
            this.setBottomBorder();
            break;
        }
      });
    }

    if (!this.sheet.merger.getIsCellPartOfMerge(this.simpleCellAddress)) {
      const height = this.sheet.rows.getSize(this.simpleCellAddress.row);
      const cellHeight = this.getClientRectWithoutStroke().height;

      if (cellHeight > height) {
        this.spreadsheet.data.setRowCol(
          'rows',
          new RowColAddress(this.sheet.sheetId, this.simpleCellAddress.row),
          {
            size: cellHeight,
          }
        );

        this.spreadsheet.updateViewport();
      }
    }
    this.setCellTextHeight();

    this.group.moveToTop();
  }
}

export default StyleableCell;
