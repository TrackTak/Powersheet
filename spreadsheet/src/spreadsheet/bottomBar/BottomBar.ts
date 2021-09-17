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
import { SheetId } from '../sheetsGroup/sheet/Sheet';

export const bottomBarPrefix = `${prefix}-bottom-bar`;

interface ISheetTabElements {
  sheetTabContainer: HTMLDivElement;
  sheetTab: HTMLDivElement;
  nameContainer: HTMLSpanElement;
  sheetSelectionDropdownButton: HTMLButtonElement;
  isActive: boolean;
}

class BottomBar {
  bottomBar: HTMLDivElement;
  content: HTMLDivElement;
  sheetSelectionButtonContainer: HTMLDivElement;
  sheetSelectionButton: IIconElements;
  sheetSelectionDropdown: Instance<Props>;
  sheetSelectionDropdownContent: HTMLDivElement;
  createNewSheetButtonElements: IIconElements;
  tabContainer: HTMLDivElement;
  scrollSliderContainer: HTMLDivElement;
  sheetTabElementsMap: Map<SheetId, ISheetTabElements>;

  constructor(private sheetsGroup: SheetsGroup) {
    this.sheetsGroup = sheetsGroup;

    this.sheetTabElementsMap = new Map();

    this.createNewSheetButtonElements = createIconButton(
      'add',
      bottomBarPrefix
    );
    this.createNewSheetButtonElements.buttonContainer.classList.add(
      styles.createNewSheetButtonContainer
    );
    this.createNewSheetButtonElements.button.addEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );

    this.sheetSelectionButton = createIconButton('hamburger', bottomBarPrefix);
    this.sheetSelectionButton.button.addEventListener(
      'click',
      this.sheetSelectionOnClick
    );

    this.bottomBar = document.createElement('div');
    this.bottomBar.classList.add(styles.bottomBar, `${bottomBarPrefix}`);

    this.content = document.createElement('div');
    this.content.classList.add(styles.content, `${bottomBarPrefix}-content`);

    this.tabContainer = document.createElement('div');
    this.tabContainer.classList.add(`${bottomBarPrefix}-tab-container`);

    this.sheetSelectionButtonContainer = document.createElement('div');
    this.sheetSelectionButtonContainer.classList.add(
      styles.sheetSelectionButtonContainer,
      `${bottomBarPrefix}-sheet-selection-button-container`
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

    this.sheetSelectionButtonContainer.appendChild(
      this.sheetSelectionButton.button
    );
    this.tabContainer.appendChild(this.scrollSliderContainer);
    this.content.appendChild(this.createNewSheetButtonElements.buttonContainer);
    this.content.appendChild(this.sheetSelectionButtonContainer);
    this.bottomBar.appendChild(this.content);
    this.bottomBar.appendChild(this.tabContainer);
    this.sheetsGroup.sheetsGroupEl.appendChild(this.bottomBar);
  }

  setSheetTabElements(sheetId: SheetId) {
    const { sheetTabContainer, sheetTab, nameContainer } = createSheetTab();
    const sheetSelectionDropdownButton = createSheetSelectionDropdownButton();
    const isActive = sheetId === this.sheetsGroup.getActiveSheetId();

    if (isActive) {
      sheetTab.classList.add('active');
    } else {
      sheetTab.classList.remove('active');
    }

    sheetSelectionDropdownButton.textContent =
      this.sheetsGroup.getData()[sheetId].sheetName;

    const switchSheet = () => {
      this.sheetsGroup.switchSheet(sheetId);
    };

    const setTabToContentEditable = () => {
      nameContainer.contentEditable = 'true';
      nameContainer.focus();
    };

    const { sheetTabDropdownContent, deleteSheetButton, renameSheetButton } =
      createSheetTabDropdownContent();

    deleteSheetButton.disabled = this.sheetsGroup.sheets.length === 1;

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

    sheetSelectionDropdownButton.addEventListener(
      'click',
      () => {
        switchSheet();

        this.sheetSelectionDropdown.hide();
      },
      { once: true }
    );

    sheetTab.addEventListener(
      'click',
      () => {
        if (!isActive) {
          switchSheet();
        }
      },
      { once: true }
    );

    sheetTab.addEventListener(
      'dblclick',
      () => {
        setTabToContentEditable();
      },
      { once: true }
    );

    sheetTab.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault();

        sheetTabDropdown.show();
      },
      { once: true }
    );

    deleteSheetButton.addEventListener(
      'click',
      () => {
        sheetTabDropdown.hide();

        this.sheetsGroup.deleteSheet(sheetId);
      },
      { once: true }
    );

    renameSheetButton.addEventListener(
      'click',
      () => {
        sheetTabDropdown.hide();

        setTabToContentEditable();
      },
      { once: true }
    );

    nameContainer.addEventListener(
      'blur',
      () => {
        nameContainer.contentEditable = 'false';
        nameContainer.blur();

        this.sheetsGroup.renameSheet(sheetId, nameContainer.textContent!);
      },
      { once: true }
    );

    nameContainer.textContent = this.sheetsGroup.getData()[sheetId].sheetName;

    this.scrollSliderContainer.appendChild(sheetTabContainer);
    this.sheetSelectionDropdownContent.appendChild(
      sheetSelectionDropdownButton
    );

    this.sheetTabElementsMap.set(sheetId, {
      sheetTabContainer,
      sheetTab,
      nameContainer,
      sheetSelectionDropdownButton,
      isActive,
    });
  }

  updateSheetTabs() {
    this.scrollSliderContainer.innerHTML = '';
    this.sheetSelectionDropdownContent.innerHTML = '';

    this.sheetsGroup.sheets.forEach((sheet) => {
      this.setSheetTabElements(sheet.sheetId);
    });
  }

  sheetSelectionOnClick = () => {
    this.sheetSelectionDropdown.show();
  };

  createNewSheetButtonOnClick = () => {
    const sheetName = this.sheetsGroup.getSheetName();

    this.sheetsGroup.createNewSheet({
      sheetName,
    });
  };

  destroy() {
    this.createNewSheetButtonElements.button.removeEventListener(
      'click',
      this.createNewSheetButtonOnClick
    );
    this.sheetSelectionButton.button.removeEventListener(
      'click',
      this.sheetSelectionOnClick
    );
  }
}

export default BottomBar;
