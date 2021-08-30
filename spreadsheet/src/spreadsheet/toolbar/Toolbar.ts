import { prefix } from '../utils';
import { sentenceCase } from 'sentence-case';
import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { createPicker, ACPController } from 'a-color-picker';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../options';
import events from '../events';
import Sheet, { Cell } from '../sheetsGroup/sheet/Sheet';
import { Rect } from 'konva/lib/shapes/Rect';

export type IconElement = HTMLElement;

export interface IToolbarActionGroups {
  elements: HTMLElement[];
}

interface IConstructor {
  registeredFunctionNames: string[];
  options: IOptions;
  eventEmitter: EventEmitter;
}

export type ColorPicker = 'backgroundColor' | 'color';

export const dropdownIconNames = <const>[
  'function',
  'alignMiddle',
  'alignLeft',
  'borderAll',
  'backgroundColor',
  'color',
];

export const topLevelIconNames = <const>[
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

type TopLevelIconKey = typeof topLevelIconNames[number];

type DropdownIconKey = typeof dropdownIconNames[number];

export const toolbarPrefix = `${prefix}-toolbar`;

class Toolbar {
  toolbarEl: HTMLDivElement;
  topLevelIconMap: Record<TopLevelIconKey, IconElement>;
  dropdownIconMap: Record<DropdownIconKey, HTMLElement>;
  colorBarMap: Record<ColorPicker, HTMLSpanElement>;
  toolbarActionGroups: IToolbarActionGroups[];
  tooltip: DelegateInstance;
  dropdown: DelegateInstance;
  registeredFunctionNames: string[];
  options: IOptions;
  eventEmitter: EventEmitter;

  constructor(params: IConstructor) {
    this.registeredFunctionNames = params.registeredFunctionNames;
    this.options = params.options;
    this.eventEmitter = params.eventEmitter;

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.topLevelIconMap = {} as Record<TopLevelIconKey, IconElement>;
    this.dropdownIconMap = {} as Record<DropdownIconKey, HTMLElement>;
    this.colorBarMap = {} as Record<ColorPicker, HTMLSpanElement>;

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
        const name = (e as HTMLButtonElement).dataset.name as DropdownIconKey;

        return this.dropdownIconMap[name];
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

          this.dropdownIconMap[name] = this.createBordersContent();
          break;
        }
        case 'alignLeft': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownIconMap[name] = this.createHorizontalAlignContent();
          break;
        }
        case 'alignMiddle': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownIconMap[name] = this.createVerticalAlignContent();
          break;
        }
        case 'function': {
          this.setDropdownButtonContainer(name, true);

          this.dropdownIconMap[name] = this.createFunctionDropdownContent(
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

    this.eventEmitter.on(events.selector.startSelection, this.onStartSelection);
  }

  onStartSelection = (sheet: Sheet, selectedCell: Cell) => {
    const selectedCellId = selectedCell.id();

    if (sheet.cellsMap.has(selectedCellId)) {
      const cell = sheet.cellsMap.get(selectedCellId)!;
      const cellRect = cell.children?.find(
        (x) => x.attrs.type === 'cellRect'
      ) as Rect;

      this.colorBarMap.backgroundColor.style.backgroundColor = cellRect.fill();
    } else {
      this.colorBarMap.backgroundColor.style.backgroundColor = 'white';
    }
  };

  destroy() {
    this.eventEmitter.off(events.selector.startSelection);

    this.toolbarEl.remove();
    this.tooltip.destroy();
  }

  setDropdownButtonContainer(name: TopLevelIconKey, createArrow?: boolean) {
    const buttonContainer = this.createDropdownIconButton(name, createArrow);

    this.topLevelIconMap[name] = buttonContainer;
  }

  setDropdownColorPicker(name: ColorPicker) {
    this.setDropdownButtonContainer(name);

    const button = this.topLevelIconMap[name].querySelector(
      `.${toolbarPrefix}-dropdown-icon-button`
    )!;
    const { dropdownContent, picker } = this.createColorPickerContent();

    this.colorBarMap[name] = this.createColorBar(picker);

    picker.on('change', (_, color) => {
      this.eventEmitter.emit(events.toolbar.change, name, color);
    });

    button.appendChild(this.colorBarMap[name]);

    this.dropdownIconMap[name] = dropdownContent;
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
