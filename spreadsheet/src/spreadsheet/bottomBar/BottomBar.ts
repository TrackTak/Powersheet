import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';
import leftIcon from '../../icons/left-icon.svg';
import rightIcon from '../../icons/right-icon.svg';

export interface IBottomBar extends IConstructorParams {}

interface IConstructorParams {
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
}
class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  buttonTabs: HTMLButtonElement[];
  buttonTabs2: HTMLButtonElement[];
  dropdownMenuTab: HTMLDivElement;
  menuSheetDropdownBox: HTMLDivElement;
  scrollSlider: HTMLDivElement;
  globalSheetIndex: number;
  tabContainerMaxWidth: number;
  tabContainer: HTMLDivElement;
  scrollsliderContainerTab: HTMLDivElement;
  currentDropdownTab?: HTMLDivElement;

  constructor(params?: IConstructorParams) {
    this.globalSheetIndex = 1;
    this.addSheetButton = params?.addSheetButton ?? this.createAddSheetButton();
    this.menuSheetButton =
      params?.menuSheetButton ?? this.createMenuSheetButton();
    this.buttonTabs = [this.createTabButton()];
    this.buttonTabs2 = [this.createTabButton2()];
    this.dropdownMenuTab = this.dropdownMenu();
    this.menuSheetDropdownBox = this.menuSheetDropdown();
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
    this.element.className = 'navbar';

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'wrapper';

    this.element.appendChild(buttonWrapper);

    buttonWrapper.appendChild(this.addSheetButton);

    const menuSheetContainer = document.createElement('div');
    menuSheetContainer.className = 'menusheet-container';

    buttonWrapper.appendChild(menuSheetContainer);
    this.tabContainer.appendChild(this.scrollsliderContainerTab);

    this.tabContainer.className = 'tab';
    this.scrollsliderContainerTab.className = 'scrollslider-container-tab';

    this.element.appendChild(this.tabContainer);
    this.element.appendChild(this.scrollSlider);

    this.scrollsliderContainerTab.appendChild(this.buttonTabs[0]);
    menuSheetContainer.appendChild(this.menuSheetButton);
    menuSheetContainer.appendChild(this.menuSheetDropdownBox);
    this.menuSheetDropdownBox.appendChild(this.buttonTabs2[0]);

    this.addSheetButton.addEventListener('click', () => {
      this.globalSheetIndex += 1;
      const tabSheetButton = this.createTabButton();

      this.buttonTabs.push(tabSheetButton);

      this.scrollsliderContainerTab.innerHTML = '';
      this.menuSheetDropdownBox.innerHTML = '';

      this.buttonTabs.forEach((buttonTab) => {
        this.scrollsliderContainerTab.appendChild(buttonTab);
      });

      const menuSheetButton = this.createTabButton2();

      this.buttonTabs2.push(menuSheetButton);

      this.buttonTabs2.forEach((buttonTab) => {
        this.menuSheetDropdownBox.appendChild(buttonTab);
      });
    });
  }

  //TO DO
  createScrollSlider() {
    const scrollSlider = document.createElement('div');
    scrollSlider.className = 'scrollslider-arrow';

    const scrollSliderContent = document.createElement('div');
    scrollSliderContent.className = 'scrollslider-content';

    const leftScrollSliderButton = document.createElement('button');
    leftScrollSliderButton.className = 'left-scrollslider-btn';

    const rightScrollSliderButton = document.createElement('button');
    rightScrollSliderButton.className = 'right-scrollslider-btn';

    const leftScrollImage = document.createElement('img');

    leftScrollImage.src = leftIcon;
    leftScrollImage.alt = 'left';
    leftScrollImage.className = 'scroll-icon';
    leftScrollSliderButton.appendChild(leftScrollImage);

    const rightScrollImage = document.createElement('img');

    rightScrollImage.src = rightIcon;
    rightScrollImage.alt = 'right';
    rightScrollImage.className = 'scroll-icon';
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
      const f = this.buttonTabs[this.buttonTabs.length - 1];

      const totalScrollWidth = this.buttonTabs.reduce((prev, curr) => {
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

  createTabButton() {
    const buttonTab = document.createElement('div');
    buttonTab.className = 'btn-tab';

    const spanElement = document.createElement('span');
    spanElement.className = 'btn-tab-span';

    spanElement.textContent = `Sheet${this.globalSheetIndex}`;
    buttonTab.appendChild(spanElement);

    const containerButtonTab = document.createElement('div');
    containerButtonTab.className = 'container-btn-tab';
    containerButtonTab.dataset.globalSheetIndex =
      this.globalSheetIndex.toString();

    containerButtonTab.appendChild(buttonTab);

    buttonTab.addEventListener('mouseup', (e) => {
      const buttonPressed = e.button;
      if (buttonPressed === 2) {
        this.currentDropdownTab = e.target.parentElement;

        e.target.parentElement.appendChild(this.dropdownMenuTab);
        this.dropdownMenuTab.style.display = 'block';
      }
    });

    buttonTab.addEventListener('dblclick', () => {
      spanElement.contentEditable = 'true';
      spanElement.focus();
    });

    spanElement.addEventListener('blur', () => {
      const buttonTab2 = this.buttonTabs2.find(
        (x) =>
          x.dataset.globalSheetIndex ===
          containerButtonTab.dataset.globalSheetIndex
      )!;

      buttonTab2.textContent = spanElement.textContent;
    });

    window.addEventListener('click', (e) => {
      const isClickInside = this.dropdownMenuTab.contains(e.target);
      if (isClickInside) {
      } else {
        this.dropdownMenuTab.style.display = 'none';
      }
    });

    buttonTab.addEventListener('contextmenu', (e) => {
      this.menuSheetDropdownBox.style.display = 'none';
      e.preventDefault();
    });

    return containerButtonTab;
  }

  dropdownMenu() {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';

    const menuItem = document.createElement('div');
    menuItem.className = 'dropdown-menuitem';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-menuitem';
    deleteButton.textContent = 'Delete';

    deleteButton.addEventListener('click', (e) => {
      let element = e.target;

      while (!element.classList.contains('container-btn-tab')) {
        element = element.parentElement;
      }

      const elementIndex = [...element.parentElement.children].indexOf(element);
      const menuSheetDropdown = document.querySelector('.menusheet-dropdown')!;

      this.buttonTabs.splice(elementIndex, 1);
      this.buttonTabs2.splice(elementIndex, 1);

      menuSheetDropdown.children[elementIndex].remove();
      element.remove();
    });

    const renameButton = document.createElement('button');
    renameButton.className = 'btn-menuitem';
    renameButton.textContent = 'Rename';

    renameButton.addEventListener('click', () => {
      const contentEditable =
        this.currentDropdownTab!.querySelector('.btn-tab-span');

      contentEditable.contentEditable = 'true';
      contentEditable.focus();
    });

    menu.appendChild(menuItem);
    menuItem.appendChild(deleteButton);
    menuItem.appendChild(renameButton);

    return menu;
  }

  createAddSheetButton() {
    const buttonPlus = document.createElement('button');
    buttonPlus.className = 'btn-img';

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
    plusImage.className = 'plus-icon';
    buttonPlus.appendChild(plusImage);

    return buttonPlus;
  }

  createMenuSheetButton() {
    const buttonMenuSheet = document.createElement('button');
    buttonMenuSheet.className = 'btn-img';

    buttonMenuSheet.addEventListener('click', (e) => {
      const sheetPressed = e.button;
      if (sheetPressed === 0) {
        this.menuSheetDropdownBox.style.display = 'flex';
      }
    });

    window.addEventListener(
      'click',
      (e) => {
        const isClickInside = this.menuSheetDropdownBox.contains(e.target);
        if (isClickInside) {
        } else {
          this.menuSheetDropdownBox.style.display = 'none';
        }
      },
      { capture: true }
    );

    buttonMenuSheet.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const menuSheetImage = document.createElement('img');

    menuSheetImage.src = sheetIcon;
    menuSheetImage.alt = 'sheet';
    menuSheetImage.className = 'sheet-icon';

    buttonMenuSheet.appendChild(menuSheetImage);

    return buttonMenuSheet;
  }

  menuSheetDropdown() {
    const menuSheetDropdown = document.createElement('div');

    menuSheetDropdown.className = 'menusheet-dropdown';
    menuSheetDropdown.style.display = 'none';

    return menuSheetDropdown;
  }

  createTabButton2() {
    const buttonTab2 = document.createElement('button');
    buttonTab2.className = 'btn-tab-2';
    buttonTab2.dataset.globalSheetIndex = this.globalSheetIndex.toString();

    buttonTab2.textContent = `Sheet${this.globalSheetIndex}`;

    return buttonTab2;
  }
}

export default BottomBar;
