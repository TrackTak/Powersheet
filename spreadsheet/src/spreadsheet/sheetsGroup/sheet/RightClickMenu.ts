import { prefix } from './../../utils';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import styles from './RightClickMenu.module.scss';
import Sheet from './Sheet';

export const rightClickMenuPrefix = `${prefix}-right-click-menu`;

class RightClickMenu {
  rightClickMenuEl: HTMLDivElement;
  menuItem: HTMLDivElement;
  dropdown: Instance<Props>;

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

    const arrayElements = [
      {
        text: 'Comment',
      },
      {
        text: 'Copy',
      },
      {
        text: 'Cut',
      },
      {
        text: 'Paste',
      },
      {
        text: 'Paste values only',
      },
      {
        text: 'Paste format only',
      },
      {
        text: 'Insert row',
      },
      {
        text: 'Insert column',
      },
      {
        text: 'Delete row',
      },
      {
        text: 'Delete column',
      },
    ];

    arrayElements.forEach((element) => {
      const elements = content.appendChild(
        this.createButtonContentMenu(element.text)
      );
      elements.classList.add(
        styles.buttonContent,
        `${rightClickMenuPrefix}-button-content`
      );
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

  createButtonContentMenu(name: string) {
    const button = document.createElement('button');
    button.textContent = name;

    return button;
  }
}

export default RightClickMenu;
