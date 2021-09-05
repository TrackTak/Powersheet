import { ACPController, createPicker } from 'a-color-picker';
import { sentenceCase } from 'sentence-case';
import { prefix } from '../utils';
import styles from './Toolbar.module.scss';

export const toolbarPrefix = `${prefix}-toolbar`;

export type ColorPickerIconName = 'backgroundColor' | 'color';

export type BorderIconName =
  | 'borderAll'
  | 'borderInside'
  | 'borderHorizontal'
  | 'borderVertical'
  | 'borderOutside'
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
  | 'borderNone';

export type HorizontalAlignName = 'alignLeft' | 'alignCenter' | 'alignRight';

export type VerticalAlignName = 'alignTop' | 'alignMiddle' | 'alignBottom';

export type InnerDropdownIconName =
  | BorderIconName
  | HorizontalAlignName
  | VerticalAlignName;

export type DropdownIconName =
  | ColorPickerIconName
  | 'function'
  | 'alignMiddle'
  | 'alignLeft'
  | 'borderAll';

export const toggleIconNames = <const>[
  'undo',
  'redo',
  'fontBold',
  'fontItalic',
  'underline',
  'strike',
  'color',
  'backgroundColor',
  'merge',
  'alignLeft',
  'alignMiddle',
  'textWrap',
  'function',
  'freeze',
  'ellipsis',
  'borderAll',
  'export',
  'formula',
];

export type IconElementsName =
  | DropdownIconName
  | InnerDropdownIconName
  | typeof toggleIconNames[number];

type CreateIconButtonReturnType = ReturnType<typeof createIconButton>;

export const createTooltip = (name: string) => {
  const tooltip = document.createElement('span');

  tooltip.dataset.tippyContent = sentenceCase(name);
  tooltip.classList.add(styles.tooltip, `${toolbarPrefix}-tooltip`);

  return tooltip;
};

export const createDropdownContent = (className?: string) => {
  const dropdownContent = document.createElement('div');

  dropdownContent.classList.add(
    styles.dropdownContent,
    `${toolbarPrefix}-dropdown-content`
  );

  if (className) {
    dropdownContent.classList.add(className);
  }

  return dropdownContent;
};

export const createColorPickerContent = () => {
  const dropdownContent = createDropdownContent();

  const colorPicker = document.createElement('div');

  colorPicker.classList.add(
    styles.colorPicker,
    `${toolbarPrefix}-color-picker`
  );

  const picker = createPicker(colorPicker, {
    palette: 'PALETTE_MATERIAL_CHROME',
    paletteEditable: true,
    showAlpha: true,
  });

  dropdownContent.appendChild(colorPicker);

  return { dropdownContent, colorPicker, picker };
};

export const createColorBar = (picker: ACPController) => {
  const colorBar = document.createElement('span');

  colorBar.classList.add(styles.colorBar, `${toolbarPrefix}-color-bar`);

  picker.on('change', (_, color) => {
    if (color) {
      colorBar.style.backgroundColor = color;
    }
  });

  return colorBar;
};

export const createBordersContent = () => {
  const dropdownContent = createDropdownContent(styles.borders);

  const firstBordersRow: [
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType
  ] = [
    createIconButton('borderAll'),
    createIconButton('borderInside'),
    createIconButton('borderHorizontal'),
    createIconButton('borderVertical'),
    createIconButton('borderOutside'),
  ];

  const secondBordersRow: [
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType
  ] = [
    createIconButton('borderLeft'),
    createIconButton('borderTop'),
    createIconButton('borderRight'),
    createIconButton('borderBottom'),
    createIconButton('borderNone'),
  ];

  const borderGroups: [HTMLDivElement, HTMLDivElement] = [
    document.createElement('div'),
    document.createElement('div'),
  ];

  firstBordersRow.forEach((border) => {
    borderGroups[0].appendChild(border.buttonContainer);
  });

  secondBordersRow.forEach((border) => {
    borderGroups[1].appendChild(border.buttonContainer);
  });

  borderGroups.forEach((borderGroup) => {
    borderGroup.classList.add(
      styles.bordersGroup,
      `${toolbarPrefix}-borders-group`
    );

    dropdownContent.appendChild(borderGroup);
  });

  return { dropdownContent, borderGroups, firstBordersRow, secondBordersRow };
};

