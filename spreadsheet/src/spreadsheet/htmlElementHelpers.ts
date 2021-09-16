import {
  ColorPickerIconName,
  IconElementsName,
} from './toolbar/toolbarHtmlElementHelpers';
import styles from './HtmlElementHelpers.module.scss';
import {
  AddSheetIcon,
  SelectSheetsIcon,
} from './bottomBar/bottomBarHtmlElementHelpers';
import { sentenceCase } from 'sentence-case';

export interface IActionElements {
  buttonContainer: HTMLDivElement;
  button: HTMLButtonElement;
  tooltip?: HTMLSpanElement;
  active?: boolean;
}

export interface IButtonElements extends IActionElements {
  text: HTMLSpanElement;
}

export interface IIconElements extends IActionElements {
  iconContainer: HTMLSpanElement;
  icon: HTMLElement;
}

export type DropdownButtonName = 'fontSize' | 'textFormatPattern';

export type DropdownName = DropdownIconName | DropdownButtonName;

export type DropdownIconName =
  | ColorPickerIconName
  | 'functions'
  | 'verticalTextAlign'
  | 'horizontalTextAlign'
  | 'borders';

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

export const createTooltip = (name: string, classNamePrefix: string) => {
  const tooltip = document.createElement('span');

  tooltip.dataset.tippyContent = sentenceCase(name);
  tooltip.classList.add(styles.tooltip, `${classNamePrefix}-tooltip`);

  return tooltip;
};

export const createDropdownContent = (
  classNamePrefix: string,
  className?: string
) => {
  const dropdownContent = document.createElement('div');

  dropdownContent.classList.add(
    styles.dropdownContent,
    `${classNamePrefix}-dropdown-content`
  );

  if (className) {
    dropdownContent.classList.add(className);
  }

  return dropdownContent;
};

const createDropdownActionElement = (
  name: DropdownName,
  element: HTMLElement,
  classNamePrefix: string,
  createArrow: boolean = false
) => {
  const tooltip = createTooltip(name, classNamePrefix);

  let arrowIconValues;

  if (createArrow) {
    const iconValues = createIcon('arrowDown', classNamePrefix);
    arrowIconValues = {
      arrowIcon: iconValues.icon,
      arrowIconContainer: iconValues.iconContainer,
    };

    element.appendChild(arrowIconValues.arrowIconContainer);
  }

  element.appendChild(tooltip);

  return { arrowIconValues, tooltip };
};

export const createDropdownButton = (
  name: DropdownButtonName,
  classNamePrefix: string,
  createArrow: boolean = false
) => {
  const buttonContainer = createButtonContainer(classNamePrefix);
  const button = document.createElement('button');
  const text = document.createElement('span');

  button.dataset.name = name;

  button.classList.add(
    styles.dropdownButton,
    `${classNamePrefix}-dropdown-button`
  );

  text.classList.add(styles.text, `${classNamePrefix}-text`);

  button.appendChild(text);

  const { arrowIconValues, tooltip } = createDropdownActionElement(
    name,
    button,
    classNamePrefix,
    createArrow
  );

  buttonContainer.append(button);

  return { buttonContainer, button, text, arrowIconValues, tooltip };
};

export const createDropdownIconButton = (
  name: DropdownIconName,
  classNamePrefix: string,
  createArrow: boolean = false
) => {
  const iconButtonValues = createIconButton(name, classNamePrefix);

  iconButtonValues.button.classList.add(
    styles.dropdownIconButton,
    `${classNamePrefix}-dropdown-button`,
    `${classNamePrefix}-dropdown-icon-button`
  );

  const { arrowIconValues, tooltip } = createDropdownActionElement(
    name,
    iconButtonValues.button,
    classNamePrefix,
    createArrow
  );

  return { iconButtonValues, arrowIconValues, tooltip };
};

export const createDropdown = (classNamePrefix: string) => {
  const dropdown = document.createElement('div');

  dropdown.classList.add(styles.dropdown, `${classNamePrefix}-dropdown`);

  return dropdown;
};

export const createButtonContainer = (classNamePrefix: string) => {
  const buttonContainer = document.createElement('div');

  buttonContainer.classList.add(`${classNamePrefix}-button-container`);

  return buttonContainer;
};

export const createIconButton = (
  name: IconElementsName | SelectSheetsIcon | AddSheetIcon,
  classNamePrefix: string
) => {
  const buttonContainer = createButtonContainer(classNamePrefix);
  const button = document.createElement('button');

  button.dataset.name = name;

  button.classList.add(styles.iconButton, `${classNamePrefix}-icon-button`);

  const iconValues = createIcon(name, classNamePrefix);

  button.appendChild(iconValues.iconContainer);
  buttonContainer.appendChild(button);

  return { buttonContainer, button, ...iconValues };
};

export const createIcon = (name: string, classNamePrefix: string) => {
  const iconContainer = document.createElement('span');
  const icon = document.createElement('span');

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
