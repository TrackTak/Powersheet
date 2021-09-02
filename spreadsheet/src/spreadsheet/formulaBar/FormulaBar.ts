import { prefix } from './../utils';
import styles from './FormulaBar.module.scss';
import { createFormulaEditorArea } from './htmlElementHelpers';

export const formulaBarPrefix = `${prefix}-formula-bar`;

class FormulaBar {
  formulaBarEl: HTMLDivElement;
  editorArea: HTMLDivElement;
  textareaContainer: HTMLDivElement;
  textarea: HTMLDivElement;

  constructor() {
    this.formulaBarEl = document.createElement('div');
    this.formulaBarEl.classList.add(styles.formulaBar, formulaBarPrefix);

    const { editorArea, textareaContainer, textarea } =
      this.setFormulaEditorArea();

    this.editorArea = editorArea;
    this.textareaContainer = textareaContainer;
    this.textarea = textarea;
  }

  setFormulaEditorArea() {
    const { editorArea, textareaContainer, textarea } =
      createFormulaEditorArea();

    this.formulaBarEl.appendChild(editorArea);

    textareaContainer.addEventListener('click', () => {
      textarea.contentEditable = 'true';
      textarea.focus();
    });

    return { editorArea, textareaContainer, textarea };
  }
}

export default FormulaBar;
