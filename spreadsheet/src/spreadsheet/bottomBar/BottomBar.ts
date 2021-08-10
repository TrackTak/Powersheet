import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';

export interface IBottomBar {}

class BottomBar implements IBottomBar {
  element!: HTMLDivElement;
  button!: HTMLButtonElement;

  constructor() {
    this.create();
  }

  private create() {
    this.element = document.createElement('div');

    this.element.className = 'navbar';

    // const container = document.createElement('div');
    // this.element.className = 'wrapper';

    // this.element.appendChild(container);

    const buttonPlus = document.createElement('button');

    buttonPlus.addEventListener('click', () => {
      console.log('click1');
    });

    this.element.appendChild(buttonPlus);

    const buttonSheet = document.createElement('button');

    buttonSheet.addEventListener('click', () => {
      console.log('click2');
    });

    this.element.appendChild(buttonPlus);
    this.element.appendChild(buttonSheet);

    const plusImage = document.createElement('img');
    const sheetImage = document.createElement('img');

    plusImage.src = plusIcon;
    plusImage.alt = 'plus';
    plusImage.className = 'plus-icon';

    sheetImage.src = sheetIcon;
    sheetImage.alt = 'sheet';
    sheetImage.className = 'sheet-icon';

    buttonPlus.appendChild(plusImage);
    buttonSheet.appendChild(sheetImage);
  }
}

export default BottomBar;
