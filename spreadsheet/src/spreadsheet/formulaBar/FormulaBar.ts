import { CellId } from '../sheetsGroup/sheet/CellRenderer';
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
  private spreadsheet!: Spreadsheet;

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
    const target = e.target as HTMLDivElement;
    const textContent = target.firstChild?.textContent;

    if (this.spreadsheet.cellEditor.getIsHidden()) {
      this.spreadsheet.cellEditor.show(
        this.spreadsheet.selector.selectedFirstCell!,
        false
      );
    }
    this.spreadsheet.cellEditor.setTextContent(textContent ?? null);
  };

  updateValue(cellId: CellId) {
    const sheet = this.spreadsheet.focusedSheet;
    const cell = sheet?.cellRenderer.getCellData(cellId);
    const cellEditorTextContent =
      this.spreadsheet.cellEditor.cellEditorEl.textContent ?? null;

    this.setTextContent(cell?.value ?? cellEditorTextContent);
  }

  setTextContent(textContent: string | null) {
    this.editableContent.textContent = textContent;
  }

  onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape': {
        this.spreadsheet.cellEditor.hide();
        this.editableContent.blur();
        break;
      }
      case 'Enter': {
        this.spreadsheet.cellEditor.saveContentToCell();
        this.spreadsheet.cellEditor.hide();
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
