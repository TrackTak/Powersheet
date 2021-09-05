import { prefix } from './../../utils';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import styles from './RightClickMenu.module.scss';
import Sheet from './Sheet';
import { createGroup } from '../../toolbar/htmlElementHelpers';

export const rightClickMenuPrefix = `${prefix}-right-click-menu`;

export interface IRightClickMenuActionGroups {
  elements: HTMLElement[];
}

class RightClickMenu {
  rightClickMenuEl: HTMLDivElement;
  menuItem: HTMLDivElement;
  dropdown: Instance<Props>;
  rightClickMenuActionGroups: IRightClickMenuActionGroups[];

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.rightClickMenuEl = document.createElement('div');
    this.menuItem = document.createElement('div');

    this.rightClickMenuEl.classList.add(
      styles.rightClickMenuEl,
      `${rightClickMenuPrefix}`
    );

    this.menuItem.classList.add(
      styles.menuItem,
      `${rightClickMenuPrefix}-menu-item`
    );

    const content = document.createElement('div');

    content.classList.add(styles.content, `${rightClickMenuPrefix}-content`);

    this.rightClickMenuActionGroups = [
      {
        elements: [
          this.createButtonContent('Comment', 'comment'),
          this.createButtonContent('Copy', 'copy'),
          this.createButtonContent('Cut', 'cut'),
          this.createButtonContent('Paste', 'paste'),
          this.createButtonContent('Paste values only', 'paste-values'),
          this.createButtonContent('Paste format only', 'paste-format'),
        ],
      },
      {
        elements: [
          this.createButtonContent('Insert row', 'insert-row'),
          this.createButtonContent('Insert column', 'insert-column'),
        ],
      },
      {
        elements: [
          this.createButtonContent('Delete row', 'delete-row'),
          this.createButtonContent('Delete column', 'delete-column'),
          this.createButtonContent('Hide', 'hide'),
        ],
      },
    ];

    this.rightClickMenuActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, rightClickMenuPrefix);

      content.appendChild(group);
    });

    this.dropdown = tippy(this.sheet.container, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      delay: 0,
      trigger: 'click',
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'dropdown',
      content,
      showOnCreate: false,
      hideOnClick: true,
    });

    this.sheet.stage.on('click', (e) => {
      if (e.evt.button === 2) {
        this.dropdown.show();
      }
    });

    this.sheet.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });

    this.rightClickMenuEl.appendChild(this.menuItem);
  }

  createButtonContent(name: string, className: string) {
    const button = document.createElement('button');

    button.textContent = name;

    button.classList.add(
      styles.buttonContent,
      styles[className],
      `${rightClickMenuPrefix}-${className}`,
      `${rightClickMenuPrefix}-button-content`
    );

    return button;
  }
}

export default RightClickMenu;
