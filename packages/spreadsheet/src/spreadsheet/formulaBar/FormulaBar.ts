import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress';
import Spreadsheet from '../Spreadsheet';
import { prefix } from '../utils';
import styles from './FormulaBar.module.scss';
import { createFormulaEditorArea } from './formulaBarHtmlElementHelpers';

export const formulaBarPrefix = `${prefix}-formula-bar`;

class FormulaBar {
  formulaBarEl!: HTMLDivElement;
  editorArea!: HTMLDivElement;
  editableContentContainer!: HTMLDivElement;
  editableContent!: HTMLDivElement;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.formulaBarEl = document.createElement('div');
    this.formulaBarEl.classList.add(styles.formulaBar, formulaBarPrefix);

    const {
      editorArea,
      editableContentContainer,
      editableContent,
    } = createFormulaEditorArea();

    this.formulaBarEl.appendChild(editorArea);

    editableContentContainer.addEventListener('click', () => {
      editableContent.contentEditable = 'true';
      editableContent.focus();
    });

    this.editorArea = editorArea;
    this.editableContentContainer = editableContentContainer;
    this.editableContent = editableContent;

    this.editableContent.addEventListener('input', this.onInput);
    this.editableContent.addEventListener('keydown', this.onKeyDown);
  }

  onInput = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const textContent = target.firstChild?.textContent;

    if (this.spreadsheet.sheets.cellEditor.getIsHidden()) {
      this.spreadsheet.sheets.cellEditor.show(
        this.spreadsheet.sheets.selector.selectedCell!
      );
    }
    this.spreadsheet.sheets.cellEditor.setTextContent(textContent ?? null);
  };

  updateValue(simpleCellAddress: SimpleCellAddress | undefined) {
    let value;

    if (simpleCellAddress) {
      const sheetName =
        this.spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ??
        '';

      if (this.spreadsheet.hyperformula.doesSheetExist(sheetName)) {
        const serializedValue = this.spreadsheet.hyperformula.getCellSerialized(
          simpleCellAddress
        );

        value = serializedValue?.toString();
      }
    }

    // const cellEditorChildren =
    //   this.spreadsheet.sheets?.cellEditor?.cellEditorEl.children ?? null;

    // if (cellEditorChildren) {
    //   this.editableContent.append(...(cellEditorChildren as any));
    // }

    //  this.setTextContent(value ?? cellEditorTextContent);
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        this.spreadsheet.sheets.cellEditor.hide();
        this.editableContent.blur();
        break;
      }
      case 'Enter': {
        this.spreadsheet.sheets.cellEditor.hideAndSave();
        this.editableContent.blur();

        break;
      }
    }
  };

  destroy() {
    this.formulaBarEl.remove();
    this.editableContent.removeEventListener('input', this.onInput);
    this.editableContent.removeEventListener('keydown', this.onKeyDown);
  }
}

export default FormulaBar;
