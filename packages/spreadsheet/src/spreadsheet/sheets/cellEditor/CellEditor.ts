import { IRect } from 'konva/lib/types';
import Sheet from '../Sheets';
import styles from './CellEditor.module.scss';

import { DelegateInstance, delegate } from 'tippy.js';
import FormulaHelper from '../../formulaHelper/FormulaHelper';
import Spreadsheet from '../../Spreadsheet';
import Cell from '../cells/cell/Cell';
import { prefix, setCaretToEndOfElement } from '../../utils';
import { HyperFormula } from 'hyperformula';
// @ts-ignore
import { FormulaLexer } from 'hyperformula/es/parser/FormulaParser';
import { isPercent } from 'numfmt';
import { ICellData } from '../Data';
import SimpleCellAddress from '../cells/cell/SimpleCellAddress';
import { createToken } from 'chevrotain';
import type { ILexerConfig } from 'hyperformula/typings/parser/LexerConfig';

export interface ICurrentScroll {
  row: number;
  col: number;
}

export const AnyInputCharacter = createToken({
  name: '@@Powersheet_AnyInputCharacter',
  pattern: /./,
});

class CellEditor {
  cellEditorContainerEl: HTMLDivElement;
  cellEditorEl: HTMLDivElement;
  cellTooltip: DelegateInstance;
  formulaHelper?: FormulaHelper;
  spreadsheet: Spreadsheet;
  currentCell: Cell | null = null;
  currentScroll: ICurrentScroll | null = null;
  // formulaLexer: FormulaLexer;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;
    // debugger;
    // const f = AnyInputCharacter;
    // // @ts-ignore
    // const config = this.spreadsheet.hyperformula._parser.lexer.lexerConfig;
    // const lexerConfig: ILexerConfig = {
    //   ...config,
    //   allTokens: [...config.allTokens, AnyInputCharacter],
    // };
    // try {
    //   // TODO: We should re-instantiate whenever `buildEngine` gets called
    //   this.formulaLexer = new FormulaLexer(lexerConfig);
    // } catch (error) {}

    this.cellEditorEl = document.createElement('div');
    this.cellEditorEl.contentEditable = 'true';
    this.cellEditorEl.spellcheck = false;
    this.cellEditorEl.classList.add(`${prefix}-cell-editor`, styles.cellEditor);

    this.cellEditorContainerEl = document.createElement('div');
    this.cellEditorContainerEl.classList.add(
      `${prefix}-cell-editor-container`,
      styles.cellEditorContainer
    );
    this.cellEditorContainerEl.appendChild(this.cellEditorEl);
    this.cellTooltip = delegate(this.cellEditorEl, {
      target: styles.cellEditor,
      arrow: false,
      trigger: 'manual',
      hideOnClick: false,
      placement: 'top-start',
      theme: 'cell',
      offset: [0, 5],
    });
    this.sheet.sheetEl.appendChild(this.cellEditorContainerEl);

    this.cellEditorEl.addEventListener('input', this.onInput);
    this.cellEditorEl.addEventListener('keydown', this.onKeyDown);

    this.cellEditorContainerEl.style.display = 'none';

    this.formulaHelper = new FormulaHelper(
      HyperFormula.getRegisteredFunctionNames('enGB'),
      this.onItemClick
    );

