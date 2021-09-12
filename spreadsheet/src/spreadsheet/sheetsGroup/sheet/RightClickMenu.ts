import { prefix } from './../../utils';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import styles from './RightClickMenu.module.scss';
import Sheet from './Sheet';
import { createGroup } from '../../htmlElementHelpers';
import { createButtonContent, ButtonName } from './rightClickMenuHtmlHelpers';
import { KonvaEventListener } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';

export const rightClickMenuPrefix = `${prefix}-right-click-menu`;

export interface IRightClickMenuActionGroups {
  elements: HTMLElement[];
}

class RightClickMenu {
  rightClickMenuEl: HTMLDivElement;
  menuItem: HTMLDivElement;
  dropdown: Instance<Props>;
  buttonMap: Record<ButtonName, HTMLElement>;
  rightClickMenuActionGroups: IRightClickMenuActionGroups[];
  buttonRightOnClickMenu: KonvaEventListener<Stage, MouseEvent>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.buttonMap = {
      comment: createButtonContent('Comment', 'comment'),
      copy: createButtonContent('Copy', 'copy'),
      cut: createButtonContent('Cut', 'cut'),
      paste: createButtonContent('Paste', 'paste'),
      insertRow: createButtonContent('Insert row', 'insert-row'),
      insertColumn: createButtonContent('Insert column', 'insert-column'),
      deleteRow: createButtonContent('Delete row', 'delete-row'),
      deleteColumn: createButtonContent('Delete column', 'delete-column'),
    };
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

    const buttons = this.buttonMap;

    this.rightClickMenuActionGroups = [
      {
        elements: [buttons.comment, buttons.copy, buttons.cut, buttons.paste],
      },
      {
        elements: [buttons.insertRow, buttons.insertColumn],
      },
      {
        elements: [buttons.deleteRow, buttons.deleteColumn],
      },
    ];

    this.rightClickMenuActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, rightClickMenuPrefix);

      content.appendChild(group);
    });

    Object.values(buttons).forEach((button) => {
      button.addEventListener('click', () => {
        this.dropdown.hide();
      });
    });

    buttons.comment.addEventListener('click', () => {
      this.sheet.comment?.show();
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

    this.buttonRightOnClickMenu = (e) => {
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
    };

    this.sheet.stage.on('click', this.buttonRightOnClickMenu);

    this.sheet.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });

    this.rightClickMenuEl.appendChild(this.menuItem);
  }
  destory() {
    this.sheet.stage.off('click', this.buttonRightOnClickMenu);
  }
}

export default RightClickMenu;
