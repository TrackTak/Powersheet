import styles from './FormulaHelper.module.scss';
import { prefix } from './../utils';

export const formulaHelperPrefix = `${prefix}-formula-helper`;

export const createFormulaEditorArea = () => {
  const editorArea = document.createElement('div');
  const editableContentContainer = document.createElement('div');
  const iconContainer = document.createElement('div');
  const icon = document.createElement('div');
  const editableContent = document.createElement('div');

  editorArea.classList.add(
    styles.editorArea,
    `${formulaHelperPrefix}-editor-area`
  );

  editableContentContainer.classList.add(
    styles.editableContentContainer,
    `${formulaHelperPrefix}-editable-content-container`
  );

  iconContainer.classList.add(
    styles.iconContainer,
    `${formulaHelperPrefix}-icon-container`
  );

  icon.classList.add(
    styles.icon,
    styles.formula,
    `${formulaHelperPrefix}-icon`,
    `${formulaHelperPrefix}-formula`
  );

  editableContent.classList.add(
    styles.editableContent,
    `${formulaHelperPrefix}-editable-content`
  );

  editorArea.appendChild(editableContentContainer);
  editableContentContainer.appendChild(iconContainer);
  editableContentContainer.appendChild(editableContent);
  iconContainer.appendChild(icon);

  return { editorArea, editableContentContainer, editableContent };
};
