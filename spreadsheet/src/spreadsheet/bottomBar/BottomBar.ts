import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';

export interface IBottomBar extends IConstructorParams {}

interface IConstructorParams {
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  tabSheetButton: HTMLButtonElement;
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

  buttonTab.addEventListener('click', () => {
    console.log('sheet1');
  });

  return buttonTab;
};

class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  addSheetButton: HTMLButtonElement;
  menuSheetButton: HTMLButtonElement;
  tabSheetButton: HTMLButtonElement;
  addItem: HTMLUListElement;
  buttonTabs: HTMLButtonElement[];

  constructor(params?: IConstructorParams) {
    this.addSheetButton = params?.addSheetButton ?? createAddSheetButton();
    this.menuSheetButton = params?.menuSheetButton ?? createMenuSheetButton();
    this.tabSheetButton = createTabButton();
    this.addItem = addItem(this.addSheetButton);

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
    tabContainer.appendChild(this.tabSheetButton);

    this.addSheetButton.addEventListener('click', () => {
      const tabSheetButton = createTabButton(this.buttonTabs.length);

      this.buttonTabs.push(tabSheetButton);

      //Empty tab container children
      tabContainer.innerHTML = '';

      this.buttonTabs.forEach((buttonTab) => {
        tabContainer.appendChild(buttonTab);
      });
    });
  }
}

export default BottomBar;
