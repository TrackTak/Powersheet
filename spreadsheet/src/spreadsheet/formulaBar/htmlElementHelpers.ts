import styles from './FormulaBar.module.scss';
import { prefix } from './../utils';

export const formulaBarPrefix = `${prefix}-formula-bar`;

export const createFormulaEditorArea = () => {
  const editorArea = document.createElement('div');
  const textareaContainer = document.createElement('div');
  const iconContainer = document.createElement('div');
  const icon = document.createElement('div');
  const textarea = document.createElement('div');

  editorArea.classList.add(
    styles.editorArea,
    `${formulaBarPrefix}-editor-area`
  );

  textareaContainer.classList.add(
    styles.textareaContainer,
    `${formulaBarPrefix}-textarea-container`
  );

  iconContainer.classList.add(
    styles.iconContainer,
    `${formulaBarPrefix}-icon-container`
  );

  icon.classList.add(
    styles.icon,
    styles.formula,
    `${formulaBarPrefix}-icon`,
    `${formulaBarPrefix}-formula`
  );

  textarea.classList.add(styles.textarea, `${formulaBarPrefix}-textarea`);

  editorArea.appendChild(textareaContainer);
  textareaContainer.appendChild(iconContainer);
  textareaContainer.appendChild(textarea);
  iconContainer.appendChild(icon);

  return { editorArea, textareaContainer, textarea };
};
