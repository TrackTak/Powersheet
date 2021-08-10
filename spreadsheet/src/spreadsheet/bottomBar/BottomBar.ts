import './bottomBar.css';
import plusIcon from '../../icons/plus-icon.svg';
import sheetIcon from '../../icons/sheet-icon.svg';

export interface IBottomBar {}

class BottomBar implements IBottomBar {
  element!: HTMLDivElement;

  constructor() {
    this.create();
  }

  private create() {
    this.element = document.createElement('div');

    this.element.className = 'navbar';

    const plusImage = document.createElement('img');
    const sheetImage = document.createElement('img');

    plusImage.src = plusIcon;
    plusImage.alt = 'plus';
    plusImage.className = 'plus-icon';

    sheetImage.src = sheetIcon;
    sheetImage.alt = 'sheet';
    sheetImage.className = 'sheet-icon';

    this.element.appendChild(plusImage);
    this.element.appendChild(sheetImage);
  }
}

export default BottomBar;
