import events from '../events';
import Sheet from '../sheetsGroup/sheet/Sheet';
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
  focusedSheet: Sheet | null;

  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.formulaBarEl = document.createElement('div');
    this.formulaBarEl.classList.add(styles.formulaBar, formulaBarPrefix);
    this.focusedSheet = null;

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

    this.spreadsheet.eventEmitter.on(
      events.cellEditor.change,
      this.onCellEditorChange
    );
  }

  onCellEditorChange = (textContent: string | null) => {
    this.editableContent.textContent = textContent;
  };
}

export default FormulaBar;
