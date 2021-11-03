import { IRect } from 'konva/lib/types';
import Sheet from '../Sheets';
import styles from './CellEditor.module.scss';
import { DelegateInstance, delegate } from 'tippy.js';
import FormulaHelper from '../../formulaHelper/FormulaHelper';
import Spreadsheet from '../../Spreadsheet';
import Cell from '../cells/cell/Cell';
import { prefix, saveCaretPosition, setCaretToEndOfElement } from '../../utils';
import { HyperFormula } from 'hyperformula';
import { isPercent } from 'numfmt';
import { ICellData } from '../Data';
import SimpleCellAddress from '../cells/cell/SimpleCellAddress';
import CellHighlighter from '../../cellHighlighter/CellHighlighter';

export interface ICurrentScroll {
  row: number;
  col: number;
}

class CellEditor {
  cellEditorContainerEl: HTMLDivElement;
  cellEditorEl: HTMLDivElement;
  cellTooltip: DelegateInstance;
  formulaHelper?: FormulaHelper;
  spreadsheet: Spreadsheet;
  cellHighlighter: CellHighlighter;
  currentCell: Cell | null = null;
  currentScroll: ICurrentScroll | null = null;
  currentCaretPosition: number | null = null;
  currentCellText: string | null = null;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.spreadsheet = this.sheet.spreadsheet;

    this.cellHighlighter = new CellHighlighter(this.spreadsheet);

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
        .getCellSerialized(simpleCellAddress)
        ?.toString() ?? undefined;

    this.spreadsheet.pushToHistory(() => {
      const value = this.currentCellText ? this.currentCellText : undefined;

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
    this.cellHighlighter.destroy();
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

    this.setContentEditable(value);
    this.cellEditorEl.focus();
    this.formulaHelper?.hide();
  };

  setContentEditable(value: string | null) {
    this.clear();
    this.spreadsheet.formulaBar?.clear();

    this.currentCellText = value;

    const { tokenParts, cellReferenceParts } =
      this.cellHighlighter.getHighlightedCellReferenceSections(
        this.currentCellText ?? ''
      );

    this.cellHighlighter.highlightCellReferences(
      this.currentCell!.simpleCellAddress,
      cellReferenceParts
    );

    tokenParts.forEach((part) => {
      this.cellEditorEl.appendChild(part);
      this.spreadsheet.formulaBar?.editableContent.appendChild(
        part.cloneNode(true)
      );
    });

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

    const restoreCaretPosition = saveCaretPosition(this.cellEditorEl);

    this.setContentEditable(textContent ?? null);

    restoreCaretPosition();

    const isFormulaInput = textContent?.startsWith('=');

    if (isFormulaInput) {
      this.formulaHelper?.show(textContent?.slice(1));
    } else {
      this.formulaHelper?.hide();
    }
  };

  showAndSetValue(cell: Cell) {
    this.show(cell);
    this.setCellValue(cell.simpleCellAddress);

    setCaretToEndOfElement(this.cellEditorEl);
  }

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

    this.setContentEditable(serializedValue?.toString() ?? null);

    this.cellEditorEl.focus();
  }

  clear() {
    this.currentCellText = null;
    this.cellEditorEl.textContent = null;
    this.cellHighlighter.destroyHighlightedCells();
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
