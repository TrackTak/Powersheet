import styles from './BottomBar.module.scss';
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
    this.element.classList.add(styles.bottomBar, `${bottomBarPrefix}`);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add(styles.wrapper, `${bottomBarPrefix}-wrapper`);

    this.element.appendChild(buttonWrapper);

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
    scrollSlider.classList.add(
      styles.scrollsliderArrow,
      `${bottomBarPrefix}-scrollslider-arrow`
    );

    const scrollSliderContent = document.createElement('div');
    scrollSliderContent.classList.add(
      styles.scrollsliderContent,
      `${bottomBarPrefix}-scrollslider-content`
    );

    const leftScrollSliderButton = document.createElement('button');
    leftScrollSliderButton.classList.add(
      styles.leftScrollslider,
      `${bottomBarPrefix}-left-scrollslider`
    );

    const rightScrollSliderButton = document.createElement('button');
    rightScrollSliderButton.classList.add(
      styles.rightScrollslider,
      `${bottomBarPrefix}-right-scrollslider`
    );

    const leftScrollImage = document.createElement('img');

    leftScrollImage.src = leftIcon;
    leftScrollImage.alt = 'left';
    leftScrollImage.classList.add(
      styles.scrollIcon,
      `${bottomBarPrefix}-scroll-icon`
    );
    leftScrollSliderButton.appendChild(leftScrollImage);

    const rightScrollImage = document.createElement('img');

    rightScrollImage.src = rightIcon;
    rightScrollImage.alt = 'right';
    rightScrollImage.classList.add(
      styles.scrollIcon,
      `${bottomBarPrefix}-scroll-icon`
    );
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
    sheetTab.classList.add(styles.sheetTab, `${bottomBarPrefix}-sheet-tab`);

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

  createContextSheetTabMenu() {
    const contextSheetTabMenu = document.createElement('div');
    contextSheetTabMenu.classList.add(
      styles.contextSheetMenu,
      `${bottomBarPrefix}-context-sheet-menu`
    );

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

  createAddSheetTab() {
    const buttonPlus = document.createElement('button');
    buttonPlus.classList.add(
      styles.buttonIcon,
      `${bottomBarPrefix}-plus-button-icon`
    );

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
    plusImage.classList.add(
      styles.plusImgIcon,
      `${bottomBarPrefix}-plus-img-icon`
    );
    buttonPlus.appendChild(plusImage);

    return buttonPlus;
  }

  createMenuSheetHeader() {
    const menuSheetHeader = document.createElement('button');
    menuSheetHeader.classList.add(
      styles.buttonIcon,
      `${bottomBarPrefix}-menu-button-icon`
    );

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
    menuSheetImage.classList.add(
      styles.sheetImgIcon,
      `${bottomBarPrefix}-sheet-img-icon`
    );

    menuSheetHeader.appendChild(menuSheetImage);

    return menuSheetHeader;
  }

  createMenuSheetDropdownContent() {
    const menuSheetDropdownContent = document.createElement('div');

    menuSheetDropdownContent.classList.add(
      styles.menusheetDropdownContent,
      `${bottomBarPrefix}-menusheet-dropdown-content`
    );
    menuSheetDropdownContent.style.display = 'none';

    return menuSheetDropdownContent;
  }

  createAllSheetsMenu() {
    const allSheetsMenu = document.createElement('button');
    allSheetsMenu.classList.add(
      styles.allSheetMenu,
      `${bottomBarPrefix}-all-sheet-menu`
    );
    allSheetsMenu.dataset.globalSheetIndex = this.globalSheetIndex.toString();

    allSheetsMenu.textContent = `Sheet${this.globalSheetIndex}`;

    return allSheetsMenu;
  }
}

export default BottomBar;
