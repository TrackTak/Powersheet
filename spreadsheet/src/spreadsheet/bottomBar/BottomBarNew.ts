import SheetsGroup from '../sheetsGroup/SheetsGroup';
import {
  createSheetSelectionDropdownContent,
  createSheetTab,
  createSheetSelectionDropdownButton,
  createSheetTabDropdownContent,
} from './bottomBarHtmlElementHelpers';
import styles from './BottomBar.module.scss';
import { prefix } from '../utils';
import tippy, { Instance, Props } from 'tippy.js';
import { createIconButton, IIconElements } from '../htmlElementHelpers';

export const bottomBarPrefix = `${prefix}-bottom-bar`;

class BottomBar {
  bottomBar: HTMLDivElement;
  content: HTMLDivElement;
  sheetSelectionContainer: HTMLDivElement;
  sheetSelectionButton: IIconElements;
  sheetSelectionDropdown: Instance<Props>;
  sheetSelectionDropdownContent: HTMLDivElement;
  createNewSheetButtonElements: IIconElements;
  tabContainer: HTMLDivElement;
  scrollSliderContainer: HTMLDivElement;

  constructor(private sheetsGroup: SheetsGroup) {
    this.sheetsGroup = sheetsGroup;

    this.createNewSheetButtonElements = createIconButton(
      'add',
      bottomBarPrefix
    );
    this.createNewSheetButtonElements.button.addEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );

    this.sheetSelectionButton = createIconButton('ellipsis', bottomBarPrefix);
    this.sheetSelectionButton.button.addEventListener('click', () => {
      this.sheetSelectionDropdown.show();
    });

    this.bottomBar = document.createElement('div');
    this.bottomBar.classList.add(styles.bottomBar, `${bottomBarPrefix}`);

    this.content = document.createElement('div');
    this.content.classList.add(styles.content, `${bottomBarPrefix}-content`);

    this.tabContainer = document.createElement('div');
    this.tabContainer.classList.add(`${bottomBarPrefix}-tab-container`);

    this.sheetSelectionContainer = document.createElement('div');
    this.sheetSelectionContainer.classList.add(
      styles.sheetSelectionContainer,
      `${bottomBarPrefix}-sheet-selection-container`
    );

    this.sheetSelectionDropdownContent = createSheetSelectionDropdownContent();

    this.sheetSelectionDropdown = tippy(this.sheetSelectionButton.button, {
      placement: 'top',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      theme: 'dropdown',
      showOnCreate: false,
      hideOnClick: true,
      content: this.sheetSelectionDropdownContent,
    });

    this.scrollSliderContainer = document.createElement('div');
    this.scrollSliderContainer.classList.add(
      styles.scrollSliderContainer,
      `${bottomBarPrefix}-scroll-slider-container`
    );

    // this.scrollSliderContainerEl.appendChild(this.sheetTabs[0]);
    this.sheetSelectionContainer.appendChild(this.sheetSelectionButton.button);
    this.tabContainer.appendChild(this.scrollSliderContainer);
    this.content.appendChild(this.createNewSheetButtonElements.buttonContainer);
    this.content.appendChild(this.sheetSelectionContainer);
    this.bottomBar.appendChild(this.content);
    this.bottomBar.appendChild(this.tabContainer);
    this.sheetsGroup.sheetsGroupEl.appendChild(this.bottomBar);
  }

  updateSheetTabs() {
    this.scrollSliderContainer.innerHTML = '';
    this.sheetSelectionDropdownContent.innerHTML = '';

    for (const [sheetId] of this.sheetsGroup.sheets) {
      const sheetTabContainer = document.createElement('div');
      const sheetTab = createSheetTab();
      const nameContainer = document.createElement('span');
      const sheetSelectionDropdownButton = createSheetSelectionDropdownButton();
      const isSheetActive = sheetId === this.sheetsGroup.activeSheetId;

      if (isSheetActive) {
        sheetTab.classList.add('active');
      } else {
        sheetTab.classList.remove('active');
      }

      sheetSelectionDropdownButton.textContent = sheetId;

      sheetTabContainer.classList.add(
        styles.sheetTabContainer,
        `${bottomBarPrefix}-sheet-tab-container`
      );
      sheetTabContainer.dataset.sheetId = sheetId;

      const switchSheet = () => {
        this.sheetsGroup.switchSheet(sheetId);
      };

      const setTabToContentEditable = () => {
        nameContainer.contentEditable = 'true';
        nameContainer.focus();
      };

      const { sheetTabDropdownContent, deleteSheetButton, renameSheetButton } =
        createSheetTabDropdownContent();

      deleteSheetButton.disabled = this.sheetsGroup.sheets.size === 1;

      const sheetTabDropdown = tippy(sheetTab, {
        placement: 'top',
        interactive: true,
        arrow: false,
        trigger: 'manual',
        theme: 'dropdown',
        showOnCreate: false,
        hideOnClick: true,
        content: sheetTabDropdownContent,
      });

      sheetSelectionDropdownButton.addEventListener('click', () => {
        switchSheet();

        this.sheetSelectionDropdown.hide();
      });

      sheetTab.addEventListener('click', () => {
        if (!isSheetActive) {
          switchSheet();
        }
      });

      sheetTab.addEventListener('dblclick', () => {
        setTabToContentEditable();
      });

      sheetTab.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        sheetTabDropdown.show();
      });

      deleteSheetButton.addEventListener('click', () => {
        sheetTabDropdown.hide();

        this.sheetsGroup.deleteSheet(sheetId);
      });

      renameSheetButton.addEventListener('click', () => {
        sheetTabDropdown.hide();

        setTabToContentEditable();
      });

      nameContainer.addEventListener('blur', () => {
        nameContainer.contentEditable = 'false';
        nameContainer.blur();

        this.sheetsGroup.renameSheet(sheetId, nameContainer.textContent!);
      });

      nameContainer.classList.add(
        styles.nameContainer,
        `${bottomBarPrefix}-name-container`
      );

      nameContainer.textContent = sheetId;

      sheetTab.appendChild(nameContainer);
      sheetTabContainer.appendChild(sheetTab);

      this.scrollSliderContainer.appendChild(sheetTabContainer);
      this.sheetSelectionDropdownContent.appendChild(
        sheetSelectionDropdownButton
      );
    }
  }

  createNewSheetButtonOnClick = () => {
    this.sheetsGroup.createNewSheet({
      sheetName: this.sheetsGroup.getSheetName(),
    });
  };

  destroy() {
    this.createNewSheetButtonElements.button.removeEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );
  }
}

export default BottomBar;
