import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';

export interface IBottomBar extends IConstructorParams {}

interface IConstructorParams {
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
}
class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  addItemTab: HTMLUListElement;
  buttonTabs: HTMLButtonElement[];
  buttonTabs2: HTMLButtonElement[];
  dropdownMenuTab: HTMLDivElement;
  menuSheetDropdownBox: HTMLDivElement;
  globalSheetIndex: number;

  constructor(params?: IConstructorParams) {
    this.addSheetButton = params?.addSheetButton ?? this.createAddSheetButton();
    this.menuSheetButton =
      params?.menuSheetButton ?? this.createMenuSheetButton();
    this.addItemTab = this.addItem(this.addSheetButton);
    this.buttonTabs = [this.createTabButton(1)];
    this.buttonTabs2 = [this.createTabButton2(1)];
    this.dropdownMenuTab = this.dropdownMenu();
    this.globalSheetIndex = 1;
    this.menuSheetDropdownBox = this.menuSheetDropdown();

    this.create();
  }

  private create() {
    this.element = document.createElement('div');
    this.element.className = 'navbar';

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'wrapper';

    this.element.appendChild(buttonWrapper);

    const menuSheetContainer = document.createElement('div');
    menuSheetContainer.className = 'menusheet-container';

    buttonWrapper.appendChild(menuSheetContainer);

    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab';

    this.element.appendChild(tabContainer);

    this.addItem(this.addSheetButton);

    buttonWrapper.appendChild(this.addSheetButton);
    tabContainer.appendChild(this.buttonTabs[0]);
    menuSheetContainer.appendChild(this.menuSheetButton);
    menuSheetContainer.appendChild(this.menuSheetDropdownBox);
    this.menuSheetDropdownBox.appendChild(this.buttonTabs2[0]);

    this.addSheetButton.addEventListener('click', () => {
      this.globalSheetIndex += 1;
      const tabSheetButton = this.createTabButton(this.globalSheetIndex);

      this.buttonTabs.push(tabSheetButton);

      tabContainer.innerHTML = '';
      this.menuSheetDropdownBox.innerHTML = '';

      this.buttonTabs.forEach((buttonTab) => {
        tabContainer.appendChild(buttonTab);
      });

      // Create a new buttonTabs array thing and a new `createTabButton`
      // push to this new array. Loop through it and do `dropdownContentTab.appendChild` with the new element
      const menuSheetButton = this.createTabButton2(this.globalSheetIndex);

      this.buttonTabs2.push(menuSheetButton);

      this.buttonTabs2.forEach((buttonTab) => {
        this.menuSheetDropdownBox.appendChild(buttonTab);
      });
    });
  }

  createTabButton(sheetNumber: number) {
    const buttonTab = document.createElement('button');
    buttonTab.className = 'btn-tab';

    buttonTab.textContent = `Sheet${sheetNumber}`;

    const containerButtonTab = document.createElement('div');
    containerButtonTab.className = 'container-btn-tab';

    containerButtonTab.appendChild(buttonTab);

    buttonTab.addEventListener('mouseup', (e) => {
      const buttonPressed = e.button;
      if (buttonPressed === 2) {
        e.target.parentElement.appendChild(this.dropdownMenuTab);
        this.dropdownMenuTab.style.display = 'block';
      }
    });

    window.addEventListener('click', (e) => {
      const isClickInside = this.dropdownMenuTab.contains(e.target);
      if (isClickInside) {
      } else {
        this.dropdownMenuTab.style.display = 'none';
      }
    });

    buttonTab.addEventListener('contextmenu', (e) => {
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

    menu.appendChild(menuItem);
    menuItem.appendChild(deleteButton);
    menuItem.appendChild(renameButton);

    return menu;
  }

  addItem(button: HTMLButtonElement) {
    const list = document.createElement('ul');
    const listItem = document.createElement('li');

    list.appendChild(listItem);
    listItem.appendChild(button);

    return list;
  }

  createAddSheetButton() {
    const buttonPlus = document.createElement('button');
    buttonPlus.className = 'btn-img';

    buttonPlus.addEventListener('click', () => {});

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

    buttonMenuSheet.addEventListener('click', (e) => {
      const sheetPressed = e.button;

      if (sheetPressed === 0) {
        this.menuSheetDropdownBox.style.display = 'block';
      }
    });

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

  createTabButton2(sheetNumber: number) {
    const buttonTab2 = document.createElement('button');
    buttonTab2.className = 'btn-tab';

    buttonTab2.textContent = `Sheet${sheetNumber}`;

    return buttonTab2;
  }
}

export default BottomBar;
