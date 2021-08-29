import { prefix } from '../utils';
import { sentenceCase } from 'sentence-case';
import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { createPicker, ACPController } from 'a-color-picker';

export type IconElement = HTMLElement;

export interface ITopLevelIconMap {
  undo: IconElement;
  redo: IconElement;
  fontBold: IconElement;
  fontItalic: IconElement;
  underline: IconElement;
  strike: IconElement;
  color: IconElement;
  backgroundColor: IconElement;
  merge: IconElement;
  alignLeft: IconElement;
  alignMiddle: IconElement;
  textWrap: IconElement;
  function: IconElement;
  freeze: IconElement;
  ellipsis: IconElement;
  borderAll: IconElement;
  export: IconElement;
  formula: IconElement;
}

export interface IDropdownMap {
  function: HTMLElement;
  alignMiddle: HTMLElement;
  alignLeft: HTMLElement;
  borderAll: HTMLElement;
  backgroundColor: HTMLElement;
  color: HTMLElement;
}

export interface IToolbarActionGroups {
  elements: HTMLElement[];
}

const topLevelIconNames: (keyof ITopLevelIconMap)[] = [
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

export const toolbarPrefix = `${prefix}-toolbar`;

class Toolbar {
  toolbarEl: HTMLDivElement;
  topLevelIconMap: ITopLevelIconMap;
  dropdownMap: IDropdownMap;
  toolbarActionGroups: IToolbarActionGroups[];
  tooltip: DelegateInstance;
  dropdown: DelegateInstance;

  constructor(private registeredFunctionNames: string[]) {
    this.registeredFunctionNames = registeredFunctionNames;

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.topLevelIconMap = {} as ITopLevelIconMap;
    this.dropdownMap = {} as IDropdownMap;

    this.tooltip = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-tooltip`,
      touch: false,
    });

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-icon-button`,
      trigger: 'click',
      theme: 'dropdown',
      placement: 'auto',
      interactive: true,
      arrow: false,
      content: (e) => {
        const name = (e as HTMLButtonElement).dataset
          .name as keyof IDropdownMap;

        return this.dropdownMap[name];
      },
    });

    topLevelIconNames.forEach((name) => {
      switch (name) {
        case 'backgroundColor': {
          this.setDropdownColorPicker(name);
          break;
        }
        case 'color': {
          this.setDropdownColorPicker(name);
          break;
        }
        case 'borderAll': {
          this.setDropdownButtonContainer(name);

          this.dropdownMap[name] = this.createBordersContent();
          break;
        }
        case 'alignLeft': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownMap[name] = this.createHorizontalAlignContent();
          break;
        }
        case 'alignMiddle': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownMap[name] = this.createVerticalAlignContent();
          break;
        }
        case 'function': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownMap[name] = this.createFunctionDropdownContent(
            this.registeredFunctionNames
          );
          break;
        }
        default: {
          const { button, buttonContainer } = this.createIconButton(name);

          button.appendChild(this.createTooltip(name));

          this.topLevelIconMap[name] = buttonContainer;
          break;
        }
      }
    });

    const icons = this.topLevelIconMap;

    this.toolbarActionGroups = [
      {
        elements: [icons.redo, icons.undo],
      },
      {
        elements: [
          icons.fontBold,
          icons.fontItalic,
          icons.underline,
          icons.strike,
          icons.color,
        ],
      },
      {
        elements: [icons.backgroundColor, icons.borderAll, icons.merge],
      },
      {
        elements: [icons.alignLeft, icons.alignMiddle, icons.textWrap],
      },
      {
        elements: [icons.freeze, icons.function, icons.formula],
      },
      {
        elements: [icons.export],
      },
    ];

    this.toolbarActionGroups.forEach(({ elements }) => {
      const group = this.createGroup(elements);

      this.toolbarEl.appendChild(group);
    });
  }

  destroy() {
    this.toolbarEl.remove();
    this.tooltip.destroy();
  }

  setDropdownButtonContainer(
    name: keyof ITopLevelIconMap,
    createArrow?: boolean
  ) {
    const buttonContainer = this.createDropdownIconButton(name, createArrow);

    this.topLevelIconMap[name] = buttonContainer;
  }

  setDropdownColorPicker(name: keyof IDropdownMap) {
    this.setDropdownButtonContainer(name);

    const button = this.topLevelIconMap[name].querySelector(
      `.${toolbarPrefix}-dropdown-icon-button`
    )!;
    const { dropdownContent, picker } = this.createColorPickerContent();
    const colorBar = this.createColorBar(picker);

    button.appendChild(colorBar);

    this.dropdownMap[name] = dropdownContent;
  }

  createGroup(elements: HTMLElement[]) {
    const group = document.createElement('div');

    group.classList.add(styles.group, `${toolbarPrefix}-group`);

    elements.forEach((element) => {
      group.appendChild(element);
    });

    return group;
  }

  createTooltip(name: string) {
    const tooltip = document.createElement('span');

    tooltip.dataset.tippyContent = sentenceCase(name);
    tooltip.classList.add(styles.tooltip, `${toolbarPrefix}-tooltip`);

    return tooltip;
  }

  createDropdownContent(className?: string) {
    const dropdownContent = document.createElement('div');

    dropdownContent.classList.add(
      styles.dropdownContent,
      `${toolbarPrefix}-dropdown-content`
    );

    if (className) {
      dropdownContent.classList.add(className);
    }

    return dropdownContent;
  }

  createColorPickerContent() {
    const dropdownContent = this.createDropdownContent();

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

    return { dropdownContent, picker };
  }

  createColorBar(picker: ACPController) {
    const colorBar = document.createElement('span');

    colorBar.classList.add(styles.colorBar, `${toolbarPrefix}-color-bar`);

    picker.on('change', (_, color) => {
      if (color) {
        colorBar.style.backgroundColor = color;
      }
    });

    return colorBar;
  }

  createBordersContent() {
    const dropdownContent = this.createDropdownContent(styles.borders);

    const firstBordersRow = [
      this.createIconButton('borderAll'),
      this.createIconButton('borderInside'),
      this.createIconButton('borderHorizontal'),
      this.createIconButton('borderVertical'),
      this.createIconButton('borderOutside'),
    ];

    const secondBordersRow = [
      this.createIconButton('borderLeft'),
      this.createIconButton('borderTop'),
      this.createIconButton('borderRight'),
      this.createIconButton('borderBottom'),
      this.createIconButton('borderNone'),
    ];

    const borderGroups = [
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

    return dropdownContent;
  }

  createVerticalAlignContent() {
    const dropdownContent = this.createDropdownContent();

    const aligns = [
      this.createIconButton('alignTop'),
      this.createIconButton('alignMiddle'),
      this.createIconButton('alignBottom'),
    ];

    aligns.forEach((align) => {
      dropdownContent.appendChild(align.buttonContainer);
    });

    return dropdownContent;
  }

  createHorizontalAlignContent() {
    const dropdownContent = this.createDropdownContent();

    const aligns = [
      this.createIconButton('alignLeft'),
      this.createIconButton('alignCenter'),
      this.createIconButton('alignRight'),
    ];

    aligns.forEach((align) => {
      dropdownContent.appendChild(align.buttonContainer);
    });

    return dropdownContent;
  }

  createFunctionDropdownContent(registeredFunctionNames: string[]) {
    const dropdownContent = this.createDropdownContent(styles.functions);

    registeredFunctionNames.forEach((functionName) => {
      const button = document.createElement('button');

      button.classList.add(
        styles.functionName,
        `${toolbarPrefix}-${functionName}`
      );

      button.textContent = functionName;

      dropdownContent.appendChild(button);
    });

    return dropdownContent;
  }

  createDropdownIconButton(name: string, createArrow: boolean = false) {
    const { buttonContainer, button } = this.createIconButton(name);

    if (createArrow) {
      const iconContainer = this.createIcon('arrowDown');

      button.appendChild(iconContainer);
    }

    button.classList.add(
      styles.dropdownIconButton,
      `${toolbarPrefix}-dropdown-icon-button`
    );
    button.appendChild(this.createTooltip(name));

    return buttonContainer;
  }

  createDropdown() {
    const dropdown = document.createElement('div');

    dropdown.classList.add(styles.dropdown, `${toolbarPrefix}-dropdown`);

    return dropdown;
  }

  createIconButton(name: string) {
    const buttonContainer = document.createElement('div');
    const button = document.createElement('button');

    buttonContainer.classList.add(`${toolbarPrefix}-${name}-button-container`);

    button.dataset.name = name;

    button.classList.add(
      styles.iconButton,
      `${toolbarPrefix}-icon-button`,
      `${toolbarPrefix}-${name}-button`
    );

    const iconContainer = this.createIcon(name);

    button.appendChild(iconContainer);
    buttonContainer.appendChild(button);

    return { buttonContainer, button };
  }

  createIcon(name: string) {
    const iconContainer = document.createElement('span');
    const icon = document.createElement('i');

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

    return iconContainer;
  }
}

export default Toolbar;
