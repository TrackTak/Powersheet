import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';

export interface IBottomBar extends IConstructorParams {}

interface IConstructorParams {
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  addItem: HTMLUListElement;
}

const addItem = (button: HTMLButtonElement) => {
  const list = document.createElement('ul');
  const listItem = document.createElement('li');

  list.appendChild(listItem);
  listItem.appendChild(button);

  return list;
};

const createAddSheetButton = () => {
  const buttonPlus = document.createElement('button');

  buttonPlus.addEventListener('click', () => {
    console.log('click1');
  });

  const plusImage = document.createElement('img');

  plusImage.src = plusIcon;
  plusImage.alt = 'plus';
  plusImage.className = 'plus-icon';
  buttonPlus.appendChild(plusImage);

  return buttonPlus;
};

const createMenuSheetButton = () => {
  const buttonMenuSheet = document.createElement('button');

  const menuSheetImage = document.createElement('img');

  menuSheetImage.src = sheetIcon;
  menuSheetImage.alt = 'sheet';
  menuSheetImage.className = 'sheet-icon';

  buttonMenuSheet.appendChild(menuSheetImage);

  return buttonMenuSheet;
};

const createTabButton = (sheetNumber: number) => {
  const buttonTab = document.createElement('button');
  buttonTab.textContent = `Sheet${sheetNumber}`;

  buttonTab.addEventListener('mouseup', (e) => {
    const buttonPressed = e.button;
    if (buttonPressed === 2) {
    }
    console.log(e.button);
  });

  buttonTab.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  return buttonTab;
};

const dropdownMenu = () => {
  const menu = document.createElement('div');
  menu.className = 'menu';

  const menuItem = document.createElement('div');
  menuItem.className = 'menuitem';
  menuItem.textContent = 'Delete';

  menu.appendChild(menuItem);

  return menu;
};

// const removeSheetTab = () => {
//   const removeSheet = document.getElementById('powersheetTab');
//   removeSheet?.remove();
// };

class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  addItem: HTMLUListElement;
  buttonTabs: HTMLButtonElement[];
  dropdownMenuItems: HTMLDivElement;

  constructor(params?: IConstructorParams) {
    this.addSheetButton = params?.addSheetButton ?? createAddSheetButton();
    this.menuSheetButton = params?.menuSheetButton ?? createMenuSheetButton();
    this.addItem = addItem(this.addSheetButton);
    this.buttonTabs = [createTabButton(1)];
    this.dropdownMenuItems = dropdownMenu();

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

    addItem(this.addSheetButton);

    buttonWrapper.appendChild(this.addSheetButton);
    buttonWrapper.appendChild(this.menuSheetButton);
    tabContainer.appendChild(this.buttonTabs[0]);
    tabContainer.appendChild(this.dropdownMenuItems);

    this.addSheetButton.addEventListener('click', () => {
      const tabSheetButton = createTabButton(this.buttonTabs.length + 1);

      this.buttonTabs.push(tabSheetButton);

      tabContainer.innerHTML = '';

      this.buttonTabs.forEach((buttonTab) => {
        tabContainer.appendChild(buttonTab);
      });
    });
  }
}

export default BottomBar;
