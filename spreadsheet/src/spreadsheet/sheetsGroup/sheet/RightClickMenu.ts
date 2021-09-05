import { prefix } from './../../utils';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import styles from './RightClickMenu.module.scss';
import Sheet from './Sheet';
import { createGroup } from '../../htmlElementHelpers';
import { createButtonContent } from './rightClickMenuHtmlHelpers';

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
          createButtonContent('Comment', 'comment'),
          createButtonContent('Copy', 'copy'),
          createButtonContent('Cut', 'cut'),
          createButtonContent('Paste', 'paste'),
        ],
      },
      {
        elements: [
          createButtonContent('Insert row', 'insert-row'),
          createButtonContent('Insert column', 'insert-column'),
        ],
      },
      {
        elements: [
          createButtonContent('Delete row', 'delete-row'),
          createButtonContent('Delete column', 'delete-column'),
        ],
      },
    ];

    this.rightClickMenuActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, rightClickMenuPrefix);

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

    const hideDropdown = () => {
      this.dropdown.disable();
      this.dropdown.hide();
    };

    const showDropdown = () => {
      this.dropdown.enable();
      this.dropdown.show();
    };

    hideDropdown();

    this.sheet.stage.on('click', (e) => {
      if (e.evt.button === 0) {
        hideDropdown();
      }

      if (e.evt.button === 2) {
        if (this.dropdown.state.isShown) {
          hideDropdown();
        } else {
          showDropdown();
        }
      }
    });

    this.sheet.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });

    this.rightClickMenuEl.appendChild(this.menuItem);
  }
}

export default RightClickMenu;
