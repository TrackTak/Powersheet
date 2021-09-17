import { CellId } from '../sheetsGroup/sheet/CellRenderer';
import Spreadsheet from '../Spreadsheet';
import { prefix } from './../utils';
import styles from './FormulaBar.module.scss';
import { createFormulaEditorArea } from './formulaBarHtmlElementHelpers';

export const formulaBarPrefix = `${prefix}-formula-bar`;

class FormulaBar {
  formulaBarEl: HTMLDivElement;
  editorArea: HTMLDivElement;
  editableContentContainer: HTMLDivElement;
  editableContent: HTMLDivElement;

  constructor(private spreadsheet: Spreadsheet) {
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

    this.spreadsheet.spreadsheetEl.appendChild(this.formulaBarEl);
  }

  updateValue(cellId: CellId) {
    const sheet = this.spreadsheet.focusedSheet;
    const cell = sheet?.cellRenderer.getCellData(cellId);

    this.setTextContent(cell?.value ?? '');
  }

  setTextContent(textContent: string) {
    this.editableContent.textContent = textContent;
  }
}

export default FormulaBar;
