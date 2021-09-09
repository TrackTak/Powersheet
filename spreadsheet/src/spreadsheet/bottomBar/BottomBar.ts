import {
  createAddSheetTab,
  createAllSheetsMenu,
  createContextSheetTabMenu,
  createMenuSheetDropdownContent,
  createMenuSheetHeader,
  createSheetTab,
} from './bottomBarHtmlElementHelpers';
import styles from './BottomBar.module.scss';
import { prefix } from '../utils';
import SheetsGroup from '../sheetsGroup/SheetsGroup';

export const bottomBarPrefix = `${prefix}-bottom-bar`;

class BottomBar {
  bottomBarEl!: HTMLDivElement;
  addSheetTab: HTMLButtonElement;
  menuSheetHeader: HTMLButtonElement;
  sheetTabs: HTMLDivElement[];
  allSheetsMenu: HTMLButtonElement[];
  contextSheetTabMenu: HTMLDivElement;
  menuSheetDropdownContent: HTMLDivElement;
  globalSheetIndex: number;
  tabContainer: HTMLDivElement;
  scrollsliderContainerTab: HTMLDivElement;
  currentDropdownTab?: HTMLDivElement;

  constructor(private sheetsGroup: SheetsGroup) {
    this.sheetsGroup = sheetsGroup;

    this.globalSheetIndex = 1;
    this.addSheetTab = this.setAddSheetTab();
    this.menuSheetHeader = this.setMenuSheetHeader();
    this.sheetTabs = [this.setSheetTab()];
    this.allSheetsMenu = [this.setAllSheetsMenu()];
    this.contextSheetTabMenu = this.setContextSheetTabMenu();
    this.menuSheetDropdownContent = this.setMenuSheetDropdownContent();
    this.tabContainer = document.createElement('div');
    this.scrollsliderContainerTab = document.createElement('div');
    //TO DO
    // this.tabContainerMaxWidth = 700;
    // this.tabContainer.style.width = `${this.tabContainerMaxWidth}px`;

    this.create();

    this.sheetsGroup.sheetsGroupEl.appendChild(this.bottomBarEl);
  }

  private create() {
    this.bottomBarEl = document.createElement('div');
    this.bottomBarEl.classList.add(styles.bottomBar, `${bottomBarPrefix}`);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add(styles.wrapper, `${bottomBarPrefix}-wrapper`);

    this.bottomBarEl.appendChild(buttonWrapper);

    buttonWrapper.appendChild(this.addSheetTab);

    const menuSheetContainer = document.createElement('div');
    menuSheetContainer.classList.add(
      styles.menusheetContainer,
      `${bottomBarPrefix}-menusheet-container`
    );

    buttonWrapper.appendChild(menuSheetContainer);
    this.tabContainer.appendChild(this.scrollsliderContainerTab);

    this.tabContainer.classList.add(styles.tab, `${bottomBarPrefix}-tab`);
    this.scrollsliderContainerTab.classList.add(
      styles.scrollsliderContainerTab,
      `${bottomBarPrefix}-scrollslider-container-tab`
    );

    this.bottomBarEl.appendChild(this.tabContainer);
    // this.bottomBarEl.appendChild(this.scrollSlider);

    this.scrollsliderContainerTab.appendChild(this.sheetTabs[0]);
    menuSheetContainer.appendChild(this.menuSheetHeader);
    menuSheetContainer.appendChild(this.menuSheetDropdownContent);
    this.menuSheetDropdownContent.appendChild(this.allSheetsMenu[0]);

    this.addSheetTab.addEventListener('click', () => {
      this.globalSheetIndex += 1;
      const tabSheets = this.setSheetTab();

      this.sheetTabs.push(tabSheets);

      this.scrollsliderContainerTab.innerHTML = '';
      this.menuSheetDropdownContent.innerHTML = '';

      this.sheetTabs.forEach((sheetTab) => {
        this.scrollsliderContainerTab.appendChild(sheetTab);
      });

      const menuSheetButton = this.setAllSheetsMenu();

      this.allSheetsMenu.push(menuSheetButton);

      this.allSheetsMenu.forEach((sheet) => {
        this.menuSheetDropdownContent.appendChild(sheet);
      });
      this.sheetsGroup.createNewSheet({
        sheetName: this.sheetsGroup.getSheetName(),
      });
    });
  }

