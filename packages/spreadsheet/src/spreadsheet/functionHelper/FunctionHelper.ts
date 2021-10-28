import { prefix } from '../utils';
import { Spreadsheet } from '../..';
import styles from './FunctionHelper.module.scss';
import { MDCDrawer } from '@material/drawer';
import closeIcon from './close-icon.svg';

const functionHelperPrefix = `${prefix}-function-helper`;

class FunctionHelper {
  functionHelperEl!: HTMLDivElement;
  drawerEl!: HTMLDivElement;
  drawerContentEl!: HTMLDivElement;
  topAppBarEl!: HTMLDivElement;
  mainContentEl!: HTMLDivElement;
  drawer!: MDCDrawer;
  topAppBar!: HTMLDivElement;
  closeIcon!: HTMLImageElement;
  closeButton!: HTMLButtonElement;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.functionHelperEl = document.createElement('div');
    this.functionHelperEl.classList.add(
      styles.functionHelper,
      `${functionHelperPrefix}`
    );

    this.drawerEl = document.createElement('div');
    this.drawerEl.classList.add('mdc-drawer', 'mdc-drawer--dismissible');

    this.functionHelperEl.appendChild(this.drawerEl);

    this.drawerContentEl = document.createElement('div');
    this.drawerContentEl.classList.add(
      styles.drawerContent,
      `${functionHelperPrefix}`,
      'mdc-drawer__content'
    );

    this.drawerContentEl.dir = 'ltr';
    this.drawerContentEl.textContent = 'test';

    this.drawerEl.appendChild(this.drawerContentEl);

    this.functionHelperEl.dir = 'rtl';

    this.topAppBarEl = document.createElement('div');
    this.drawer = MDCDrawer.attachTo(this.drawerEl);

    this.closeIcon = document.createElement('img');
    this.closeIcon.classList.add(styles.closeIcon, `${functionHelperPrefix}`);
    this.closeIcon.src = closeIcon;

    this.closeButton = document.createElement('button');
    this.closeButton.classList.add(
      styles.closeButton,
      `${functionHelperPrefix}`
    );

    this.closeButton.addEventListener('click', () => {
      this.drawer.open = !this.drawer.open;
    });

    this.drawerContentEl.appendChild(this.closeButton);
    this.closeButton.append(this.closeIcon);
  }
}

export default FunctionHelper;
