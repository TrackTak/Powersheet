import { rightClickMenuPrefix } from './RightClickMenu';
import styles from './RightClickMenu.module.scss';

export type ButtonName =
  | 'comment'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'insertRow'
  | 'insertColumn'
  | 'deleteRow'
  | 'deleteColumn';

export const createButtonContent = (name: string, className: string) => {
  const button = document.createElement('button');

  button.textContent = name;

  button.classList.add(
    styles.buttonContent,
    styles[className],
    `${rightClickMenuPrefix}-${className}`,
    `${rightClickMenuPrefix}-button-content`
  );

  return button;
};
