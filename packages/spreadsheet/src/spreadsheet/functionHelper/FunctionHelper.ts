import { Spreadsheet } from '../..';
import styles from './FunctionHelper.module.scss';
import { MDCDrawer } from '@material/drawer';
import closeIcon from './close-icon.svg';
import {
  createCodeText,
  createHeader,
  createParagraph,
  functionHelperPrefix,
} from './functionHelperHtmlElementHelpers';
class FunctionHelper {
  functionHelperEl!: HTMLDivElement;
  drawerEl!: HTMLDivElement;
  drawerContentEl!: HTMLDivElement;
  topAppBarEl!: HTMLDivElement;
  drawer!: MDCDrawer;
  closeIcon!: HTMLImageElement;
  closeButton!: HTMLButtonElement;
  headerEl!: HTMLHeadElement;
  textWrapper!: HTMLDivElement;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.functionHelperEl = document.createElement('div');
    this.functionHelperEl.classList.add(
      styles.functionHelper,
      `${functionHelperPrefix}`
    );

    this.drawerEl = document.createElement('div');
    this.drawerEl.classList.add(
      styles.drawerEl,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    );

    this.functionHelperEl.appendChild(this.drawerEl);

    this.drawerContentEl = document.createElement('div');
    this.drawerContentEl.classList.add(
      styles.drawerContent,
      `${functionHelperPrefix}`,
      'mdc-drawer__content'
    );

    this.drawerContentEl.dir = 'ltr';

    this.drawerEl.appendChild(this.drawerContentEl);

    this.functionHelperEl.dir = 'rtl';

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

    this.textWrapper = document.createElement('div');
    this.textWrapper.classList.add(
      styles.textWrapper,
      `${functionHelperPrefix}`
    );

    this.headerEl = document.createElement('h1');
    this.headerEl.classList.add(styles.headerEl, `${functionHelperPrefix}`);
    this.headerEl.innerHTML = 'FINANCIAL - FIN';

    const { paragraphEl } = createParagraph(
      'Fetches current or historical securities information from Tracktak Finance.'
    );

    const { header: headerUsage } = createHeader('Sample Usage');
    const { header: headerSyntax } = createHeader('Syntax');
    const { codeEl, code } = createCodeText('=FIN([attribute])');

    this.drawerContentEl.appendChild(this.textWrapper);
    this.textWrapper.appendChild(this.headerEl);
    this.textWrapper.appendChild(paragraphEl);
    this.textWrapper.appendChild(headerUsage);
    this.textWrapper.appendChild(codeEl);
    codeEl.appendChild(code);
    this.textWrapper.appendChild(headerSyntax);

    this.topAppBarEl = document.createElement('div');
    this.drawer = MDCDrawer.attachTo(this.drawerEl);
  }
}

export default FunctionHelper;
