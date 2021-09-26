import { CellId } from '../sheet/CellRenderer';
import Spreadsheet from '../Spreadsheet';
import { prefix } from './../utils';
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

    const { editorArea, editableContentContainer, editableContent } =
      createFormulaEditorArea();

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
    const sheet = this.spreadsheet.getActiveSheet();
    const target = e.target as HTMLDivElement;
    const textContent = target.firstChild?.textContent;

    if (sheet?.cellEditor.getIsHidden()) {
      sheet.cellEditor.show(sheet.selector.selectedFirstCell!, false);
    }
    sheet?.cellEditor.setTextContent(textContent ?? null);
  };

  updateValue(cellId: CellId) {
    const sheet = this.spreadsheet.getActiveSheet();
    const cell = sheet?.cellRenderer.getCellData(cellId);
    const cellEditorTextContent =
      sheet?.cellEditor?.cellEditorEl.textContent ?? null;

    this.setTextContent(cell?.value ?? cellEditorTextContent);
  }

  setTextContent(textContent: string | null) {
    this.editableContent.textContent = textContent;
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();

    const sheet = this.spreadsheet.getActiveSheet();

    switch (e.key) {
      case 'Escape': {
        sheet?.cellEditor.hide();
        this.editableContent.blur();
        break;
      }
      case 'Enter': {
        sheet?.cellEditor.hideAndSave();
        this.editableContent.blur();

        break;
      }
    }
  };

  destroy() {
    this.editableContent.removeEventListener('input', this.onInput);
    this.editableContent.removeEventListener('keydown', this.onKeyDown);
  }
}

export default FormulaBar;
