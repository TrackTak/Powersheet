import { IconElementsName } from './toolbar/toolbarHtmlElementHelpers';
import styles from './HtmlElementHelpers.module.scss';
import {
  AddSheetIcon,
  SelectSheetsIcon,
} from './bottomBar/bottomBarHtmlElementHelpers';

export interface IIconElements {
  buttonContainer: HTMLDivElement;
  button: HTMLButtonElement;
  active?: boolean;
  iconContainer: HTMLSpanElement;
  icon: HTMLElement;
  tooltip?: HTMLSpanElement;
}

export const createGroup = (
  elements: HTMLElement[],
  className: string,
  classNamePrefix: string
) => {
  const group = document.createElement('div');

  group.classList.add(className, `${classNamePrefix}-group`);

  elements.forEach((element) => {
    group.appendChild(element);
  });

  return group;
};

export const createIconButton = (
  name: IconElementsName | SelectSheetsIcon | AddSheetIcon,
  classNamePrefix: string
) => {
  const buttonContainer = document.createElement('div');
  const button = document.createElement('button');

  buttonContainer.classList.add(`${classNamePrefix}-${name}-button-container`);

  button.dataset.name = name;

  button.classList.add(
    styles.iconButton,
    `${classNamePrefix}-icon-button`,
    `${classNamePrefix}-${name}-button`
  );

  const iconValues = createIcon(name, classNamePrefix);

  button.appendChild(iconValues.iconContainer);
  buttonContainer.appendChild(button);

  return { buttonContainer, button, ...iconValues };
};

export const createIcon = (name: string, classNamePrefix: string) => {
  const iconContainer = document.createElement('span');
  const icon = document.createElement('div');

  iconContainer.classList.add(
    styles.iconContainer,
    styles[`${name}IconContainer`],
    `${classNamePrefix}-icon-container`,
    `${classNamePrefix}-${name}-icon-container`
  );

  icon.classList.add(
    styles.icon,
    styles[name],
    `${classNamePrefix}-icon`,
    `${classNamePrefix}-${name}`
  );

  iconContainer.appendChild(icon);

  return { icon, iconContainer };
};
