import { Line } from 'konva/lib/shapes/Line';
import { Text } from 'konva/lib/shapes/Text';
import Sheet from '../../Sheet';
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
import RowColAddress from './RowColAddress';
import { CellValue } from 'hyperformula';
import { Group } from 'konva/lib/Group';

class StyleableCell extends Cell {
  text: Text;
  commentMarker: Line;
  borders: Record<BorderStyle, Line>;

  constructor(
    public sheet: Sheet,
    public simpleCellAddress: SimpleCellAddress,
    public group: Group
  ) {
    super(sheet, simpleCellAddress, group);

    this.text = group.findOne('.cellText');
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

  setBottomBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderBottom;

    border.y(clientRect.height);
    border.points([0, 0, clientRect.width, 0]);
    border.show();
  }

  setRightBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderRight;

    border.x(clientRect.width);
    border.points([0, 0, 0, clientRect.height]);
    border.show();
  }

  setTopBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderTop;

    border.points([0, 0, clientRect.width, 0]);
    border.show();
  }

  setLeftBorder() {
    const clientRect = this.getClientRectWithoutStroke();
    const border = this.borders.borderLeft;

    border.points([0, 0, 0, clientRect.height]);
    border.show();
  }

  setTextWrap(textWrap: TextWrap) {
    this.text.wrap(textWrap);
  }

  setBackgroundColor(backgroundColor: string) {
    this.rect.fill(backgroundColor);
  }

  setFontColor(fontColor: string) {
    this.text.fill(fontColor);
  }

  setFontSize(fontSize: number) {
    this.text.fontSize(fontSize);
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
    this.text.align(horizontalTextAlign);
  }

  setVerticalTextAlign(verticalTextAlign: VerticalTextAlign) {
    this.text.verticalAlign(verticalTextAlign);
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

    this.commentMarker.x(clientRect.width - 1);
    this.commentMarker.y(this.commentMarker.height() + 1);

    this.commentMarker.show();
  }

  setCellTextHeight() {
    const { height } = this.getClientRectWithoutStroke();

    if (this.text.wrap() !== 'wrap') {
      this.text.height(height);
    }
  }

  setCellTextValue(value: string) {
    const { width } = this.getClientRectWithoutStroke();

    this.text.text(value);
    // Only set the width for text wrapping to work
    this.text.width(width);
    this.text.show();
  }

  updateStyles() {
    const cell =
      this.spreadsheet.data.spreadsheetData.cells?.[
        this.simpleCellAddress.toCellId()
      ];

    const stickyGroup = this.getStickyGroupCellBelongsTo();

    this.sheet.scrollGroups[stickyGroup].cellGroup.add(this.group);

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

    // if (!this.spreadsheet.merger.getIsCellPartOfMerge(this.simpleCellAddress)) {
    //   const height = this.sheet.rows.getSize(this.simpleCellAddress.row);
    //   const cellHeight = this.getClientRectWithoutStroke().height;

    //   if (cellHeight > height) {
    //     this.spreadsheet.data.setRowCol(
    //       'rows',
    //       new RowColAddress(this.sheet.sheetId, this.simpleCellAddress.row),
    //       {
    //         size: cellHeight,
    //       }
    //     );

    //     this.spreadsheet.updateViewport();
    //   }
    // }
    this.setCellTextHeight();
  }
}

export default StyleableCell;
