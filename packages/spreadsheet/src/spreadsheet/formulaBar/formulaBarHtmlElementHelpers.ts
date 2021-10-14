import styles from './FormulaBar.module.scss';
import { prefix } from '../utils';
import { createIcon } from '../htmlElementHelpers';

export const formulaBarPrefix = `${prefix}-formula-bar`;

export const createFormulaEditorArea = () => {
  const editorArea = document.createElement('div');
  const editableContentContainer = document.createElement('div');
  const { iconContainer, icon } = createIcon('formula', formulaBarPrefix);
  const editableContent = document.createElement('div');

  iconContainer.classList.add(styles.iconContainer);

  editorArea.classList.add(`${formulaBarPrefix}-editor-area`);

  editableContentContainer.classList.add(
    styles.editableContentContainer,
    `${formulaBarPrefix}-editable-content-container`
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