    this.cellEditorContainerEl.appendChild(this.formulaHelper.formulaHelperEl);
  }

  saveContentToCell() {
    const simpleCellAddress = this.currentCell!.simpleCellAddress;
    const cell =
      this.spreadsheet.data.spreadsheetData.cells?.[
        simpleCellAddress.toCellId()
      ];
    const cellValue =
      this.spreadsheet.hyperformula
        .getCellValue(simpleCellAddress)
        ?.toString() ?? undefined;
    const textContent = this.cellEditorEl.textContent;

    this.spreadsheet.pushToHistory(() => {
      const value = textContent ? textContent : undefined;

      if (cellValue !== value) {
        const newCell: Omit<ICellData, 'id'> = {
          value,
        };

        if (isPercent(value)) {
          if (!isPercent(cell?.textFormatPattern)) {
            newCell.textFormatPattern = '0.00%';
          }
        } else if (!isPercent(value) && isPercent(cell?.textFormatPattern)) {
          newCell.value += '%';
        }

        this.spreadsheet.data.setCell(simpleCellAddress, newCell);
      }
    });
  }

  destroy() {
    this.cellTooltip.destroy();
    this.cellEditorContainerEl.remove();
    this.cellEditorEl.removeEventListener('input', this.onInput);
    this.cellEditorEl.removeEventListener('keydown', this.onKeyDown);
    this.formulaHelper?.destroy();
  }

  getIsHidden() {
    return this.cellEditorContainerEl.style.display === 'none';
  }

  onItemClick = (suggestion: string) => {
    const value = `=${suggestion}()`;

    this.setTextContent(value);
    this.cellEditorEl.focus();
    this.formulaHelper?.hide();
  };

  setTextContent(value: string | null) {
    const goldenRatio = 0.618033988749895;
    let hue = 34 / 360;

    const getSyntaxColor = () => {
      const color = `hsl(${Math.floor(hue * 360)}, 90%, 50%)`;

      hue += goldenRatio;
      hue %= 1;

      return color;
    };

    const text = value ?? '';

    // @ts-ignore
    // const lexer = this.spreadsheet.hyperformula._parser.lexer;
    debugger;
    const d = this.spreadsheet.hyperformula.validateFormula('=A2+A4+3A2');

    // const { tokens } = lexer.tokenizeFormula(value ?? '');

    // interface ISplitPart {
    //   startOffset: number;
    //   endOffset: number;
    //   referenceText: string;
    // }

    // const partsToSplit: ISplitPart[] = [];

    // tokens.forEach((token: any) => {
    //   if (token.tokenType.name === 'CellReference') {
    //     partsToSplit.push({
    //       startOffset: token.startOffset,
    //       endOffset: token.endOffset,
    //       referenceText: token.image,
    //     });
    //   }
    // });

    // const parts = [];

    // const setNonReferenceSlicedSpan = (start: number, end?: number) => {
    //   const slicedString = text.slice(start, end);
    //   const span = document.createElement('span');

    //   if (!slicedString.length) return;

    //   span.classList.add(`${prefix}-token`);

    //   span.textContent = slicedString;

    //   parts.push(span);
    // };

    // if (partsToSplit.length && text.length) {
    //   let prevIndex = 0;

    //   partsToSplit.forEach(({ startOffset, endOffset, referenceText }) => {
    //     setNonReferenceSlicedSpan(prevIndex, startOffset);

    //     const formulaTokenSpan = document.createElement('span');

    //     formulaTokenSpan.textContent = referenceText;
    //     formulaTokenSpan.classList.add(`${prefix}-formula-token`);
    //     formulaTokenSpan.style.color = getSyntaxColor();

    //     parts.push(formulaTokenSpan);

    //     prevIndex = endOffset + 1;
    //   });

    //   setNonReferenceSlicedSpan(
    //     partsToSplit[partsToSplit.length - 1].endOffset + 1
    //   );
    // } else {
    //   const span = document.createElement('span');

    //   span.classList.add(`${prefix}-token`);

    //   span.textContent = text;

    //   parts.push(span);
    // }

    // parts.forEach((part) => {
    //   this.cellEditorEl.appendChild(part);
    // });

    // this.cellEditorEl.appendChild(tokenElements);
    // this.spreadsheet.formulaBar?.editableContent.appendChild(tokenElements);

    setCaretToEndOfElement(this.cellEditorEl);

    this.spreadsheet.eventEmitter.emit('cellEditorChange', value);
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        this.hide();
        break;
      }
      case 'Enter': {
        this.hideAndSave();
        break;
      }
    }
  };

  onInput = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const textContent = target.textContent;

    target.textContent = null;

    this.setTextContent(textContent ?? null);

    const isFormulaInput = textContent?.startsWith('=');

    if (isFormulaInput) {
      this.formulaHelper?.show(textContent?.slice(1));
    } else {
      this.formulaHelper?.hide();
    }
  };

  show(cell: Cell) {
    this.currentCell = cell;
    this.currentScroll = {
      row: this.sheet.rows.scrollBar.scroll,
      col: this.sheet.cols.scrollBar.scroll,
    };

    this.clear();
    this.cellEditorContainerEl.style.display = 'block';

    this.setCellEditorElPosition(cell.group.getClientRect());
  }

  setCellValue(simpleCellAddress: SimpleCellAddress) {
    const serializedValue =
      this.spreadsheet.hyperformula.getCellSerialized(simpleCellAddress);

    this.setTextContent(serializedValue?.toString() ?? null);

    this.cellEditorEl.focus();
  }

  clear() {
    this.cellEditorEl.textContent = null;
  }

  hideAndSave() {
    if (!this.getIsHidden()) {
      this.saveContentToCell();
      this.hide();
    }
  }

  hide() {
    this.currentCell = null;
    this.currentScroll = null;
    this.cellTooltip.hide();

    this.cellEditorContainerEl.style.display = 'none';
    this.clear();

    this.spreadsheet.updateViewport();
  }

  setCellEditorElPosition = (position: IRect) => {
    this.cellEditorContainerEl.style.top = `${position.y}px`;
    this.cellEditorContainerEl.style.left = `${position.x}px`;
    this.cellEditorContainerEl.style.minWidth = `${position.width}px`;
    this.cellEditorContainerEl.style.height = `${position.height}px`;
  };

  hideCellTooltip = () => {
    this.cellTooltip.hide();
  };

  showCellTooltip = () => {
    if (this.currentCell) {
      const simpleCellAddress = this.currentCell.simpleCellAddress;

      this.cellTooltip.setContent(simpleCellAddress.addressToString());
      this.cellTooltip.show();
    }
  };
}

export default CellEditor;
