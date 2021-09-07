import styles from './FormulaBar.module.scss';
import { prefix } from '../utils';

export const formulaBarPrefix = `${prefix}-formula-bar`;

export const createFormulaEditorArea = () => {
  const editorArea = document.createElement('div');
  const editableContentContainer = document.createElement('div');
  const iconContainer = document.createElement('div');
  const icon = document.createElement('div');
  const editableContent = document.createElement('div');

  editorArea.classList.add(
    styles.editorArea,
    `${formulaBarPrefix}-editor-area`
  );

  editableContentContainer.classList.add(
    styles.editableContentContainer,
    `${formulaBarPrefix}-editable-content-container`
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

  editableContent.classList.add(
    styles.editableContent,
    `${formulaBarPrefix}-editable-content`
  );

  editorArea.appendChild(editableContentContainer);
  editableContentContainer.appendChild(iconContainer);
  editableContentContainer.appendChild(editableContent);
  iconContainer.appendChild(icon);

  return { editorArea, editableContentContainer, editableContent };
};
