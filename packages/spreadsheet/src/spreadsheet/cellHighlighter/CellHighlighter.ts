// @ts-ignore
import { CellReference, EqualsOp } from 'hyperformula/es/parser/LexerConfig';
import { prefix } from '../utils';
import HighlightedCell from '../sheets/cells/cell/HighlightedCell';
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress';
import Spreadsheet from '../Spreadsheet';

export interface ICellReferencePart {
  startOffset: number;
  endOffset: number;
  referenceText: string;
  color: string;
}

class CellHighlighter {
  highlightedCells: HighlightedCell[] = [];

  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
  }

  destroy() {
    this.destroyHighlightedCells();
  }

  destroyHighlightedCells() {
    this.highlightedCells.forEach((cell) => cell.destroy());
  }

  getHighlightedCellReferenceSections(text: string) {
    if (!text) {
      return {
        tokenParts: [],
        cellReferenceParts: [],
      };
    }

    const goldenRatio = 0.618033988749895;
    let hue = 34 / 360;

    const getSyntaxColor = () => {
      const color = `hsl(${Math.floor(hue * 360)}, 90%, 50%)`;

      hue += goldenRatio;
      hue %= 1;

      return color;
    };

    // TODO: Remove all this when https://github.com/handsontable/hyperformula/issues/854 is done
    // @ts-ignore
    const lexer = this.spreadsheet.hyperformula._parser.lexer;

    const { tokens } = lexer.tokenizeFormula(text);

    const cellReferenceParts: ICellReferencePart[] = [];
    const tokenParts = [];

    for (const [index, token] of tokens.entries()) {
      if (index === 0 && token.tokenType.name !== EqualsOp.name) {
        break;
      }

      if (token.tokenType.name === CellReference.name) {
        const color = getSyntaxColor();

        cellReferenceParts.push({
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          referenceText: token.image,
          color,
        });
      }
    }

    const setNonReferenceSlicedSpan = (start: number, end?: number) => {
      const slicedString = text.slice(start, end);
      const span = document.createElement('span');

      if (!slicedString.length) return;

      span.classList.add(`${prefix}-token`);

      span.textContent = slicedString;

      tokenParts.push(span);
    };

    if (cellReferenceParts.length && text.length) {
      let prevIndex = 0;

      cellReferenceParts.forEach(
        ({ startOffset, endOffset, referenceText, color }) => {
          setNonReferenceSlicedSpan(prevIndex, startOffset);

          const formulaTokenSpan = document.createElement('span');

          formulaTokenSpan.textContent = referenceText;
          formulaTokenSpan.classList.add(`${prefix}-formula-token`);
          formulaTokenSpan.style.color = color;

          tokenParts.push(formulaTokenSpan);

          prevIndex = endOffset + 1;
        }
      );

      setNonReferenceSlicedSpan(
        cellReferenceParts[cellReferenceParts.length - 1].endOffset + 1
      );
    } else {
      const span = document.createElement('span');

      span.classList.add(`${prefix}-token`);

      span.textContent = text;

      tokenParts.push(span);
    }

    return {
      tokenParts,
      cellReferenceParts,
    };
  }

  highlightCellReferences(
    simpleCellAddress: SimpleCellAddress,
    cellReferenceParts: ICellReferencePart[]
  ) {
    this.destroyHighlightedCells();

    cellReferenceParts.forEach(({ referenceText, color }) => {
      const precedentSimpleCellAddress =
        this.spreadsheet.hyperformula.simpleCellAddressFromString(
          referenceText,
          simpleCellAddress.sheet
        )!;

      if (simpleCellAddress.sheet === precedentSimpleCellAddress.sheet) {
        const highlightedCell = new HighlightedCell(
          this.spreadsheet.sheets,
          new SimpleCellAddress(
            precedentSimpleCellAddress.sheet,
            precedentSimpleCellAddress.row,
            precedentSimpleCellAddress.col
          ),
          color
        );

        const stickyGroup = highlightedCell.getStickyGroupCellBelongsTo();
        const sheetGroup =
          this.spreadsheet.sheets.scrollGroups[stickyGroup].sheetGroup;

        sheetGroup.add(highlightedCell.group);

        this.highlightedCells.push(highlightedCell);
      }
    });
  }
}

export default CellHighlighter;
