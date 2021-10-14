import styles from './Comment.module.scss';
import { prefix } from '../../utils';

export const commentPrefix = `${prefix}-comment`;

export const createContent = () => {
  const content = document.createElement('div');

  content.classList.add(styles.content, `${commentPrefix}-content`);

  return content;
};

export const createTextarea = () => {
  const textarea = document.createElement('textarea');
  textarea.classList.add(styles.textarea, `${commentPrefix}-textarea`);

  return textarea;
};

export const createButtonContainer = () => {
  const buttonContainer = document.createElement('div');

  buttonContainer.classList.add(
    styles.buttonContainer,
    `${commentPrefix}-button-container`
  );

  return buttonContainer;
};

export const createSuccessButton = () => {
  const successButton = document.createElement('button');
  successButton.innerText = 'Comment';

  successButton.classList.add(
    styles.successButton,
    `${commentPrefix}-success-button`
  );

  return successButton;
};

export const createCancelButton = () => {
  const cancelButton = document.createElement('button');
  cancelButton.innerText = 'Cancel';

  cancelButton.classList.add(
    styles.cancelButton,
    `${commentPrefix}-cancel-button`
  );

  return cancelButton;
};
