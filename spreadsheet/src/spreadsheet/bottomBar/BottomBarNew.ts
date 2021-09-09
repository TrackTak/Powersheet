import SheetsGroup from '../sheetsGroup/SheetsGroup';
import {
  createSheetSelectionDropdownContent,
  createSheetSelectionButton,
  createNewSheetButton,
  createSheetTab,
  createSheetSelectionDropdownButton,
  createSheetTabDropdownContent,
} from './bottomBarHtmlElementHelpers';
import styles from './BottomBar.module.scss';
import { prefix } from '../utils';
import tippy, { Instance, Props } from 'tippy.js';

export const bottomBarPrefix = `${prefix}-bottom-bar`;

class BottomBar {
  bottomBar: HTMLDivElement;
  content: HTMLDivElement;
  sheetSelectionContainer: HTMLDivElement;
  sheetSelectionButton: HTMLButtonElement;
  sheetSelectionDropdown: Instance<Props>;
  sheetSelectionDropdownContent: HTMLDivElement;
  createNewSheetButton: HTMLButtonElement;
  tabContainer: HTMLDivElement;
  scrollSliderContainer: HTMLDivElement;

  constructor(private sheetsGroup: SheetsGroup) {
    this.sheetsGroup = sheetsGroup;

    this.createNewSheetButton = createNewSheetButton();
    this.createNewSheetButton.addEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );

    this.sheetSelectionButton = createSheetSelectionButton();
    this.sheetSelectionButton.addEventListener('click', () => {
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

    this.sheetSelectionDropdown = tippy(this.sheetSelectionButton, {
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
    this.sheetSelectionContainer.appendChild(this.sheetSelectionButton);
    this.tabContainer.appendChild(this.scrollSliderContainer);
    this.content.appendChild(this.createNewSheetButton);
    this.content.appendChild(this.sheetSelectionContainer);
    this.bottomBar.appendChild(this.content);
    this.bottomBar.appendChild(this.tabContainer);
    this.sheetsGroup.sheetsGroupEl.appendChild(this.bottomBar);
  }

  updateSheetTabs() {
    this.scrollSliderContainer.innerHTML = '';
    this.sheetSelectionDropdownContent.innerHTML = '';

    for (const [sheetName] of this.sheetsGroup.sheets) {
      const sheetTabContainer = document.createElement('div');
      const sheetTab = createSheetTab();
      const nameContainer = document.createElement('span');
      const sheetSelectionDropdownButton = createSheetSelectionDropdownButton();
      const isSheetActive = sheetName === this.sheetsGroup.activeSheetId;

      window.addEventListener('click', (e: MouseEvent) => {
        const target = e.target! as unknown as Node;
        const isClickInside = nameContainer.contains(target);

        if (!isClickInside) {
          nameContainer.contentEditable = 'false';
          nameContainer.blur();
        }
      });

      if (isSheetActive) {
        sheetTab.classList.add('active');
      } else {
        sheetTab.classList.remove('active');
      }

      sheetSelectionDropdownButton.textContent = sheetName;

      sheetTabContainer.classList.add(
        styles.sheetTabContainer,
        `${bottomBarPrefix}-sheet-tab-container`
      );
      sheetTabContainer.dataset.sheetId = sheetName;

      sheetTab.addEventListener('mouseup', (e: MouseEvent) => {
        const buttonPressed = e.button;
        if (buttonPressed === 2) {
          // this.currentDropdownTab = e.target!.parentElement as HTMLDivElement;
          // e.target!.parentElement.appendChild(this.contextSheetTabMenu);
          // this.contextSheetTabMenu.style.display = 'block';
        }
      });

      const switchSheet = () => {
        this.sheetsGroup.switchSheet(sheetName);
      };
      const renameSheetTab = () => {
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
        renameSheetTab();
      });

      sheetTab.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        sheetTabDropdown.show();
      });

      deleteSheetButton.addEventListener('click', () => {
        sheetTabDropdown.hide();

        this.sheetsGroup.deleteSheet(sheetName);
      });

      renameSheetButton.addEventListener('click', () => {
        sheetTabDropdown.hide();

        renameSheetTab();
      });

      nameContainer.addEventListener('blur', () => {
        // const sheetMenu = this.allSheetsMenu.find(
        //   (x) =>
        //     x.dataset.globalSheetIndex ===
        //     containerSheetTab.dataset.globalSheetIndex
        // )!;
        // sheetMenu.textContent = spanElement.textContent;
      });

      nameContainer.classList.add(
        styles.nameContainer,
        `${bottomBarPrefix}-name-container`
      );

      nameContainer.textContent = sheetName;

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
    this.createNewSheetButton.removeEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );
  }
}

export default BottomBar;