export const createVerticalAlignContent = () => {
  const dropdownContent = createDropdownContent();

  const aligns: [
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType
  ] = [
    createIconButton('alignTop'),
    createIconButton('alignMiddle'),
    createIconButton('alignBottom'),
  ];

  aligns.forEach((align) => {
    dropdownContent.appendChild(align.buttonContainer);
  });

  return { dropdownContent, aligns };
};

export const createHorizontalAlignContent = () => {
  const dropdownContent = createDropdownContent();

  const aligns: [
    CreateIconButtonReturnType,
    CreateIconButtonReturnType,
    CreateIconButtonReturnType
  ] = [
    createIconButton('alignLeft'),
    createIconButton('alignCenter'),
    createIconButton('alignRight'),
  ];

  aligns.forEach((align) => {
    dropdownContent.appendChild(align.buttonContainer);
  });

  return { dropdownContent, aligns };
};

export const createFunctionDropdownContent = (
  registeredFunctionNames: string[]
) => {
  const dropdownContent = createDropdownContent(styles.functions);

  const registeredFunctionButtons = registeredFunctionNames.map(
    (functionName) => {
      const button = document.createElement('button');

      button.classList.add(
        styles.functionName,
        `${toolbarPrefix}-${functionName}`
      );

      button.textContent = functionName;

      dropdownContent.appendChild(button);

      return button;
    }
  );

  return { dropdownContent, registeredFunctionButtons };
};

export const createDropdownIconButton = (
  name: DropdownIconName,
  createArrow: boolean = false
) => {
  const iconButtonValues = createIconButton(name);

  iconButtonValues.button.classList.add(
    styles.dropdownIconButton,
    `${toolbarPrefix}-dropdown-icon-button`
  );

  let arrowIconValues;

  if (createArrow) {
    const iconValues = createIcon('arrowDown');
    arrowIconValues = {
      arrowIcon: iconValues.icon,
      arrowIconContainer: iconValues.iconContainer,
    };

    iconButtonValues.button.appendChild(arrowIconValues.arrowIconContainer);
  }

  iconButtonValues.button.appendChild(createTooltip(name));

  return { iconButtonValues, arrowIconValues };
};

export const createDropdown = () => {
  const dropdown = document.createElement('div');

  dropdown.classList.add(styles.dropdown, `${toolbarPrefix}-dropdown`);

  return dropdown;
};

export const createIconButton = (name: IconElementsName) => {
  const buttonContainer = document.createElement('div');
  const button = document.createElement('button');

  buttonContainer.classList.add(`${toolbarPrefix}-${name}-button-container`);

  button.dataset.name = name;

  button.classList.add(
    styles.iconButton,
    `${toolbarPrefix}-icon-button`,
    `${toolbarPrefix}-${name}-button`
  );

  const iconValues = createIcon(name);

  button.appendChild(iconValues.iconContainer);
  buttonContainer.appendChild(button);

  return { buttonContainer, button, ...iconValues };
};

export const createIcon = (name: string) => {
  const iconContainer = document.createElement('span');
  const icon = document.createElement('div');

  iconContainer.classList.add(
    styles.iconContainer,
    styles[`${name}IconContainer`],
    `${toolbarPrefix}-icon-container`,
    `${toolbarPrefix}-${name}-icon-container`
  );

  icon.classList.add(
    styles.icon,
    styles[name],
    `${toolbarPrefix}-icon`,
    `${toolbarPrefix}-${name}`
  );

  iconContainer.appendChild(icon);

  return { icon, iconContainer };
};
