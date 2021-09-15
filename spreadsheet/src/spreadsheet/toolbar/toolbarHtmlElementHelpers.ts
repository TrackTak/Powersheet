import { ACPController, createPicker } from 'a-color-picker';
import { sentenceCase } from 'sentence-case';
import { createIcon, createIconButton } from '../htmlElementHelpers';
import { prefix } from '../utils';
import styles from './Toolbar.module.scss';

export const toolbarPrefix = `${prefix}-toolbar`;

export type ColorPickerIconName = 'backgroundColor' | 'color';

export type BorderIconFirstRowsName =
  | 'borderAll'
  | 'borderInside'
  | 'borderHorizontal'
  | 'borderVertical'
  | 'borderOutside';

export type BorderIconSecondRowsName =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
  | 'borderNone';

export type BorderIconName = BorderIconFirstRowsName | BorderIconSecondRowsName;

export type HorizontalTextAlignName =
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight';

export type VerticalTextAlignName = 'alignTop' | 'alignMiddle' | 'alignBottom';

export type InnerDropdownIconName =
  | BorderIconName
  | HorizontalTextAlignName
  | VerticalTextAlignName;

export type DropdownIconName =
  | ColorPickerIconName
  | 'functions'
  | 'verticalTextAlign'
  | 'horizontalTextAlign'
  | 'borders';

export const borderTypes: [
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName
] = [
  'borderLeft',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderVertical',
  'borderHorizontal',
];

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
  'horizontalTextAlign',
  'verticalTextAlign',
  'textWrap',
  'functions',
  'freeze',
  'ellipsis',
  'borders',
  'export',
  'formula',
];

export type IconElementsName =
  | DropdownIconName
  | InnerDropdownIconName
  | typeof toggleIconNames[number];

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

export const createToolbarIconButton = (name: IconElementsName) =>
  createIconButton(name, toolbarPrefix);

export const createBordersContent = () => {
  const dropdownContent = createDropdownContent(styles.borders);

  const firstBordersRow = {
    borderAll: createToolbarIconButton('borderAll'),
    borderInside: createToolbarIconButton('borderInside'),
    borderHorizontal: createToolbarIconButton('borderHorizontal'),
    borderVertical: createToolbarIconButton('borderVertical'),
    borderOutside: createToolbarIconButton('borderOutside'),
  };

  const secondBordersRow = {
    borderLeft: createToolbarIconButton('borderLeft'),
    borderTop: createToolbarIconButton('borderTop'),
    borderRight: createToolbarIconButton('borderRight'),
    borderBottom: createToolbarIconButton('borderBottom'),
    borderNone: createToolbarIconButton('borderNone'),
  };

  const borderGroups: [HTMLDivElement, HTMLDivElement] = [
    document.createElement('div'),
    document.createElement('div'),
  ];

  Object.values(firstBordersRow).forEach((border) => {
    borderGroups[0].appendChild(border.buttonContainer);
  });

  Object.values(secondBordersRow).forEach((border) => {
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

export const createVerticalTextAlignContent = () => {
  const dropdownContent = createDropdownContent();

  const aligns = {
    alignTop: createToolbarIconButton('alignTop'),
    alignMiddle: createToolbarIconButton('alignMiddle'),
    alignBottom: createToolbarIconButton('alignBottom'),
  };

  Object.values(aligns).forEach((align) => {
    dropdownContent.appendChild(align.buttonContainer);
  });

  return { dropdownContent, aligns };
};

export const createHorizontalTextAlignContent = () => {
  const dropdownContent = createDropdownContent();

  const aligns = {
    alignLeft: createToolbarIconButton('alignLeft'),
    alignCenter: createToolbarIconButton('alignCenter'),
    alignRight: createToolbarIconButton('alignRight'),
  };

  Object.values(aligns).forEach((align) => {
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
  const iconButtonValues = createToolbarIconButton(name);
  const tooltip = createTooltip(name);

  iconButtonValues.button.classList.add(
    styles.dropdownIconButton,
    `${toolbarPrefix}-dropdown-icon-button`
  );

  let arrowIconValues;

  if (createArrow) {
    const iconValues = createIcon('arrowDown', toolbarPrefix);
    arrowIconValues = {
      arrowIcon: iconValues.icon,
      arrowIconContainer: iconValues.iconContainer,
    };

    iconButtonValues.button.appendChild(arrowIconValues.arrowIconContainer);
  }

  iconButtonValues.button.appendChild(tooltip);

  return { iconButtonValues, arrowIconValues, tooltip };
};

export const createDropdown = () => {
  const dropdown = document.createElement('div');

  dropdown.classList.add(styles.dropdown, `${toolbarPrefix}-dropdown`);

  return dropdown;
};
