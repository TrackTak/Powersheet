import { prefix } from '../utils';
import { sentenceCase } from 'sentence-case';
import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';

export type IconElement = HTMLButtonElement;

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
  toolbarActionGroups: IToolbarActionGroups[];
  tooltip: DelegateInstance;
  dropdown: DelegateInstance;

  constructor() {
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.topLevelIconMap = {} as ITopLevelIconMap;

    this.tooltip = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-tooltip`,
      touch: false,
    });

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-icon-button`,
      trigger: 'click',
      interactive: true,
      arrow: false,
      content: (e) => {
        const name = (e as HTMLButtonElement).dataset.name as string;

        return this.createDropdown();
      },
    });

    topLevelIconNames.forEach((name) => {
      let button;

      switch (name) {
        case 'alignLeft':
        case 'alignMiddle':
        case 'function':
          button = this.createDropdownIconButton(name);
          break;
        default:
          button = this.createIconButton(name);
          button.appendChild(this.createTooltip(name));
          break;
      }

      this.topLevelIconMap[name] = button;
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
    this.tooltip.destroy();
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

  createDropdownIconButton(name: string) {
    const button = this.createIconButton(name);
    const iconContainer = this.createIcon('arrowDown');

    button.classList.add(
      styles.dropdownIconButton,
      `${toolbarPrefix}-dropdown-icon-button`
    );
    button.appendChild(iconContainer);
    button.appendChild(this.createTooltip(name));

    return button;
  }

  createDropdown() {
    const dropdown = document.createElement('div');

    dropdown.classList.add(styles.dropdown, `${toolbarPrefix}-dropdown`);

    return dropdown;
  }

  createIconButton(name: string) {
    const button = document.createElement('button');

    button.dataset.name = name;

    button.classList.add(
      styles.iconButton,
      styles[name],
      `${toolbarPrefix}-icon-button`,
      `${toolbarPrefix}-${name}-button`
    );

    const iconContainer = this.createIcon(name);

    button.appendChild(iconContainer);

    return button;
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