  setSheetTab() {
    const sheetTab = createSheetTab();

    const spanElement = document.createElement('span');
    spanElement.classList.add(
      styles.sheetTabSpan,
      `${bottomBarPrefix}-sheet-tab-span`
    );

    spanElement.textContent = `Sheet${this.globalSheetIndex}`;
    sheetTab.appendChild(spanElement);

    const containerSheetTab = document.createElement('div');
    containerSheetTab.classList.add(
      styles.containerSheetTab,
      `${bottomBarPrefix}-container-sheet-tab`
    );
    containerSheetTab.dataset.globalSheetIndex =
      this.globalSheetIndex.toString();

    containerSheetTab.appendChild(sheetTab);

    sheetTab.addEventListener('mouseup', (e: MouseEvent) => {
      const buttonPressed = e.button;
      if (buttonPressed === 2) {
        this.currentDropdownTab = e.target!.parentElement as HTMLDivElement;

        e.target!.parentElement.appendChild(this.contextSheetTabMenu);
        this.contextSheetTabMenu.style.display = 'block';
      }
    });

    sheetTab.addEventListener('dblclick', () => {
      spanElement.contentEditable = 'true';
      spanElement.focus();
    });

    spanElement.addEventListener('blur', () => {
      const sheetMenu = this.allSheetsMenu.find(
        (x) =>
          x.dataset.globalSheetIndex ===
          containerSheetTab.dataset.globalSheetIndex
      )!;

      sheetMenu.textContent = spanElement.textContent;
    });

    window.addEventListener('click', (e: MouseEvent) => {
      const target = e.target! as unknown as Node;
      const isClickInside = this.contextSheetTabMenu.contains(target);
      if (isClickInside) {
      } else {
        this.contextSheetTabMenu.style.display = 'none';
      }
    });

    sheetTab.addEventListener('contextmenu', (e) => {
      this.menuSheetDropdownContent.style.display = 'none';
      e.preventDefault();
    });

    return containerSheetTab;
  }

  setContextSheetTabMenu() {
    const contextSheetTabMenu = createContextSheetTabMenu();

    const sheetTabMenuItem = document.createElement('div');
    sheetTabMenuItem.classList.add(
      styles.sheetMenuitem,
      `${bottomBarPrefix}-sheet-menuitem`
    );

    const deleteSheetTab = document.createElement('button');
    deleteSheetTab.classList.add(
      styles.buttonSheetAction,
      `${bottomBarPrefix}-delete-sheet`
    );
    deleteSheetTab.textContent = 'Delete';

    deleteSheetTab.addEventListener('click', (e: MouseEvent) => {
      let element = e.target as unknown as HTMLElement;

      while (!element.classList.contains(styles.containerSheetTab)) {
        element = element.parentElement!;
      }

      const containerButtonTab = element as HTMLButtonElement;

      const childrenElements = Array.from(
        containerButtonTab.parentElement!.children
      );

      const elementIndex = childrenElements.indexOf(containerButtonTab);
      const menuSheetDropdown = document.querySelector(
        `.${styles.menusheetDropdownContent}`
      )!;
      console.log(styles.menusheetDropdownContent);
      this.sheetTabs.splice(elementIndex, 1);
      this.allSheetsMenu.splice(elementIndex, 1);

      menuSheetDropdown.children[elementIndex].remove();
      containerButtonTab.remove();
    });

    const renameSheetTab = document.createElement('button');
    renameSheetTab.classList.add(
      styles.buttonSheetAction,
      `${bottomBarPrefix}-rename-sheet`
    );
    renameSheetTab.textContent = 'Rename';

    renameSheetTab.addEventListener('click', () => {
      const contentEditable = this.currentDropdownTab!.querySelector(
        `.${styles.sheetTabSpan}`
      ) as HTMLElement;

      contentEditable.contentEditable = 'true';
      contentEditable.focus();
    });

    contextSheetTabMenu.appendChild(sheetTabMenuItem);
    sheetTabMenuItem.appendChild(deleteSheetTab);
    sheetTabMenuItem.appendChild(renameSheetTab);

    return contextSheetTabMenu;
  }

  setAddSheetTab() {
    const buttonPlus = createAddSheetTab();

    //TO DO
    // buttonPlus.addEventListener('click', () => {
    //   if (
    //     this.tabContainer.getBoundingClientRect().width >=
    //     this.tabContainerMaxWidth
    //   ) {
    //     this.scrollSlider.style.display = 'block';
    //   } else {
    //     this.scrollSlider.style.display = 'none';
    //   }
    // });

    return buttonPlus;
  }

  setMenuSheetHeader() {
    const menuSheetHeader = createMenuSheetHeader();

    menuSheetHeader.addEventListener('click', (e) => {
      const sheetPressed = e.button;
      if (sheetPressed === 0) {
        this.menuSheetDropdownContent.style.display = 'flex';
      }
    });

    window.addEventListener(
      'click',
      (e: MouseEvent) => {
        const target = e.target! as unknown as Node;
        const isClickInside = this.menuSheetDropdownContent.contains(target);
        if (isClickInside) {
        } else {
          this.menuSheetDropdownContent.style.display = 'none';
        }
      },
      { capture: true }
    );

    menuSheetHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    return menuSheetHeader;
  }

  setMenuSheetDropdownContent() {
    const menuSheetDropdownContent = createMenuSheetDropdownContent();

    menuSheetDropdownContent.style.display = 'none';

    return menuSheetDropdownContent;
  }

  setAllSheetsMenu() {
    const allSheetsMenu = createAllSheetsMenu();

    allSheetsMenu.dataset.globalSheetIndex = this.globalSheetIndex.toString();

    allSheetsMenu.textContent = `Sheet${this.globalSheetIndex}`;

    return allSheetsMenu;
  }
}

export default BottomBar;
