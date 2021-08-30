import './bottomBar.scss';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';
import leftIcon from '../../icons/left-icon.svg';
import rightIcon from '../../icons/right-icon.svg';
import { prefix } from '../utils';

export interface IBottomBar extends IConstructorParams {}

interface IConstructorParams {
  addSheetTab: HTMLButtonElement;
  menuSheetHeader: HTMLButtonElement;
}

export const bottomBarPrefix = `${prefix}-bottom-bar`;
class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  addSheetTab: HTMLButtonElement;
  menuSheetHeader: HTMLButtonElement;
  sheetTabs: HTMLDivElement[];
  allSheetsMenu: HTMLButtonElement[];
  contextSheetTabMenu: HTMLDivElement;
  menuSheetDropdownContent: HTMLDivElement;
  scrollSlider: HTMLDivElement;
  globalSheetIndex: number;
  tabContainerMaxWidth: number;
  tabContainer: HTMLDivElement;
  scrollsliderContainerTab: HTMLDivElement;
  currentDropdownTab?: HTMLDivElement;

  constructor(params?: IConstructorParams) {
    this.globalSheetIndex = 1;
    this.addSheetTab = params?.addSheetTab ?? this.createAddSheetTab();
    this.menuSheetHeader =
      params?.menuSheetHeader ?? this.createMenuSheetHeader();
    this.sheetTabs = [this.createSheetTab()];
    this.allSheetsMenu = [this.createAllSheetsMenu()];
    this.contextSheetTabMenu = this.createContextSheetTabMenu();
    this.menuSheetDropdownContent = this.createMenuSheetDropdownContent();
    this.scrollSlider = this.createScrollSlider();
    this.tabContainer = document.createElement('div');
    this.scrollsliderContainerTab = document.createElement('div');
    //TO DO
    // this.tabContainerMaxWidth = 700;
    // this.tabContainer.style.width = `${this.tabContainerMaxWidth}px`;

    this.create();
  }

  private create() {
    this.element = document.createElement('div');
    this.element.className = `${bottomBarPrefix}-navbar`;

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = `${bottomBarPrefix}-wrapper`;

    this.element.appendChild(buttonWrapper);

    buttonWrapper.appendChild(this.addSheetTab);

    const menuSheetContainer = document.createElement('div');
    menuSheetContainer.className = `${bottomBarPrefix}-menusheet-container`;

    buttonWrapper.appendChild(menuSheetContainer);
    this.tabContainer.appendChild(this.scrollsliderContainerTab);

    this.tabContainer.className = `${bottomBarPrefix}-tab`;
    this.scrollsliderContainerTab.className = `${bottomBarPrefix}-scrollslider-container-tab`;

    this.element.appendChild(this.tabContainer);
    this.element.appendChild(this.scrollSlider);

    this.scrollsliderContainerTab.appendChild(this.sheetTabs[0]);
    menuSheetContainer.appendChild(this.menuSheetHeader);
    menuSheetContainer.appendChild(this.menuSheetDropdownContent);
    this.menuSheetDropdownContent.appendChild(this.allSheetsMenu[0]);

    this.addSheetTab.addEventListener('click', () => {
      this.globalSheetIndex += 1;
      const tabSheets = this.createSheetTab();

      this.sheetTabs.push(tabSheets);

      this.scrollsliderContainerTab.innerHTML = '';
      this.menuSheetDropdownContent.innerHTML = '';

      this.sheetTabs.forEach((sheetTab) => {
        this.scrollsliderContainerTab.appendChild(sheetTab);
      });

      const menuSheetButton = this.createAllSheetsMenu();

      this.allSheetsMenu.push(menuSheetButton);

      this.allSheetsMenu.forEach((sheet) => {
        this.menuSheetDropdownContent.appendChild(sheet);
      });
    });
  }

  //TO DO
  createScrollSlider() {
    const scrollSlider = document.createElement('div');
    scrollSlider.className = `${bottomBarPrefix}-scrollslider-arrow`;

    const scrollSliderContent = document.createElement('div');
    scrollSliderContent.className = `${bottomBarPrefix}-scrollslider-content`;

    const leftScrollSliderButton = document.createElement('button');
    leftScrollSliderButton.className = `${bottomBarPrefix}-left-scrollslider`;

    const rightScrollSliderButton = document.createElement('button');
    rightScrollSliderButton.className = `${bottomBarPrefix}-right-scrollslider`;

    const leftScrollImage = document.createElement('img');

    leftScrollImage.src = leftIcon;
    leftScrollImage.alt = 'left';
    leftScrollImage.className = `${bottomBarPrefix}-scroll-icon`;
    leftScrollSliderButton.appendChild(leftScrollImage);

    const rightScrollImage = document.createElement('img');

    rightScrollImage.src = rightIcon;
    rightScrollImage.alt = 'right';
    rightScrollImage.className = `${bottomBarPrefix}-scroll-icon`;
    rightScrollSliderButton.appendChild(rightScrollImage);

    let translate = 0;

    leftScrollSliderButton.addEventListener('click', () => {
      if (translate >= 0) {
        translate += 100;
        this.scrollsliderContainerTab.style.transform =
          'translateX(' + translate + 'px' + ')';
      }
    });

    rightScrollSliderButton.addEventListener('click', () => {
      const scrollSliderSheetTabs = this.sheetTabs[this.sheetTabs.length - 1];

      const totalScrollWidth = this.sheetTabs.reduce((prev, curr) => {
        return (prev += curr.getBoundingClientRect().width);
      }, 0);

      const remainingScrollWidth = totalScrollWidth - this.tabContainerMaxWidth;

      if (translate >= 0) {
        translate -= 100;
        this.scrollsliderContainerTab.style.transform =
          'translateX(' + translate + 'px' + ')';
      }
    });

    scrollSlider.appendChild(scrollSliderContent);
    scrollSliderContent.appendChild(leftScrollSliderButton);
    scrollSliderContent.appendChild(rightScrollSliderButton);

    return scrollSlider;
  }

  createSheetTab() {
    const sheetTab = document.createElement('div');
    sheetTab.className = `${bottomBarPrefix}-sheet-tab`;

    const spanElement = document.createElement('span');
    spanElement.className = `${bottomBarPrefix}-sheet-tab-span`;

    spanElement.textContent = `Sheet${this.globalSheetIndex}`;
    sheetTab.appendChild(spanElement);

    const containerSheetTab = document.createElement('div');
    containerSheetTab.className = `${bottomBarPrefix}-container-sheet-tab`;
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

  createContextSheetTabMenu() {
    const contextSheetTabMenu = document.createElement('div');
    contextSheetTabMenu.className = `${bottomBarPrefix}-context-sheet-menu`;

    const sheetTabMenuItem = document.createElement('div');
    sheetTabMenuItem.className = `${bottomBarPrefix}-sheet-menuitem`;

    const deleteSheetTab = document.createElement('button');
    deleteSheetTab.className = `${bottomBarPrefix}-delete-sheet`;
    deleteSheetTab.textContent = 'Delete';

    deleteSheetTab.addEventListener('click', (e: MouseEvent) => {
      let element = e.target as unknown as HTMLElement;

      while (
        !element.classList.contains(`${bottomBarPrefix}-container-sheet-tab`)
      ) {
        element = element.parentElement!;
      }

      const containerButtonTab = element as HTMLButtonElement;

      const childrenElements = Array.from(
        containerButtonTab.parentElement!.children
      );

      const elementIndex = childrenElements.indexOf(containerButtonTab);
      const menuSheetDropdown = document.querySelector(
        `${bottomBarPrefix}-menusheet-dropdown-content`
      )!;

      this.sheetTabs.splice(elementIndex, 1);
      this.allSheetsMenu.splice(elementIndex, 1);

      menuSheetDropdown.children[elementIndex].remove();
      containerButtonTab.remove();
    });

    const renameSheetTab = document.createElement('button');
    renameSheetTab.className = `${bottomBarPrefix}-rename-sheet`;
    renameSheetTab.textContent = 'Rename';

    renameSheetTab.addEventListener('click', () => {
      const contentEditable = this.currentDropdownTab!.querySelector(
        `${bottomBarPrefix}-sheet-tab-span`
      ) as HTMLElement;

      contentEditable.contentEditable = 'true';
      contentEditable.focus();
    });

    contextSheetTabMenu.appendChild(sheetTabMenuItem);
    sheetTabMenuItem.appendChild(deleteSheetTab);
    sheetTabMenuItem.appendChild(renameSheetTab);

    return contextSheetTabMenu;
  }

  createAddSheetTab() {
    const buttonPlus = document.createElement('button');
    buttonPlus.className = `${bottomBarPrefix}-plus-button-icon`;

    buttonPlus.addEventListener('click', () => {
      if (
        this.tabContainer.getBoundingClientRect().width >=
        this.tabContainerMaxWidth
      ) {
        this.scrollSlider.style.display = 'block';
      } else {
        this.scrollSlider.style.display = 'none';
      }
    });

    const plusImage = document.createElement('img');

    plusImage.src = plusIcon;
    plusImage.alt = 'plus';
    plusImage.className = `${bottomBarPrefix}-plus-img-icon`;
    buttonPlus.appendChild(plusImage);

    return buttonPlus;
  }

  createMenuSheetHeader() {
    const menuSheetHeader = document.createElement('button');
    menuSheetHeader.className = `${bottomBarPrefix}-menu-button-icon`;

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

    const menuSheetImage = document.createElement('img');

    menuSheetImage.src = sheetIcon;
    menuSheetImage.alt = 'sheet';
    menuSheetImage.className = `${bottomBarPrefix}-sheet-img-icon`;

    menuSheetHeader.appendChild(menuSheetImage);

    return menuSheetHeader;
  }

  createMenuSheetDropdownContent() {
    const menuSheetDropdownContent = document.createElement('div');

    menuSheetDropdownContent.className = `${bottomBarPrefix}-menusheet-dropdown-content`;
    menuSheetDropdownContent.style.display = 'none';

    return menuSheetDropdownContent;
  }

  createAllSheetsMenu() {
    const allSheetsMenu = document.createElement('button');
    allSheetsMenu.className = `${bottomBarPrefix}-all-sheet-menu`;
    allSheetsMenu.dataset.globalSheetIndex = this.globalSheetIndex.toString();

    allSheetsMenu.textContent = `Sheet${this.globalSheetIndex}`;

    return allSheetsMenu;
  }
}

export default BottomBar;
