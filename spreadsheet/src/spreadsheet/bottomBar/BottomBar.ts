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
  dropdownMenuTab: HTMLDivElement;

  constructor(params?: IConstructorParams) {
    this.addSheetButton = params?.addSheetButton ?? this.createAddSheetButton();
    this.menuSheetButton =
      params?.menuSheetButton ?? this.createMenuSheetButton();
    this.addItemTab = this.addItem(this.addSheetButton);
    this.buttonTabs = [this.createTabButton(1)];
    this.dropdownMenuTab = this.dropdownMenu();

    this.dropdownMenuTab.style.display = 'none';

    this.create();
  }

  private create() {
    this.element = document.createElement('div');
    this.element.className = 'navbar';

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'wrapper';

    this.element.appendChild(buttonWrapper);

    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab';

    this.element.appendChild(tabContainer);

    this.addItem(this.addSheetButton);

    buttonWrapper.appendChild(this.addSheetButton);
    buttonWrapper.appendChild(this.menuSheetButton);
    tabContainer.appendChild(this.buttonTabs[0]);
    tabContainer.appendChild(this.dropdownMenuTab);

    this.addSheetButton.addEventListener('click', () => {
      const tabSheetButton = this.createTabButton(this.buttonTabs.length + 1);

      this.buttonTabs.push(tabSheetButton);

      tabContainer.innerHTML = '';

      this.buttonTabs.forEach((buttonTab) => {
        tabContainer.appendChild(buttonTab);
      });
    });
  }

  createTabButton(sheetNumber: number) {
    const buttonTab = document.createElement('button');
    buttonTab.className = 'btn-tab';
    buttonTab.textContent = `Sheet${sheetNumber}`;

    buttonTab.addEventListener('mouseup', (e) => {
      const buttonPressed = e.button;
      if (buttonPressed === 2) {
        this.dropdownMenuTab.style.display = 'block';
      }
    });

    buttonTab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    return buttonTab;
  }

  dropdownMenu() {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';

    const menuItem = document.createElement('div');
    menuItem.className = 'dropdown-menuitem';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-menuitem';
    deleteButton.textContent = 'Delete';

    const cloneButton = document.createElement('button');
    cloneButton.className = 'btn-menuitem';
    cloneButton.textContent = 'Delete';

    menu.appendChild(menuItem);
    menuItem.appendChild(deleteButton);
    menuItem.appendChild(cloneButton);

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

    buttonPlus.addEventListener('click', () => {
      console.log('click1');
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

    const menuSheetImage = document.createElement('img');

    menuSheetImage.src = sheetIcon;
    menuSheetImage.alt = 'sheet';
    menuSheetImage.className = 'sheet-icon';

    buttonMenuSheet.appendChild(menuSheetImage);

    return buttonMenuSheet;
  }
}

export default BottomBar;
